import type {
  customers,
  jobs,
  jobStatusHistory,
  media,
  invoices,
  invoiceItems,
  payments,
  users,
  businessSettings,
  deviceTypes,
  brands,
  deviceModels,
  whatsappSettings,
  whatsappTemplates,
  whatsappMessages,
} from "./schema";

export type Customer = typeof customers.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type JobStatusHistoryEntry = typeof jobStatusHistory.$inferSelect;
export type Media = typeof media.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type User = typeof users.$inferSelect;
export type BusinessSettings = typeof businessSettings.$inferSelect;
export type DeviceType = typeof deviceTypes.$inferSelect;
export type Brand = typeof brands.$inferSelect;
export type DeviceModel = typeof deviceModels.$inferSelect;
export type WhatsappSettings = typeof whatsappSettings.$inferSelect;
export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
