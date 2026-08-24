import { db } from "@/db";
import { jobs, invoices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jobStatusLabels, type JobStatus } from "@/lib/status";
import { formatCurrency } from "@/lib/format";
import { sendNotification } from "./notify";
import { jobStatusToEvent } from "./events";

export async function notifyJobStatusChange(jobId: number, status: JobStatus) {
  try {
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
      with: { customer: true },
    });
    if (!job) return;

    const device = [job.brand, job.model].filter(Boolean).join(" ") || job.deviceType;

    await sendNotification({
      event: jobStatusToEvent[status],
      customerId: job.customer.id,
      customerPhone: job.customer.phone,
      jobId: job.id,
      bodyParams: [job.customer.name, job.jobNumber, device, jobStatusLabels[status]],
    });
  } catch (err) {
    console.error("[whatsapp] notifyJobStatusChange failed", err);
  }
}

export async function notifyInvoiceCreated(invoiceId: number) {
  try {
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
      with: { customer: true },
    });
    if (!invoice) return;

    const settings = await db.query.businessSettings.findFirst();

    await sendNotification({
      event: "invoice_created",
      customerId: invoice.customer.id,
      customerPhone: invoice.customer.phone,
      invoiceId: invoice.id,
      bodyParams: [
        invoice.customer.name,
        invoice.invoiceNumber,
        formatCurrency(invoice.total),
        settings?.businessName ?? "Mobile Repair Shop",
      ],
    });
  } catch (err) {
    console.error("[whatsapp] notifyInvoiceCreated failed", err);
  }
}
