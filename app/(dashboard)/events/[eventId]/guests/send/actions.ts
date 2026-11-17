"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { markSent, saveEventTemplates, type Round } from "@/lib/services/messaging";
import { getEventForUser } from "@/lib/services/events";
import { getEventTemplates } from "@/lib/services/messaging";
import {
  isWabaConfigured,
  sendWabaTemplateMessage,
  wabaTemplateName,
  wabaTemplateBodyText,
} from "@/lib/messaging/waba";
import { renderMessage } from "@/lib/messaging/templates";
import { prisma } from "@/lib/db";

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

export type WabaSendState = { error?: string; success?: string } | null;

export async function sendWabaAction(
  eventId: string,
  guestId: string,
  round: Round,
): Promise<WabaSendState> {  const userId = await requireUserId();
  await getEventForUser(userId, eventId);

  if (!isWabaConfigured()) {
    return { error: "WhatsApp Business API is not configured." };
  }

  const guest = await prisma.eventGuest.findFirst({
    where: { id: guestId, eventId },
    include: {
      contact: true,
      event: { select: { name: true, startDate: true, slug: true } },
    },
  });
  if (!guest) return { error: "Guest not found." };

  const templates = await getEventTemplates(userId, eventId);
  const template = round === "invite" ? templates.inviteTemplate : templates.reminderTemplate;

  const host = (await headers()).get("host") ?? "localhost:3000";
  const link = `http://${host}/e/${guest.event.slug}/${guest.guestToken}`;

  const message = renderMessage(template, {
    name: guest.contact.name,
    event: guest.event.name,
    date: guest.event.startDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    link,
  });

  const templateName = wabaTemplateName(round);
  if (!templateName) return { error: "No WhatsApp template configured." };

  const result = await sendWabaTemplateMessage(
    guest.contact.mobileNormalized,
    templateName,
    wabaTemplateBodyText(round, message),
  );

  if (!result.ok) return { error: `WhatsApp API: ${result.error}` };

  await markSent(userId, eventId, guestId, round);
  return { success: "Sent via WhatsApp Business API." };
}
