import { z } from "zod";

export const partSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  sku: z.string().trim().max(60).optional(),
  category: z.string().trim().max(80).optional(),
  unitCost: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  quantityInStock: z.coerce.number().int().min(0),
  lowStockThreshold: z.coerce.number().int().min(0),
  notes: z.string().trim().max(2000).optional(),
});

export type PartInput = z.infer<typeof partSchema>;

export const stockAdjustmentSchema = z.object({
  changeQuantity: z.coerce.number().int().refine((n) => n !== 0, "Enter a non-zero amount"),
  reason: z.string().trim().min(1, "Select a reason").max(120),
  note: z.string().trim().max(2000).optional(),
});

export const jobPartSchema = z.object({
  partId: z.coerce.number().int().positive("Select a part"),
  quantity: z.coerce.number().int().positive("Must be at least 1"),
});
