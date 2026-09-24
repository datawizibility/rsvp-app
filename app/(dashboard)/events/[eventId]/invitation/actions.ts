"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { publishInvitation, updateInvitation } from "@/lib/services/invitation";
import { invitationSchema } from "@/lib/validation/schemas";

export type FormState = { error?: string; success?: string } | null;

const SECTION_KEYS = [
  "welcome",
  "about",
  "functions",
  "gallery",
  "venue",
  "directions",
  "dressCode",
  "accommodation",
  "travel",
  "rsvp",
  "contact",
  "giftRegistry",
  "agenda",
] as const;

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function saveInvitationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const eventId = String(formData.get("eventId"));

  const sections: Record<string, boolean> = {};
  for (const key of SECTION_KEYS) {
    sections[key] = formData.get(`section_${key}`) === "on";
  }

  let media: { url: string; type: string }[] = [];
  try {
    const parsed = JSON.parse(str(formData, "media") || "[]");
    if (Array.isArray(parsed)) media = parsed;
  } catch {
    media = [];
  }

  const parsed = invitationSchema.safeParse({
    templateKey: str(formData, "templateKey") || "royal",
    content: {
      headline: str(formData, "headline"),
      welcome: str(formData, "welcome"),
      about: str(formData, "about"),
      hostMessage: str(formData, "hostMessage"),
      rsvpMessage: str(formData, "rsvpMessage"),
      venueNote: str(formData, "venueNote"),
    },
    sections,
    coverImageUrl: str(formData, "coverImageUrl") || null,
    media,
  });

  if (!parsed.success) {
    return { error: "Please check the invitation fields." };
  }

  await updateInvitation(userId, eventId, parsed.data);

  const intent = String(formData.get("intent") ?? "save");
  if (intent === "publish") {
    await publishInvitation(userId, eventId);
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/invitation`);
    return { success: "Saved and published." };
  }

  revalidatePath(`/events/${eventId}/invitation`);
  return { success: "Invitation saved." };
}

export async function publishInvitationAction(formData: FormData) {
  const userId = await requireUserId();
  const eventId = String(formData.get("eventId"));
  await publishInvitation(userId, eventId);
  revalidatePath(`/events/${eventId}/invitation`);
  revalidatePath(`/events/${eventId}`);
}
