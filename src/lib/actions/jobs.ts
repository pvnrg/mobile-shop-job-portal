"use server";

import { db } from "@/db";
import { jobs, jobStatusHistory, invoices, payments } from "@/db/schema";
import { jobSchema, jobStatusUpdateSchema } from "@/lib/validation/job";
import { generateJobNumber } from "@/lib/numbering";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and, ne } from "drizzle-orm";
import { notifyJobStatusChange } from "@/lib/whatsapp/triggers";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parseForm(formData: FormData) {
  return jobSchema.safeParse({
    customerId: formData.get("customerId"),
    deviceType: formData.get("deviceType"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    serialNumber: formData.get("serialNumber"),
    issueDescription: formData.get("issueDescription"),
    accessories: formData.get("accessories"),
    passcode: formData.get("passcode"),
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
          deviceType: parsed.data.deviceType,
          brand: parsed.data.brand || null,
          model: parsed.data.model || null,
          serialNumber: parsed.data.serialNumber || null,
          issueDescription: parsed.data.issueDescription,
          accessories: parsed.data.accessories || null,
          passcode: parsed.data.passcode || null,
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

  await db.insert(jobStatusHistory).values({
    jobId,
    status: "received",
    note: "Job created",
    changedBy: userId,
  });

  await notifyJobStatusChange(jobId, "received");

  revalidatePath("/dashboard/jobs");
  redirect(`/dashboard/jobs/${jobId}`);
}

export async function updateJobStatusAction(
  jobId: number,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = jobStatusUpdateSchema.safeParse({
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

  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
  if (!job) {
    return { error: "Job not found." };
  }

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  await db.transaction(async (tx) => {
    await tx
      .update(jobs)
      .set({
        status: parsed.data.status,
        updatedAt: new Date(),
        deliveredAt: parsed.data.status === "delivered" ? new Date() : undefined,
      })
      .where(eq(jobs.id, jobId));

    await tx.insert(jobStatusHistory).values({
      jobId,
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
        customerId: job.customerId,
        amount: String(amountPaidNow),
        method: parsed.data.paymentMethod!,
        notes: `Recorded on marking job as ${parsed.data.status}`,
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

  await notifyJobStatusChange(jobId, parsed.data.status);

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

  await db
    .update(jobs)
    .set({
      deviceType: parsed.data.deviceType,
      brand: parsed.data.brand || null,
      model: parsed.data.model || null,
      serialNumber: parsed.data.serialNumber || null,
      issueDescription: parsed.data.issueDescription,
      accessories: parsed.data.accessories || null,
      passcode: parsed.data.passcode || null,
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

  revalidatePath(`/dashboard/jobs/${jobId}`);
  redirect(`/dashboard/jobs/${jobId}`);
}
