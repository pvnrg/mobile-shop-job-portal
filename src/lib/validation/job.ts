import { z } from "zod";
import { jobStatuses } from "@/lib/status";

export const jobSchema = z.object({
  customerId: z.coerce.number().int().positive("Select a customer"),
  deviceType: z.string().trim().min(1, "Device type is required").max(60),
  brand: z.string().trim().max(60).optional(),
  model: z.string().trim().max(100).optional(),
  serialNumber: z.string().trim().max(100).optional(),
  issueDescription: z.string().trim().min(3, "Describe the issue").max(4000),
  accessories: z.string().trim().max(500).optional(),
  passcode: z.string().trim().max(60).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  estimatedCost: z
    .union([z.literal(""), z.coerce.number().min(0)])
    .optional(),
  assignedTo: z.union([z.literal(""), z.coerce.number().int().positive()]).optional(),
  promisedAt: z.union([z.literal(""), z.string()]).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type JobInput = z.infer<typeof jobSchema>;

export const jobStatusUpdateSchema = z.object({
  status: z.enum(jobStatuses),
  note: z.string().trim().max(2000).optional(),
});
