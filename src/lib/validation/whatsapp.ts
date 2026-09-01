import { z } from "zod";
import { notificationEvents } from "@/lib/whatsapp/events";

export const whatsappConnectionSchema = z.object({
  enabled: z.coerce.boolean(),
  accessToken: z.string().trim().optional(),
  defaultCountryCode: z
    .string()
    .trim()
    .regex(/^[0-9]{1,4}$/, "Country code must be digits only")
    .max(5),
});

export const whatsappTemplateSchema = z.object({
  event: z.enum(notificationEvents),
  templateName: z.string().trim().max(120).optional(),
  languageCode: z.string().trim().min(1).max(20),
  enabled: z.coerce.boolean(),
});

export const sendTestMessageSchema = z.object({
  phone: z.string().trim().min(6, "Enter a valid phone number").max(20),
});
