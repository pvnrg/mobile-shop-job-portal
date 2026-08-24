"use server";

import { db } from "@/db";
import { media } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_ROOT, safeJoin } from "@/lib/upload-dir";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);
const MAX_SIZE = 15 * 1024 * 1024; // 15MB

export type MediaFormState = {
  error?: string;
};

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-150);
}

export async function uploadMediaAction(
  jobId: number,
  _prevState: MediaFormState,
  formData: FormData
): Promise<MediaFormState> {
  const file = formData.get("file");
  const category = (formData.get("category") as string) || "device_photo";
  const caption = (formData.get("caption") as string) || null;

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file to upload." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Only JPG, PNG, WEBP, HEIC images or PDF files are allowed." };
  }
  if (file.size > MAX_SIZE) {
    return { error: "File is too large (max 15MB)." };
  }

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  const jobDir = safeJoin("jobs", String(jobId));
  await mkdir(jobDir, { recursive: true });

  const fileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
  const filePath = path.join(jobDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const relativePath = path.posix.join("jobs", String(jobId), fileName);

  await db.insert(media).values({
    jobId,
    fileName: file.name,
    filePath: relativePath,
    fileType: file.type,
    fileSize: file.size,
    category,
    caption,
    uploadedBy: userId,
  });

  revalidatePath(`/dashboard/jobs/${jobId}`);
  return {};
}

export async function deleteMediaAction(mediaId: number, jobId: number) {
  const item = await db.query.media.findFirst({ where: eq(media.id, mediaId) });
  if (item) {
    try {
      await unlink(path.join(UPLOAD_ROOT, item.filePath));
    } catch {
      // file already missing on disk; ignore
    }
    await db.delete(media).where(eq(media.id, mediaId));
  }
  revalidatePath(`/dashboard/jobs/${jobId}`);
}
