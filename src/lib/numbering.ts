import { db } from "@/db";
import { jobs, invoices } from "@/db/schema";
import { sql } from "drizzle-orm";

async function getSettings() {
  const settings = await db.query.businessSettings.findFirst();
  return (
    settings ?? {
      jobPrefix: "JOB",
      invoicePrefix: "INV",
    }
  );
}

async function nextSequence(
  table: typeof jobs | typeof invoices,
  column: "jobNumber" | "invoiceNumber",
  prefix: string,
  year: number
) {
  const like = `${prefix}-${year}-%`;
  const colRef = column === "jobNumber" ? jobs.jobNumber : invoices.invoiceNumber;

  const rows = await db
    .select({ value: colRef })
    .from(table as typeof jobs)
    .where(sql`${colRef} LIKE ${like}`)
    .orderBy(sql`${colRef} DESC`)
    .limit(1);

  if (rows.length === 0) return 1;

  const last = rows[0].value as string;
  const parts = last.split("-");
  const lastSeq = parseInt(parts[parts.length - 1], 10);
  return Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
}

export async function generateJobNumber() {
  const settings = await getSettings();
  const year = new Date().getFullYear();
  const seq = await nextSequence(jobs, "jobNumber", settings.jobPrefix, year);
  return `${settings.jobPrefix}-${year}-${String(seq).padStart(4, "0")}`;
}

export async function generateInvoiceNumber() {
  const settings = await getSettings();
  const year = new Date().getFullYear();
  const seq = await nextSequence(invoices, "invoiceNumber", settings.invoicePrefix, year);
  return `${settings.invoicePrefix}-${year}-${String(seq).padStart(4, "0")}`;
}
