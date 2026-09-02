"use server";

import { db } from "@/db";
import { siteSettings, siteServices, siteGalleryItems } from "@/db/schema";
import {
  heroSettingsSchema,
  siteServiceSchema,
  siteGalleryCaptionSchema,
} from "@/lib/validation/site";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { safeJoin } from "@/lib/upload-dir";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);
const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_SIZE = 60 * 1024 * 1024; // 60MB

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-150);
}

function mediaKind(type: string): "image" | "video" | null {
  if (IMAGE_TYPES.has(type)) return "image";
  if (VIDEO_TYPES.has(type)) return "video";
  return null;
}

// Files live on disk under UPLOAD_ROOT/site/<dir>/<file>, but the path stored
// in the DB (and used to build the public /api/site-media/<path> URL) omits
// the "site" prefix — the serving route re-adds it when resolving from disk.
async function saveSiteFile(dir: string, file: File) {
  const targetDir = safeJoin("site", dir);
  await mkdir(targetDir, { recursive: true });
  const fileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(targetDir, fileName), buffer);
  return path.posix.join(dir, fileName);
}

async function deleteSiteFile(relativePath: string | null) {
  if (!relativePath) return;
  try {
    await unlink(safeJoin("site", relativePath));
  } catch {
    // already gone; ignore
  }
}

async function getOrCreateSiteSettings() {
  const existing = await db.query.siteSettings.findFirst();
  if (existing) return existing;
  const [created] = await db.insert(siteSettings).values({}).returning();
  return created;
}

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

export async function updateHeroSettingsAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = heroSettingsSchema.safeParse({
    heroHeadline: formData.get("heroHeadline"),
    heroSubheading: formData.get("heroSubheading") ?? "",
    heroCtaText: formData.get("heroCtaText") ?? "",
    heroCtaLink: formData.get("heroCtaLink") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const settings = await getOrCreateSiteSettings();
  await db
    .update(siteSettings)
    .set({
      heroHeadline: parsed.data.heroHeadline,
      heroSubheading: parsed.data.heroSubheading || null,
      heroCtaText: parsed.data.heroCtaText || null,
      heroCtaLink: parsed.data.heroCtaLink || null,
      updatedAt: new Date(),
    })
    .where(eq(siteSettings.id, settings.id));

  revalidatePath("/dashboard/site");
  revalidatePath("/");
  return { success: true };
}

export async function uploadHeroMediaAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose an image or video." };
  }
  const kind = mediaKind(file.type);
  if (!kind) {
    return { error: "Only JPG, PNG, WEBP images or MP4/WEBM videos are allowed." };
  }
  const maxSize = kind === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    return { error: `File is too large (max ${maxSize / (1024 * 1024)}MB).` };
  }

  const settings = await getOrCreateSiteSettings();
  const relativePath = await saveSiteFile("hero", file);
  await deleteSiteFile(settings.heroMediaPath);

  await db
    .update(siteSettings)
    .set({ heroMediaType: kind, heroMediaPath: relativePath, updatedAt: new Date() })
    .where(eq(siteSettings.id, settings.id));

  revalidatePath("/dashboard/site");
  revalidatePath("/");
  return { success: true };
}

export async function removeHeroMediaAction() {
  const settings = await getOrCreateSiteSettings();
  await deleteSiteFile(settings.heroMediaPath);
  await db
    .update(siteSettings)
    .set({ heroMediaType: null, heroMediaPath: null, updatedAt: new Date() })
    .where(eq(siteSettings.id, settings.id));

  revalidatePath("/dashboard/site");
  revalidatePath("/");
}

export async function createServiceAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = siteServiceSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    displayOrder: formData.get("displayOrder") || 0,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let imagePath: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (mediaKind(file.type) !== "image") {
      return { error: "Service image must be JPG, PNG, or WEBP." };
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return { error: `Image is too large (max ${MAX_IMAGE_SIZE / (1024 * 1024)}MB).` };
    }
    imagePath = await saveSiteFile("services", file);
  }

  await db.insert(siteServices).values({
    title: parsed.data.title,
    description: parsed.data.description || null,
    displayOrder: parsed.data.displayOrder,
    imagePath,
  });

  revalidatePath("/dashboard/site");
  revalidatePath("/");
  return { success: true };
}

export async function updateServiceAction(
  serviceId: number,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = siteServiceSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    displayOrder: formData.get("displayOrder") || 0,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await db.query.siteServices.findFirst({ where: eq(siteServices.id, serviceId) });
  if (!existing) return { error: "Service not found." };

  let imagePath = existing.imagePath;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (mediaKind(file.type) !== "image") {
      return { error: "Service image must be JPG, PNG, or WEBP." };
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return { error: `Image is too large (max ${MAX_IMAGE_SIZE / (1024 * 1024)}MB).` };
    }
    imagePath = await saveSiteFile("services", file);
    await deleteSiteFile(existing.imagePath);
  }

  await db
    .update(siteServices)
    .set({
      title: parsed.data.title,
      description: parsed.data.description || null,
      displayOrder: parsed.data.displayOrder,
      imagePath,
    })
    .where(eq(siteServices.id, serviceId));

  revalidatePath("/dashboard/site");
  revalidatePath("/");
  return { success: true };
}

export async function toggleServiceActiveAction(serviceId: number, active: boolean) {
  await db
    .update(siteServices)
    .set({ active: active ? 1 : 0 })
    .where(eq(siteServices.id, serviceId));
  revalidatePath("/dashboard/site");
  revalidatePath("/");
}

export async function deleteServiceAction(serviceId: number) {
  const existing = await db.query.siteServices.findFirst({ where: eq(siteServices.id, serviceId) });
  if (existing) {
    await deleteSiteFile(existing.imagePath);
    await db.delete(siteServices).where(eq(siteServices.id, serviceId));
  }
  revalidatePath("/dashboard/site");
  revalidatePath("/");
}

export async function uploadGalleryItemAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose an image or video." };
  }
  const kind = mediaKind(file.type);
  if (!kind) {
    return { error: "Only JPG, PNG, WEBP images or MP4/WEBM videos are allowed." };
  }
  const maxSize = kind === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    return { error: `File is too large (max ${maxSize / (1024 * 1024)}MB).` };
  }

  const parsed = siteGalleryCaptionSchema.safeParse({ caption: formData.get("caption") ?? "" });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const relativePath = await saveSiteFile("gallery", file);
  await db.insert(siteGalleryItems).values({
    mediaType: kind,
    mediaPath: relativePath,
    caption: parsed.data.caption || null,
  });

  revalidatePath("/dashboard/site");
  revalidatePath("/");
  return { success: true };
}

export async function toggleGalleryItemActiveAction(itemId: number, active: boolean) {
  await db
    .update(siteGalleryItems)
    .set({ active: active ? 1 : 0 })
    .where(eq(siteGalleryItems.id, itemId));
  revalidatePath("/dashboard/site");
  revalidatePath("/");
}

export async function deleteGalleryItemAction(itemId: number) {
  const existing = await db.query.siteGalleryItems.findFirst({
    where: eq(siteGalleryItems.id, itemId),
  });
  if (existing) {
    await deleteSiteFile(existing.mediaPath);
    await db.delete(siteGalleryItems).where(eq(siteGalleryItems.id, itemId));
  }
  revalidatePath("/dashboard/site");
  revalidatePath("/");
}
