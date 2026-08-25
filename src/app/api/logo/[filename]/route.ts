import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const LOGO_DIR = path.resolve(process.cwd(), "public", "uploads", "logo");

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // path.basename strips any directory traversal — this route only ever
  // serves a single flat file from LOGO_DIR.
  const filePath = path.join(LOGO_DIR, path.basename(filename));

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not a file");
    const buffer = await readFile(filePath);
    const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
