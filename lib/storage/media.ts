import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * Persist an uploaded image. Local disk in dev.
 * On Vercel, swap this for Cloudinary/UploadThing using the same signature.
 */
export async function saveUpload(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });

  const ext = (file.name.split(".").pop() ?? "bin")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const fileName = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, fileName), bytes);

  return `/uploads/${fileName}`;
}
