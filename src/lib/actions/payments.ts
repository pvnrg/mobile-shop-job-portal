"use server";

import { db } from "@/db";
import { payments, invoices } from "@/db/schema";
import { paymentSchema } from "@/lib/validation/payment";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

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

  const invoiceId =
    parsed.data.invoiceId === "" || parsed.data.invoiceId === undefined
      ? null
      : Number(parsed.data.invoiceId);

  await db.transaction(async (tx) => {
    await tx.insert(payments).values({
      customerId: parsed.data.customerId,
      invoiceId,
      jobId:
        parsed.data.jobId === "" || parsed.data.jobId === undefined
          ? null
          : Number(parsed.data.jobId),
      amount: String(parsed.data.amount),
      method: parsed.data.method,
      reference: parsed.data.reference || null,
      notes: parsed.data.notes || null,
      recordedBy: userId,
    });

    if (invoiceId) {
      const invoice = await tx.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId),
      });
      if (invoice) {
        const newPaid = Number(invoice.amountPaid) + parsed.data.amount;
        const status =
          newPaid >= Number(invoice.total)
            ? "paid"
            : newPaid > 0
              ? "partially_paid"
              : invoice.status;

        await tx
          .update(invoices)
          .set({
            amountPaid: String(newPaid),
            status,
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, invoiceId));
      }
    }
  });

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/customers");
  if (invoiceId) revalidatePath(`/dashboard/invoices/${invoiceId}`);
  redirect("/dashboard/payments");
}
