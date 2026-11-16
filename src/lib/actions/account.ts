"use server";

import { db } from "@/db";
import { invoices, payments } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { eq, and, inArray } from "drizzle-orm";
import type { PaymentMethod } from "@/lib/status";
import { notifyAccountStatement, notifyOutstandingReminder } from "@/lib/whatsapp/triggers";
import { getStatementUrl } from "@/lib/statement";
import { linkJobPayments, syncInvoicePaid } from "@/lib/balances";

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

  await syncInvoicePaid(tx, invoice.id);
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
    .select({ id: invoices.id, jobId: invoices.jobId })
    .from(invoices)
    .where(
      and(eq(invoices.customerId, customerId), inArray(invoices.status, ["issued", "partially_paid"]))
    )
    .orderBy(invoices.issuedAt, invoices.id);

  await db.transaction(async (tx) => {
    for (const invoice of outstanding) {
      // Count money already taken on the job before collecting the rest.
      if (invoice.jobId) {
        await linkJobPayments(tx, invoice.jobId, invoice.id);
        await syncInvoicePaid(tx, invoice.id);
      }
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
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };
  try {
    const result = await notifyOutstandingReminder(customerId);
    return result.success ? { success: true } : { success: false, error: result.error };
  } catch (err) {
    console.error("[whatsapp] sendOutstandingReminderAction failed", err);
    return { success: false, error: "Something went wrong sending the reminder." };
  }
}

// Lets staff copy the customer's statement link to share it by hand
// (e.g. a normal WhatsApp chat) without going through the template API.
export async function getStatementLinkAction(
  customerId: number
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };
  try {
    const url = await getStatementUrl(customerId);
    return url ? { success: true, url } : { success: false, error: "Customer not found." };
  } catch (err) {
    console.error("[statement] getStatementLinkAction failed", err);
    return { success: false, error: "Could not create the statement link." };
  }
}

export async function sendAccountStatementAction(
  customerId: number
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };
  try {
    const result = await notifyAccountStatement(customerId);
    return result.success ? { success: true } : { success: false, error: result.error };
  } catch (err) {
    console.error("[whatsapp] sendAccountStatementAction failed", err);
    return { success: false, error: "Something went wrong sending the statement." };
  }
}
