"use server";

import { db } from "@/db";
import { invoices, invoiceItems, payments } from "@/db/schema";
import { invoiceSchema } from "@/lib/validation/invoice";
import { computeInvoiceTotals } from "@/lib/gst";
import { generateInvoiceNumber } from "@/lib/numbering";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { notifyInvoiceCreated } from "@/lib/whatsapp/triggers";
import { linkJobPayments, syncInvoicePaid, unbilledJobPayments } from "@/lib/balances";
import { formatCurrency } from "@/lib/format";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createInvoiceAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") || "[]"));
  } catch {
    return { error: "Invalid line items." };
  }

  const parsed = invoiceSchema.safeParse({
    customerId: formData.get("customerId"),
    jobId: formData.get("jobId") ?? "",
    gstType: formData.get("gstType"),
    placeOfSupply: formData.get("placeOfSupply"),
    discount: formData.get("discount") ?? "",
    notes: formData.get("notes"),
    dueAt: formData.get("dueAt") ?? "",
    items,
    amountPaid: formData.get("amountPaid") ?? "",
    paymentMethod: formData.get("paymentMethod") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  const discount =
    parsed.data.discount === "" || parsed.data.discount === undefined
      ? 0
      : Number(parsed.data.discount);

  const totals = computeInvoiceTotals(parsed.data.items, discount, parsed.data.gstType);

  const amountPaidNow =
    parsed.data.amountPaid === "" || parsed.data.amountPaid === undefined
      ? 0
      : Number(parsed.data.amountPaid);

  const jobId =
    parsed.data.jobId === "" || parsed.data.jobId === undefined ? null : Number(parsed.data.jobId);
  // Money already taken on this job (e.g. when the device was delivered) gets
  // linked to this invoice, so it counts towards what's been paid.
  const alreadyPaid = jobId ? await unbilledJobPayments(db, jobId) : 0;

  if (amountPaidNow + alreadyPaid > totals.total + 0.001) {
    return {
      fieldErrors: {
        amountPaid: [
          alreadyPaid > 0
            ? `${formatCurrency(alreadyPaid)} was already paid on this job, so at most ${formatCurrency(Math.max(0, totals.total - alreadyPaid))} more can be paid now.`
            : "Amount paid can't exceed the invoice total.",
        ],
      },
    };
  }
  if (amountPaidNow > 0 && !parsed.data.paymentMethod) {
    return { fieldErrors: { paymentMethod: ["Select a payment method."] } };
  }


  // The bill and any payment taken with it share one timestamp, so the
  // statement lists them in the right order.
  const issuedAt = new Date();
  let invoiceId: number | null = null;
  for (let attempt = 0; attempt < 3 && !invoiceId; attempt++) {
    const invoiceNumber = await generateInvoiceNumber();
    try {
      invoiceId = await db.transaction(async (tx) => {
        const [invoice] = await tx
          .insert(invoices)
          .values({
            invoiceNumber,
            jobId:
              parsed.data.jobId === "" || parsed.data.jobId === undefined
                ? null
                : Number(parsed.data.jobId),
            customerId: parsed.data.customerId,
            subtotal: String(totals.subtotal),
            discount: String(discount),
            cgstAmount: String(totals.cgst),
            sgstAmount: String(totals.sgst),
            igstAmount: String(totals.igst),
            total: String(totals.total),
            // Both are recomputed from the linked payments below.
            amountPaid: "0",
            status: "issued",
            placeOfSupply: parsed.data.placeOfSupply || null,
            notes: parsed.data.notes || null,
            issuedAt,
            dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
            createdBy: userId,
          })
          .returning({ id: invoices.id });

        await tx.insert(invoiceItems).values(
          parsed.data.items.map((item) => ({
            invoiceId: invoice.id,
            description: item.description,
            hsnSac: item.hsnSac || null,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
            taxRatePercent: String(item.taxRatePercent),
            amount: String(item.quantity * item.unitPrice),
          }))
        );

        if (amountPaidNow > 0) {
          await tx.insert(payments).values({
            invoiceId: invoice.id,
            jobId:
              parsed.data.jobId === "" || parsed.data.jobId === undefined
                ? null
                : Number(parsed.data.jobId),
            customerId: parsed.data.customerId,
            amount: String(amountPaidNow),
            method: parsed.data.paymentMethod!,
            notes: "Paid at invoice creation",
            paidAt: issuedAt,
            recordedBy: userId,
          });
        }

        if (jobId) await linkJobPayments(tx, jobId, invoice.id);
        await syncInvoicePaid(tx, invoice.id);

        return invoice.id;
      });
    } catch (err: unknown) {
      const isDuplicate =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: string }).code === "23505";
      if (!isDuplicate) throw err;
    }
  }

  if (!invoiceId) {
    return { error: "Could not generate a unique invoice number. Please try again." };
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/customers");
  if (amountPaidNow > 0) {
    revalidatePath("/dashboard/payments");
  }
  if (parsed.data.jobId) {
    revalidatePath(`/dashboard/jobs/${parsed.data.jobId}`);
  }
  redirect(`/dashboard/invoices/${invoiceId}`);
}

export async function cancelInvoiceAction(invoiceId: number) {
  await db.transaction(async (tx) => {
    const invoice = await tx.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
    if (!invoice) return;
    await tx
      .update(invoices)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));
    // Money already paid stays with the customer: for a job bill it moves to
    // the job's next invoice; otherwise it's an advance on their account.
    await tx.update(payments).set({ invoiceId: null }).where(eq(payments.invoiceId, invoiceId));
    await syncInvoicePaid(tx, invoiceId);
  });
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  revalidatePath("/dashboard/invoices");
}

export async function sendInvoiceWhatsappAction(invoiceId: number) {
  await notifyInvoiceCreated(invoiceId);
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
}
