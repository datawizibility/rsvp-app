"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { markSent, saveEventTemplates, type Round } from "@/lib/services/messaging";

export type FormState = { error?: string; success?: string } | null;

export async function saveTemplatesAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const eventId = String(formData.get("eventId"));
  const inviteTemplate = String(formData.get("inviteTemplate") ?? "").trim();
  const reminderTemplate = String(formData.get("reminderTemplate") ?? "").trim();

  if (inviteTemplate.length < 5 || reminderTemplate.length < 5) {
    return { error: "Both messages need a little more text." };
  }
  if (inviteTemplate.length > 1000 || reminderTemplate.length > 1000) {
    return { error: "Messages must be under 1000 characters." };
  }

  await saveEventTemplates(userId, eventId, { inviteTemplate, reminderTemplate });
  revalidatePath(`/events/${eventId}/guests/send`);
  return { success: "Messages saved." };
}

export async function markSentAction(
  eventId: string,
  guestId: string,
  round: Round,
): Promise<void> {
  const userId = await requireUserId();
  await markSent(userId, eventId, guestId, round);
}
