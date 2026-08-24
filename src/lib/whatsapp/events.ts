import type { JobStatus } from "@/lib/status";

export const notificationEvents = [
  "job_received",
  "job_diagnosing",
  "job_waiting_parts",
  "job_repairing",
  "job_ready",
  "job_delivered",
  "job_cancelled",
  "invoice_created",
] as const;

export type NotificationEvent = (typeof notificationEvents)[number];

export const jobStatusToEvent: Record<JobStatus, NotificationEvent> = {
  received: "job_received",
  diagnosing: "job_diagnosing",
  waiting_parts: "job_waiting_parts",
  repairing: "job_repairing",
  ready: "job_ready",
  delivered: "job_delivered",
  cancelled: "job_cancelled",
};

export const notificationEventMeta: Record<
  NotificationEvent,
  { label: string; description: string; params: string[] }
> = {
  job_received: {
    label: "Job Received",
    description: "Sent when a new repair job is logged for a customer.",
    params: ["Customer Name", "Job Number", "Device", "Status"],
  },
  job_diagnosing: {
    label: "Diagnosing",
    description: "Sent when a job moves to the diagnosing stage.",
    params: ["Customer Name", "Job Number", "Device", "Status"],
  },
  job_waiting_parts: {
    label: "Waiting for Parts",
    description: "Sent when a job is waiting on spare parts.",
    params: ["Customer Name", "Job Number", "Device", "Status"],
  },
  job_repairing: {
    label: "Repairing",
    description: "Sent when active repair work begins.",
    params: ["Customer Name", "Job Number", "Device", "Status"],
  },
  job_ready: {
    label: "Ready for Pickup",
    description: "Sent when the device is ready for the customer to collect.",
    params: ["Customer Name", "Job Number", "Device", "Status"],
  },
  job_delivered: {
    label: "Delivered",
    description: "Sent when the device has been handed back to the customer.",
    params: ["Customer Name", "Job Number", "Device", "Status"],
  },
  job_cancelled: {
    label: "Cancelled",
    description: "Sent when a job is cancelled.",
    params: ["Customer Name", "Job Number", "Device", "Status"],
  },
  invoice_created: {
    label: "Invoice Sent",
    description: "Sent when the shop shares a GST invoice with the customer.",
    params: ["Customer Name", "Invoice Number", "Total Amount", "Shop Name"],
  },
};
