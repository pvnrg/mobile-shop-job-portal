import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/db";
import { customers, invoices, payments } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { formatCurrency } from "@/lib/format";
import { formatPhoneForWhatsapp } from "@/lib/whatsapp/client";

// Shared by the WhatsApp summary message and the public /s/<token> page so the
// two always agree on what the customer owes.
export async function getCustomerStatement(customerId: number) {
  const [customerInvoices, customerPayments] = await Promise.all([
    db.query.invoices.findMany({
      where: eq(invoices.customerId, customerId),
      with: { job: { with: { devices: true } } },
      orderBy: (inv, { asc }) => [asc(inv.issuedAt), asc(inv.createdAt)],
    }),
    db
      .select()
      .from(payments)
      .where(eq(payments.customerId, customerId))
      .orderBy(desc(payments.paidAt)),
  ]);

  // Same rule as the customer page's "Udhar" card: any non-cancelled invoice
  // with money still due.
  const pendingInvoices = customerInvoices
    .filter((i) => i.status !== "cancelled")
    .map((i) => ({ ...i, balance: Math.max(0, Number(i.total) - Number(i.amountPaid)) }))
    .filter((i) => i.balance > 0);

  const outstanding = pendingInvoices.reduce((sum, i) => sum + i.balance, 0);
  const oldestBillDate = pendingInvoices.length
    ? (pendingInvoices[0].issuedAt ?? pendingInvoices[0].createdAt)
    : null;

  return {
    pendingInvoices,
    outstanding,
    oldestBillDate,
    lastPayment: customerPayments[0] ?? null,
    recentPayments: customerPayments.slice(0, 5),
  };
}

export async function ensureStatementToken(customerId: number) {
  const customer = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });
  if (!customer) return null;
  if (customer.statementToken) return customer.statementToken;

  const token = randomBytes(18).toString("base64url");
  // Only set it if still empty, so two concurrent sends can't hand out different links.
  await db
    .update(customers)
    .set({ statementToken: token })
    .where(and(eq(customers.id, customerId), isNull(customers.statementToken)));

  const fresh = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });
  return fresh?.statementToken ?? null;
}

// Prefer an explicitly configured public URL (APP_URL / NEXTAUTH_URL on the
// server); fall back to the address the staff member is using right now.
async function getBaseUrl() {
  const configured = process.env.APP_URL || process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3030";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function getStatementUrl(customerId: number) {
  const token = await ensureStatementToken(customerId);
  if (!token) return null;
  return `${await getBaseUrl()}/s/${token}`;
}

// ---------- Bank-style account statement (ledger) ----------

export type StatementPeriod = "all" | "this_month" | "last_3_months" | "this_year";

export const statementPeriods: { value: StatementPeriod; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "this_month", label: "This month" },
  { value: "last_3_months", label: "Last 3 months" },
  { value: "this_year", label: "This year" },
];

export function parseStatementPeriod(value: string | undefined): StatementPeriod {
  return statementPeriods.some((p) => p.value === value) ? (value as StatementPeriod) : "all";
}

function periodStart(period: StatementPeriod): Date | null {
  const now = new Date();
  switch (period) {
    case "this_month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "last_3_months":
      return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    case "this_year":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null;
  }
}

export type LedgerEntry =
  | {
      kind: "bill";
      id: string;
      date: Date;
      invoiceNumber: string;
      jobNumber: string | null;
      device: string | null;
      debit: number;
      credit: 0;
      balance: number;
      billPaid: number;
      billDue: number;
    }
  | {
      kind: "payment";
      id: string;
      date: Date;
      method: string;
      reference: string | null;
      invoiceNumber: string | null;
      debit: 0;
      credit: number;
      balance: number;
    };

// Every device on the bill's job, e.g. "Samsung Galaxy A52, Apple iPhone 12".
function deviceSummary(devices: { id: number; brand: string | null; model: string | null; deviceType: string }[]) {
  if (!devices.length) return null;
  return [...devices]
    .sort((a, b) => a.id - b.id)
    .map((d) => {
      // Skip the brand when the model already starts with it ("Nokia" + "Nokia 5.4").
      const brand = d.brand && d.model?.toLowerCase().startsWith(d.brand.toLowerCase()) ? null : d.brand;
      return [brand, d.model].filter(Boolean).join(" ") || d.deviceType;
    })
    .join(", ");
}

/**
 * Chronological ledger like a bank passbook: each bill is a debit (the
 * customer owes more), each payment a credit, with a running balance.
 * Positive balance = udhar the customer owes; negative = advance with the shop.
 * Cancelled bills are left out (same rule as the udhar totals).
 */
