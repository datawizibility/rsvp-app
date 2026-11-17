"use server";

import { revalidatePath } from "next/cache";
import { addGuestGalleryItem } from "@/lib/services/gallery";

export type GalleryState = { error?: string; success?: string } | null;

const buckets = new Map<string, { count: number; reset: number }>();

function allow(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

export async function uploadGuestPhotoAction(
  _prev: GalleryState,
  formData: FormData,
): Promise<GalleryState> {
  const eventSlug = String(formData.get("eventSlug"));
  const guestToken = String(formData.get("guestToken"));

  if (!allow(`${guestToken}:gallery`)) {
    return { error: "Too many uploads. Please try again in a minute." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a photo." };
  }

  try {
    await addGuestGalleryItem(eventSlug, guestToken, file);
  } catch (error) {
    if (error instanceof Error && error.message.length < 100) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/e/${eventSlug}/${guestToken}`);
  return { success: "Thanks! Your photo was shared with the hosts for approval." };
}
