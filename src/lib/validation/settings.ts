import { z } from "zod";

export const businessSettingsSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
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
  address: z.string().trim().max(2000).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.union([z.literal(""), z.string().trim().email()]).optional(),
  invoicePrefix: z.string().trim().min(1).max(20),
  jobPrefix: z.string().trim().min(1).max(20),
  defaultCgstPercent: z.coerce.number().min(0).max(100),
  defaultSgstPercent: z.coerce.number().min(0).max(100),
  defaultIgstPercent: z.coerce.number().min(0).max(100),
});

export const staffSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "staff", "accountant"]),
});
