"use server";

import { db } from "@/db";
import { businessSettings } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

const LOGO_DIR = path.resolve(process.cwd(), "public", "uploads", "logo");
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export type LogoFormState = {
  error?: string;
};

async function getOrCreateSettings() {
  const existing = await db.query.businessSettings.findFirst();
  if (existing) return existing;
  const [created] = await db.insert(businessSettings).values({}).returning();
  return created;
}

export async function uploadLogoAction(
  _prevState: LogoFormState,
  formData: FormData
): Promise<LogoFormState> {
  const file = formData.get("logo");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose an image file." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Only JPG, PNG, WEBP, or SVG images are allowed." };
  }
  if (file.size > MAX_SIZE) {
    return { error: "Logo file is too large (max 2MB)." };
  }

  const settings = await getOrCreateSettings();

  await mkdir(LOGO_DIR, { recursive: true });

  const ext = file.name.slice(file.name.lastIndexOf(".")) || "";
  const fileName = `logo-${Date.now()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(LOGO_DIR, fileName), buffer);

  if (settings.logoPath) {
    try {
      await unlink(path.join(LOGO_DIR, path.basename(settings.logoPath)));
    } catch {
      // old logo file already missing; ignore
    }
  }

  await db
    .update(businessSettings)
    .set({ logoPath: fileName, updatedAt: new Date() })
    .where(eq(businessSettings.id, settings.id));

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/login");
  return {};
}

export async function removeLogoAction() {
  const settings = await db.query.businessSettings.findFirst();
  if (!settings?.logoPath) return;

  try {
    await unlink(path.join(LOGO_DIR, path.basename(settings.logoPath)));
  } catch {
    // file already missing; ignore
  }

  await db
    .update(businessSettings)
    .set({ logoPath: null, updatedAt: new Date() })
    .where(eq(businessSettings.id, settings.id));

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/login");
}
