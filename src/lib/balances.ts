import { db } from "@/db";
import { invoices, payments } from "@/db/schema";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// One set of money rules for the whole app.
//
//  * An invoice's "paid" figure is always the sum of the payments linked to
//    it (syncInvoicePaid), never a number that is added to by hand.
//  * A payment taken on a job before its invoice existed (e.g. when marking
//    the device delivered) is linked to that invoice once it is created
//    (linkJobPayments), so it isn't forgotten.
//  * A customer's udhar = everything billed (non-cancelled invoices) minus
//    everything they have paid. This is the same figure as the closing
//    balance on their account statement. If they've paid more than billed,
//    udhar is 0 and the difference is an advance.
// ---------------------------------------------------------------------------

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Db = typeof db | DbTx;

const round = (n: number) => Math.round(n * 100) / 100;

/** Recompute an invoice's amount paid and status from its linked payments. */
export async function syncInvoicePaid(tx: Db, invoiceId: number) {
  const invoice = await tx.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
  if (!invoice) return;

  const [row] = await tx
    .select({ paid: sql<string>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));
  const paid = round(Number(row?.paid ?? 0));
  const total = Number(invoice.total);

  // Cancelled and draft invoices keep their status; only the paid figure moves.
  const status =
    invoice.status === "cancelled" || invoice.status === "draft"
      ? invoice.status
      : paid >= total && total > 0
        ? "paid"
        : paid > 0
          ? "partially_paid"
          : "issued";

  await tx
    .update(invoices)
    .set({ amountPaid: paid.toFixed(2), status, updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));
}

/** Amount paid on a job that isn't linked to any invoice yet. */
export async function unbilledJobPayments(tx: Db, jobId: number) {
  const [row] = await tx
    .select({ paid: sql<string>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(and(eq(payments.jobId, jobId), isNull(payments.invoiceId)));
  return round(Number(row?.paid ?? 0));
}

/** Link a job's not-yet-invoiced payments to its (new) invoice. */
export async function linkJobPayments(tx: Db, jobId: number, invoiceId: number) {
  await tx
    .update(payments)
    .set({ invoiceId })
    .where(and(eq(payments.jobId, jobId), isNull(payments.invoiceId)));
}

/** The job's current (non-cancelled) invoice, if any. */
export async function findJobInvoice(tx: Db, jobId: number) {
  return tx.query.invoices.findFirst({
    where: and(eq(invoices.jobId, jobId), ne(invoices.status, "cancelled")),
  });
}

export type CustomerBalance = { billed: number; paid: number; udhar: number; advance: number };

function toBalance(billed: number, paid: number): CustomerBalance {
  const diff = round(billed - paid);
  return { billed: round(billed), paid: round(paid), udhar: Math.max(0, diff), advance: Math.max(0, -diff) };
}

/** Billed / paid / udhar per customer. Pass ids to limit it, or nothing for everyone. */
export async function getCustomerBalances(customerIds?: number[]) {
  if (customerIds && customerIds.length === 0) return new Map<number, CustomerBalance>();

  const [billedRows, paidRows] = await Promise.all([
    db
      .select({ customerId: invoices.customerId, billed: sql<string>`sum(${invoices.total})` })
      .from(invoices)
      .where(
        and(
          ne(invoices.status, "cancelled"),
          customerIds ? inArray(invoices.customerId, customerIds) : undefined
        )
      )
      .groupBy(invoices.customerId),
    db
      .select({ customerId: payments.customerId, paid: sql<string>`sum(${payments.amount})` })
      .from(payments)
      .where(customerIds ? inArray(payments.customerId, customerIds) : undefined)
      .groupBy(payments.customerId),
  ]);

  const billed = new Map(billedRows.map((r) => [r.customerId, Number(r.billed)]));
  const paid = new Map(paidRows.map((r) => [r.customerId, Number(r.paid)]));
  const ids = new Set([...billed.keys(), ...paid.keys()]);

  return new Map([...ids].map((id) => [id, toBalance(billed.get(id) ?? 0, paid.get(id) ?? 0)]));
}

export async function getCustomerBalance(customerId: number) {
  return (await getCustomerBalances([customerId])).get(customerId) ?? toBalance(0, 0);
}

/** Total udhar across all customers (customers in advance count as 0). */
export async function getTotalOutstanding() {
  const balances = await getCustomerBalances();
  return round([...balances.values()].reduce((s, b) => s + b.udhar, 0));
}
