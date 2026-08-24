import { z } from "zod";
import { paymentMethods } from "@/lib/status";

export const paymentSchema = z.object({
  customerId: z.coerce.number().int().positive("Select a customer"),
  invoiceId: z.union([z.literal(""), z.coerce.number().int().positive()]).optional(),
  jobId: z.union([z.literal(""), z.coerce.number().int().positive()]).optional(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.enum(paymentMethods),
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
