"use server";

import { db } from "@/db";
import { jobs, jobDevices, jobStatusHistory, invoices, payments } from "@/db/schema";
import { jobSchema, jobDeviceStatusUpdateSchema } from "@/lib/validation/job";
import { generateJobNumber } from "@/lib/numbering";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and, ne, inArray } from "drizzle-orm";
import { notifyJobReceived, notifyJobStatusChange } from "@/lib/whatsapp/triggers";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parseDevicesFromFormData(formData: FormData) {
  const pattern = /^devices\[(\d+)\]\.(\w+)$/;
  const byIndex = new Map<number, Record<string, string>>();
  for (const [key, value] of formData.entries()) {
    const match = key.match(pattern);
    if (!match) continue;
    const index = Number(match[1]);
    const field = match[2];
    if (!byIndex.has(index)) byIndex.set(index, {});
    byIndex.get(index)![field] = typeof value === "string" ? value : "";
  }
  return Array.from(byIndex.keys())
    .sort((a, b) => a - b)
    .map((i) => byIndex.get(i)!);
}

function parseForm(formData: FormData) {
  return jobSchema.safeParse({
    customerId: formData.get("customerId"),
    devices: parseDevicesFromFormData(formData),
    priority: formData.get("priority") || "normal",
    estimatedCost: formData.get("estimatedCost") ?? "",
    assignedTo: formData.get("assignedTo") ?? "",
    promisedAt: formData.get("promisedAt") ?? "",
    notes: formData.get("notes"),
  });
}

export async function createJobAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  let jobId: number | null = null;
  for (let attempt = 0; attempt < 3 && !jobId; attempt++) {
    const jobNumber = await generateJobNumber();
    try {
      const [job] = await db
        .insert(jobs)
        .values({
          jobNumber,
          customerId: parsed.data.customerId,
          priority: parsed.data.priority,
          estimatedCost:
            parsed.data.estimatedCost === "" || parsed.data.estimatedCost === undefined
              ? null
              : String(parsed.data.estimatedCost),
          assignedTo:
            parsed.data.assignedTo === "" || parsed.data.assignedTo === undefined
              ? null
              : Number(parsed.data.assignedTo),
          createdBy: userId,
          promisedAt: parsed.data.promisedAt ? new Date(parsed.data.promisedAt) : null,
          notes: parsed.data.notes || null,
        })
        .returning({ id: jobs.id });
      jobId = job.id;
    } catch (err: unknown) {
      const isDuplicate =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: string }).code === "23505";
      if (!isDuplicate) throw err;
    }
  }

  if (!jobId) {
    return { error: "Could not generate a unique job number. Please try again." };
  }

  await db.transaction(async (tx) => {
    for (const device of parsed.data.devices) {
      const [inserted] = await tx
        .insert(jobDevices)
        .values({
          jobId: jobId!,
          deviceType: device.deviceType,
          brand: device.brand || null,
          model: device.model || null,
          serialNumber: device.serialNumber || null,
          issueDescription: device.issueDescription,
          accessories: device.accessories || null,
          passcode: device.passcode || null,
        })
        .returning({ id: jobDevices.id });

      await tx.insert(jobStatusHistory).values({
        jobId: jobId!,
        jobDeviceId: inserted.id,
        status: "received",
        note: "Job created",
        changedBy: userId,
      });
    }
  });

  await notifyJobReceived(jobId);

  revalidatePath("/dashboard/jobs");
  redirect(`/dashboard/jobs/${jobId}`);
}

