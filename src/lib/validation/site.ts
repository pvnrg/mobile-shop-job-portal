import { z } from "zod";

export const heroSettingsSchema = z.object({
  heroHeadline: z.string().trim().min(1, "Headline is required").max(200),
  heroSubheading: z.string().trim().max(400).optional(),
  heroCtaText: z.string().trim().max(60).optional(),
  heroCtaLink: z.string().trim().max(300).optional(),
});

export const siteServiceSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(500).optional(),
  displayOrder: z.coerce.number().int().default(0),
});

export const siteGalleryCaptionSchema = z.object({
  caption: z.string().trim().max(200).optional(),
});
