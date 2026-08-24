import path from "node:path";

export const UPLOAD_ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "./uploads");

export function safeJoin(...segments: string[]) {
  const target = path.resolve(UPLOAD_ROOT, ...segments);
  if (!target.startsWith(UPLOAD_ROOT)) {
    throw new Error("Invalid path");
  }
  return target;
}
