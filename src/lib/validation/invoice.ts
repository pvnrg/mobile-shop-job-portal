import { z } from "zod";

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Description required").max(255),
  hsnSac: z.string().trim().max(20).optional(),
  quantity: z.coerce.number().positive("Must be > 0"),
  unitPrice: z.coerce.number().min(0),
  taxRatePercent: z.coerce.number().min(0).max(100),
});

export const invoiceSchema = z.object({
  customerId: z.coerce.number().int().positive("Select a customer"),
  jobId: z.union([z.literal(""), z.coerce.number().int().positive()]).optional(),
  gstType: z.enum(["intra", "inter"]),
  placeOfSupply: z.string().trim().max(60).optional(),
  discount: z.union([z.literal(""), z.coerce.number().min(0)]).optional(),
  notes: z.string().trim().max(2000).optional(),
  dueAt: z.union([z.literal(""), z.string()]).optional(),
  items: z.array(invoiceItemSchema).min(1, "Add at least one line item"),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
