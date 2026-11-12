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
  "outstanding_reminder",
  "outstanding_statement",
  "account_statement",
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
    params: ["Customer Name", "Job Number", "Device", "Status", "Amount"],
  },
  job_diagnosing: {
    label: "Diagnosing",
    description: "Sent when a job moves to the diagnosing stage.",
    params: ["Customer Name", "Job Number", "Device", "Status", "Amount"],
  },
  job_waiting_parts: {
    label: "Waiting for Parts",
    description: "Sent when a job is waiting on spare parts.",
    params: ["Customer Name", "Job Number", "Device", "Status", "Amount"],
  },
  job_repairing: {
    label: "Repairing",
    description: "Sent when active repair work begins.",
    params: ["Customer Name", "Job Number", "Device", "Status", "Amount"],
  },
  job_ready: {
    label: "Ready for Pickup",
    description: "Sent when the device is ready for the customer to collect.",
    params: ["Customer Name", "Job Number", "Device", "Status", "Amount"],
  },
  job_delivered: {
    label: "Delivered",
    description: "Sent when the device has been handed back to the customer.",
    params: ["Customer Name", "Job Number", "Device", "Status", "Amount"],
  },
  job_cancelled: {
    label: "Cancelled",
    description: "Sent when a job is cancelled.",
    params: ["Customer Name", "Job Number", "Device", "Status", "Amount"],
  },
  invoice_created: {
    label: "Invoice Sent",
    description: "Sent when the shop shares a GST invoice with the customer.",
    params: ["Customer Name", "Invoice Number", "Total Amount", "Shop Name"],
  },
  outstanding_reminder: {
    label: "Outstanding Balance Reminder",
    description:
      "Sent manually from a customer's page to remind them of their outstanding udhar balance.",
    params: ["Customer Name", "Outstanding Amount", "Shop Name"],
  },
  outstanding_statement: {
    label: "Outstanding Summary with Statement Link",
    description:
      "Sent from a customer's page instead of the basic reminder once this template is enabled. Includes a bill summary and a link to the customer's full udhar statement.",
    params: [
      "Customer Name",
      "Shop Name",
      "Outstanding Amount",
      "Pending Bills",
      "Oldest Bill Date",
      "Last Payment",
      "Statement Link",
    ],
  },
  account_statement: {
    label: "Account Statement",
    description:
      "Sent with the Send Statement button on a customer's page. Shares their running balance and a link to the full bank-style statement of bills and payments. Until this is enabled, the button opens WhatsApp with the message ready to send instead.",
    params: ["Customer Name", "Shop Name", "Balance", "Statement Link"],
  },
};
