export const jobStatuses = [
  "received",
  "diagnosing",
  "waiting_parts",
  "repairing",
  "ready",
  "delivered",
  "cancelled",
] as const;

export type JobStatus = (typeof jobStatuses)[number];

export const jobStatusLabels: Record<JobStatus, string> = {
  received: "Received",
  diagnosing: "Diagnosing",
  waiting_parts: "Waiting for Parts",
  repairing: "Repairing",
  ready: "Ready for Pickup",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const jobStatusColors: Record<JobStatus, string> = {
  received: "bg-slate-100 text-slate-700 border-slate-200",
  diagnosing: "bg-blue-100 text-blue-700 border-blue-200",
  waiting_parts: "bg-amber-100 text-amber-700 border-amber-200",
  repairing: "bg-violet-100 text-violet-700 border-violet-200",
  ready: "bg-emerald-100 text-emerald-700 border-emerald-200",
  delivered: "bg-teal-100 text-teal-700 border-teal-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

export const invoiceStatuses = [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "cancelled",
] as const;

export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  partially_paid: "Partially Paid",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const invoiceStatusColors: Record<InvoiceStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  issued: "bg-blue-100 text-blue-700 border-blue-200",
  partially_paid: "bg-amber-100 text-amber-700 border-amber-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

export const paymentMethods = ["cash", "upi", "card", "bank_transfer", "other"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank_transfer: "Bank Transfer",
  other: "Other",
};
