"use server";

import { db } from "@/db";
import { invoices, payments } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { eq, and, inArray } from "drizzle-orm";
import type { PaymentMethod } from "@/lib/status";
import { notifyOutstandingReminder } from "@/lib/whatsapp/triggers";

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function settleInvoice(
  tx: DbTx,
  invoiceId: number,
  method: PaymentMethod,
  userId: number | null
) {
  const invoice = await tx.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
  if (!invoice) return;

  const due = Number(invoice.total) - Number(invoice.amountPaid);
  if (due <= 0) return;

  await tx.insert(payments).values({
    invoiceId: invoice.id,
    jobId: invoice.jobId,
    customerId: invoice.customerId,
    amount: String(due),
    method,
    notes: "Udhar account cleared",
    recordedBy: userId,
  });

  await tx
    .update(invoices)
    .set({
      amountPaid: String(Number(invoice.amountPaid) + due),
      status: "paid",
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoice.id));
}

export async function clearInvoiceAction(invoiceId: number, method: PaymentMethod = "cash") {
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  await db.transaction(async (tx) => {
    await settleInvoice(tx, invoiceId, method, userId);
  });

  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
}

export async function clearCustomerAccountAction(
  customerId: number,
  method: PaymentMethod = "cash"
) {
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  const outstanding = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(
      and(eq(invoices.customerId, customerId), inArray(invoices.status, ["issued", "partially_paid"]))
    );

  await db.transaction(async (tx) => {
    for (const invoice of outstanding) {
      await settleInvoice(tx, invoice.id, method, userId);
    }
  });

  revalidatePath(`/dashboard/customers/${customerId}`);
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/invoices");
}

export async function sendOutstandingReminderAction(
  customerId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await notifyOutstandingReminder(customerId);
    return result.success ? { success: true } : { success: false, error: result.error };
  } catch (err) {
    console.error("[whatsapp] sendOutstandingReminderAction failed", err);
    return { success: false, error: "Something went wrong sending the reminder." };
  }
}
