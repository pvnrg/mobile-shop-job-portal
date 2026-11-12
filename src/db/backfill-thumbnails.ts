// One-off: creates thumbnails for job photos uploaded before thumbnails existed.
// Safe to re-run — only touches media rows without a thumbnail.
import path from "node:path";
import { existsSync } from "node:fs";
import { eq, isNull } from "drizzle-orm";
import { db } from "./index";
import { media } from "./schema";
import { canMakeThumbnail, createThumbnail } from "../lib/thumbnails";

const UPLOAD_ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "./uploads");

async function main() {
  const rows = await db.select().from(media).where(isNull(media.thumbnailPath));
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const absolute = path.join(UPLOAD_ROOT, row.filePath);
    if (!canMakeThumbnail(row.fileType) || !existsSync(absolute)) {
      skipped++;
      continue;
    }
    const thumb = await createThumbnail(absolute, absolute, row.filePath);
    if (!thumb) {
      skipped++;
      continue;
    }
    await db.update(media).set({ thumbnailPath: thumb }).where(eq(media.id, row.id));
    created++;
  }

  console.log(`Thumbnails created: ${created}, skipped: ${skipped} (PDFs, missing or unreadable files).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