export async function updateJobDeviceStatusAction(
  jobDeviceId: number,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = jobDeviceStatusUpdateSchema.safeParse({
    status: formData.get("status"),
    note: formData.get("note"),
    amountPaid: formData.get("amountPaid") ?? "",
    paymentMethod: formData.get("paymentMethod") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const amountPaidNow =
    parsed.data.amountPaid === "" || parsed.data.amountPaid === undefined
      ? 0
      : Number(parsed.data.amountPaid);

  if (amountPaidNow > 0 && !parsed.data.paymentMethod) {
    return { fieldErrors: { paymentMethod: ["Select a payment method."] } };
  }

  const device = await db.query.jobDevices.findFirst({
    where: eq(jobDevices.id, jobDeviceId),
    with: { job: true },
  });
  if (!device) {
    return { error: "Device not found." };
  }
  const jobId = device.jobId;

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  await db.transaction(async (tx) => {
    await tx
      .update(jobDevices)
      .set({
        status: parsed.data.status,
        updatedAt: new Date(),
        deliveredAt: parsed.data.status === "delivered" ? new Date() : undefined,
      })
      .where(eq(jobDevices.id, jobDeviceId));

    await tx.insert(jobStatusHistory).values({
      jobId,
      jobDeviceId,
      status: parsed.data.status,
      note: parsed.data.note || null,
      changedBy: userId,
    });

    if (amountPaidNow > 0) {
      const invoice = await tx.query.invoices.findFirst({
        where: and(eq(invoices.jobId, jobId), ne(invoices.status, "cancelled")),
      });

      await tx.insert(payments).values({
        invoiceId: invoice?.id ?? null,
        jobId,
        customerId: device.job.customerId,
        amount: String(amountPaidNow),
        method: parsed.data.paymentMethod!,
        notes: `Recorded on marking device as ${parsed.data.status}`,
        recordedBy: userId,
      });

      if (invoice) {
        const newPaid = Number(invoice.amountPaid) + amountPaidNow;
        const newStatus = newPaid >= Number(invoice.total) ? "paid" : "partially_paid";
        await tx
          .update(invoices)
          .set({ amountPaid: String(newPaid), status: newStatus, updatedAt: new Date() })
          .where(eq(invoices.id, invoice.id));
      }
    }
  });

  await notifyJobStatusChange(jobDeviceId, parsed.data.status);

  revalidatePath(`/dashboard/jobs/${jobId}`);
  revalidatePath("/dashboard/jobs");
  if (amountPaidNow > 0) {
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard/invoices");
  }
  return {};
}

export async function updateJobDetailsAction(
  jobId: number,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  const existingDevices = await db
    .select({ id: jobDevices.id })
    .from(jobDevices)
    .where(eq(jobDevices.jobId, jobId));
  const existingIds = new Set(existingDevices.map((d) => d.id));
  const submittedIds = new Set(
    parsed.data.devices.filter((d) => d.id !== undefined).map((d) => d.id!)
  );
  const idsToDelete = [...existingIds].filter((id) => !submittedIds.has(id));
  const newlyInsertedIds: number[] = [];

  await db.transaction(async (tx) => {
    await tx
      .update(jobs)
      .set({
        customerId: parsed.data.customerId,
        priority: parsed.data.priority,
        estimatedCost:
          parsed.data.estimatedCost === "" || parsed.data.estimatedCost === undefined
            ? null
            : String(parsed.data.estimatedCost),
        assignedTo:
          parsed.data.assignedTo === "" || parsed.data.assignedTo === undefined
            ? null
            : Number(parsed.data.assignedTo),
        promisedAt: parsed.data.promisedAt ? new Date(parsed.data.promisedAt) : null,
        notes: parsed.data.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId));

    if (idsToDelete.length > 0) {
      await tx.delete(jobDevices).where(inArray(jobDevices.id, idsToDelete));
    }

    for (const device of parsed.data.devices) {
      if (device.id !== undefined && existingIds.has(device.id)) {
        await tx
          .update(jobDevices)
          .set({
            deviceType: device.deviceType,
            brand: device.brand || null,
            model: device.model || null,
            serialNumber: device.serialNumber || null,
            issueDescription: device.issueDescription,
            accessories: device.accessories || null,
            passcode: device.passcode || null,
            updatedAt: new Date(),
          })
          .where(eq(jobDevices.id, device.id));
      } else {
        const [inserted] = await tx
          .insert(jobDevices)
          .values({
            jobId,
            deviceType: device.deviceType,
            brand: device.brand || null,
            model: device.model || null,
            serialNumber: device.serialNumber || null,
            issueDescription: device.issueDescription,
            accessories: device.accessories || null,
            passcode: device.passcode || null,
          })
          .returning({ id: jobDevices.id });

        await tx.insert(jobStatusHistory).values({
          jobId,
          jobDeviceId: inserted.id,
          status: "received",
          note: "Device added to job",
          changedBy: userId,
        });
        newlyInsertedIds.push(inserted.id);
      }
    }
  });

  await Promise.all(newlyInsertedIds.map((id) => notifyJobStatusChange(id, "received")));

  revalidatePath(`/dashboard/jobs/${jobId}`);
  redirect(`/dashboard/jobs/${jobId}`);
}
