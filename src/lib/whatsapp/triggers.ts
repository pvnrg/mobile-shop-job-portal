import { db } from "@/db";
import { jobs, jobDevices, invoices, customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jobStatusLabels, type JobStatus } from "@/lib/status";
import { formatCurrency } from "@/lib/format";
import { sendNotification, type SendNotificationResult } from "./notify";
import { jobStatusToEvent } from "./events";

function deviceName(device: { brand: string | null; model: string | null; deviceType: string }) {
  return [device.brand, device.model].filter(Boolean).join(" ") || device.deviceType;
}

// The final cost (once set) takes priority over the estimate — a job
// typically gets its final cost locked in around the "ready"/"delivered"
// stage, so later status updates should reflect the settled amount rather
// than the original estimate.
function jobAmount(job: { estimatedCost: string | null; finalCost: string | null }) {
  return formatCurrency(job.finalCost ?? job.estimatedCost ?? 0);
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
      bodyParams: [
        job.customer.name,
        job.jobNumber,
        device,
        jobStatusLabels.received,
        jobAmount(job),
      ],
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
        jobAmount(device.job),
      ],
    });
  } catch (err) {
    console.error("[whatsapp] notifyJobStatusChange failed", err);
  }
}

// Manually triggered from a customer's page (not an automatic status-change
// event), so — unlike the triggers above — errors are returned rather than
// swallowed, letting the UI tell the shop owner whether it actually sent.
export async function notifyOutstandingReminder(
  customerId: number
): Promise<SendNotificationResult> {
  const customer = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });
  if (!customer) {
    return { success: false, error: "Customer not found." };
  }

  const customerInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.customerId, customerId));

  const outstanding = customerInvoices.reduce((sum, i) => {
    if (i.status === "cancelled") return sum;
    const due = Number(i.total) - Number(i.amountPaid);
    return sum + Math.max(0, due);
  }, 0);

  if (outstanding <= 0) {
    return { success: false, error: "This customer has no outstanding balance." };
  }

  const settings = await db.query.businessSettings.findFirst();

  return sendNotification({
    event: "outstanding_reminder",
    customerId: customer.id,
    customerPhone: customer.phone,
    bodyParams: [
      customer.name,
      formatCurrency(outstanding),
      settings?.businessName ?? "Mobile Repair Shop",
    ],
  });
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
