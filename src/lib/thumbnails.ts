import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const THUMB_SIZE = 400; // gallery tiles are ~200px; 2x for sharp phone screens
const THUMBNAIL_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

export function canMakeThumbnail(mimeType: string | null | undefined) {
  return !!mimeType && THUMBNAIL_TYPES.has(mimeType);
}

/**
 * Writes a small square WebP next to the original (e.g. "photo.jpg" →
 * "photo.jpg.thumb.webp") and returns its path relative to the upload root.
 * Returns null if the image can't be decoded (e.g. HEIC without libheif), in
 * which case the gallery simply falls back to the original file.
 */
export async function createThumbnail(
  input: Buffer | string,
  absoluteFilePath: string,
  relativeFilePath: string
): Promise<string | null> {
  try {
    const out = await sharp(input)
      .rotate() // respect the phone's EXIF orientation
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" })
      .webp({ quality: 75 })
      .toBuffer();
    await writeFile(`${absoluteFilePath}.thumb.webp`, out);
    return path.posix.join(
      path.posix.dirname(relativeFilePath),
      `${path.posix.basename(relativeFilePath)}.thumb.webp`
    );
  } catch (err) {
    console.warn("[media] thumbnail generation failed", relativeFilePath, err);
    return null;
  }
}
