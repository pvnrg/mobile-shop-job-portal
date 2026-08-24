import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(160),
  phone: z
    .string()
    .trim()
    .min(10, "Enter a valid phone number")
    .max(20),
  email: z.union([z.literal(""), z.string().trim().email()]).optional(),
  address: z.string().trim().max(2000).optional(),
  gstin: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .regex(
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
          "Enter a valid 15-character GSTIN"
        ),
    ])
    .optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
