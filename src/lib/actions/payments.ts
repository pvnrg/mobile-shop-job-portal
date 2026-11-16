"use server";

import { db } from "@/db";
import { payments } from "@/db/schema";
import { findJobInvoice, syncInvoicePaid } from "@/lib/balances";
import { paymentSchema } from "@/lib/validation/payment";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createPaymentAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = paymentSchema.safeParse({
    customerId: formData.get("customerId"),
    invoiceId: formData.get("invoiceId") ?? "",
    jobId: formData.get("jobId") ?? "",
    amount: formData.get("amount"),
    method: formData.get("method"),
    reference: formData.get("reference"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  const jobId =
    parsed.data.jobId === "" || parsed.data.jobId === undefined ? null : Number(parsed.data.jobId);
  let invoiceId =
    parsed.data.invoiceId === "" || parsed.data.invoiceId === undefined
      ? null
      : Number(parsed.data.invoiceId);

  await db.transaction(async (tx) => {
    // A payment for a job that already has an invoice belongs to that invoice.
    if (!invoiceId && jobId) invoiceId = (await findJobInvoice(tx, jobId))?.id ?? null;

    await tx.insert(payments).values({
      customerId: parsed.data.customerId,
      invoiceId,
      jobId,
      amount: String(parsed.data.amount),
      method: parsed.data.method,
      reference: parsed.data.reference || null,
      notes: parsed.data.notes || null,
      recordedBy: userId,
    });

    if (invoiceId) await syncInvoicePaid(tx, invoiceId);
  });

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/customers");
  if (invoiceId) revalidatePath(`/dashboard/invoices/${invoiceId}`);
  redirect("/dashboard/payments");
}
