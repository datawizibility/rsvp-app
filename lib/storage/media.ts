import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * Persist an uploaded image.
 *
 * - Production: Vercel Blob (set BLOB_READ_WRITE_TOKEN). Files live on a CDN
 *   and survive deploys.
 * - Development: local disk under public/uploads.
 *
 * Both paths return a public URL, so callers are unchanged.
 */
export async function saveUpload(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() ?? "bin")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${randomUUID()}.${ext}`, file, {
      access: "public",
      contentType: file.type,
    });
    return blob.url;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set. Configure Vercel Blob (or another image host) before uploading in production.",
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const fileName = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, fileName), bytes);

  return `/uploads/${fileName}`;
}
