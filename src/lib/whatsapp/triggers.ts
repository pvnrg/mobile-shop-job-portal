import { db } from "@/db";
import { jobs, jobDevices, invoices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jobStatusLabels, type JobStatus } from "@/lib/status";
import { formatCurrency } from "@/lib/format";
import { sendNotification } from "./notify";
import { jobStatusToEvent } from "./events";

function deviceName(device: { brand: string | null; model: string | null; deviceType: string }) {
  return [device.brand, device.model].filter(Boolean).join(" ") || device.deviceType;
}

// Sent once when a job is created, naming every device dropped off in that
// visit — avoids sending one WhatsApp message per device on creation.
export async function notifyJobReceived(jobId: number) {
  try {
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
      with: { customer: true, devices: true },
    });
    if (!job || job.devices.length === 0) return;

    const device = job.devices.map(deviceName).join(", ");

    await sendNotification({
      event: jobStatusToEvent.received,
      customerId: job.customer.id,
      customerPhone: job.customer.phone,
      jobId: job.id,
      bodyParams: [job.customer.name, job.jobNumber, device, jobStatusLabels.received],
    });
  } catch (err) {
    console.error("[whatsapp] notifyJobReceived failed", err);
  }
}

export async function notifyJobStatusChange(jobDeviceId: number, status: JobStatus) {
  try {
    const device = await db.query.jobDevices.findFirst({
      where: eq(jobDevices.id, jobDeviceId),
      with: { job: { with: { customer: true } } },
    });
    if (!device) return;

    await sendNotification({
      event: jobStatusToEvent[status],
      customerId: device.job.customer.id,
      customerPhone: device.job.customer.phone,
      jobId: device.job.id,
      jobDeviceId: device.id,
      bodyParams: [
        device.job.customer.name,
        device.job.jobNumber,
        deviceName(device),
        jobStatusLabels[status],
      ],
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