export async function getCustomerLedger(customerId: number, period: StatementPeriod = "all") {
  const [customerInvoices, customerPayments] = await Promise.all([
    db.query.invoices.findMany({
      where: eq(invoices.customerId, customerId),
      with: { job: { columns: { jobNumber: true }, with: { devices: true } } },
    }),
    db.query.payments.findMany({
      where: eq(payments.customerId, customerId),
      with: { invoice: { columns: { invoiceNumber: true } } },
    }),
  ]);

  type Unbalanced = Omit<Extract<LedgerEntry, { kind: "bill" }>, "balance"> | Omit<Extract<LedgerEntry, { kind: "payment" }>, "balance">;
  const raw: Unbalanced[] = [];

  for (const inv of customerInvoices) {
    if (inv.status === "cancelled") continue;
    const total = Number(inv.total);
    const paid = Number(inv.amountPaid);
    raw.push({
      kind: "bill",
      id: `inv-${inv.id}`,
      date: inv.issuedAt ?? inv.createdAt,
      invoiceNumber: inv.invoiceNumber,
      jobNumber: inv.job?.jobNumber ?? null,
      device: inv.job ? deviceSummary(inv.job.devices) : null,
      debit: total,
      credit: 0,
      billPaid: paid,
      billDue: Math.max(0, total - paid),
    });
  }
  for (const p of customerPayments) {
    raw.push({
      kind: "payment",
      id: `pay-${p.id}`,
      date: p.paidAt,
      method: p.method,
      reference: p.reference,
      invoiceNumber: p.invoice?.invoiceNumber ?? null,
      debit: 0,
      credit: Number(p.amount),
    });
  }

  // Oldest first; on the same timestamp, the bill comes before its payment.
  const rank = (e: Unbalanced) => (e.kind === "bill" ? 0 : 1);
  raw.sort((a, b) => a.date.getTime() - b.date.getTime() || rank(a) - rank(b));

  const from = periodStart(period);
  let balance = 0;
  let openingBalance = 0;
  const entries: LedgerEntry[] = [];
  for (const e of raw) {
    balance += e.debit - e.credit;
    if (from && e.date < from) {
      openingBalance = balance;
      continue;
    }
    entries.push({ ...e, balance } as LedgerEntry);
  }

  const totalBilled = entries.reduce((s, e) => s + e.debit, 0);
  const totalPaid = entries.reduce((s, e) => s + e.credit, 0);

  return {
    period,
    from,
    openingBalance,
    closingBalance: balance,
    totalBilled,
    totalPaid,
    entries,
  };
}

// ---------- Sharing the statement with the customer ----------

/** How the running balance reads in a message: due, advance or settled. */
export function describeBalance(closingBalance: number) {
  const rounded = Math.round(closingBalance * 100) / 100;
  if (rounded > 0) return `${formatCurrency(rounded)} due`;
  if (rounded < 0) return `${formatCurrency(-rounded)} advance with us`;
  return "Nil — all settled";
}

/**
 * Everything needed to share a customer's statement: the link, a ready-made
 * message, and a wa.me link that opens WhatsApp with that message prefilled
 * (used when the WhatsApp Business template isn't set up yet).
 */
export async function getStatementShare(customerId: number) {
  const [customer, business, waSettings, ledger, url] = await Promise.all([
    db.query.customers.findFirst({ where: eq(customers.id, customerId) }),
    db.query.businessSettings.findFirst(),
    db.query.whatsappSettings.findFirst(),
    getCustomerLedger(customerId, "all"),
    getStatementUrl(customerId),
  ]);
  if (!customer || !url) return null;

  const shopName = business?.businessName ?? "Mobile Repair Shop";
  const balanceText = describeBalance(ledger.closingBalance);
  const message = [
    `Hi ${customer.name},`,
    ``,
    `Here is your account statement from ${shopName}.`,
    `Total billed: ${formatCurrency(ledger.totalBilled)}`,
    `Total paid: ${formatCurrency(ledger.totalPaid)}`,
    `Balance: ${balanceText}`,
    ``,
    `See every bill and payment here: ${url}`,
    `Download as PDF: ${url}/pdf`,
    ``,
    `Thank you!`,
  ].join("\n");

  const phone = formatPhoneForWhatsapp(customer.phone, waSettings?.defaultCountryCode ?? "91");
  const waLink = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null;

  const safeName = customer.name.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "Customer";
  const pdf = { url: `${url}/pdf`, filename: `Statement_${safeName}.pdf` };

  return { customer, shopName, url, pdf, balanceText, message, waLink };
}
