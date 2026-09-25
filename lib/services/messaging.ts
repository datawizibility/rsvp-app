import { prisma } from "@/lib/db";
import {
  DEFAULT_INVITE_TEMPLATE,
  DEFAULT_REMINDER_TEMPLATE,
} from "@/lib/messaging/templates";
import { getEventForUser } from "./events";
import { matchesFilter, type RecipientFilter } from "./recipientFilter";

export type Round = "invite" | "reminder";

export type GuestRow = {
  id: string;
  name: string;
  mobileNormalized: string;
  groupId: string | null;
  groupName: string | null;
  lastInvitedAt: Date | null;
  lastRemindedAt: Date | null;
  rsvpStatus: "yes" | "maybe" | "no" | null;
  firstOpenedAt: Date | null;
};

export async function getEventTemplates(userId: string, eventId: string) {
  const event = await getEventForUser(userId, eventId);
  return {
    inviteTemplate: event.inviteTemplate ?? DEFAULT_INVITE_TEMPLATE,
    reminderTemplate: event.reminderTemplate ?? DEFAULT_REMINDER_TEMPLATE,
  };
}

export async function saveEventTemplates(
  userId: string,
  eventId: string,
  input: { inviteTemplate: string; reminderTemplate: string },
) {
  await getEventForUser(userId, eventId);
  await prisma.event.update({
    where: { id: eventId },
    data: {
      inviteTemplate: input.inviteTemplate,
      reminderTemplate: input.reminderTemplate,
    },
  });
}

export async function markSent(
  userId: string,
  eventId: string,
  guestId: string,
  round: Round,
) {
  await getEventForUser(userId, eventId);
  await prisma.eventGuest.updateMany({
    where: { id: guestId, eventId },
    data:
      round === "invite"
        ? { lastInvitedAt: new Date() }
        : { lastRemindedAt: new Date() },
  });
}

export async function listRecipients(
  userId: string,
  eventId: string,
  filter: RecipientFilter,
  round: Round,
  groupId?: string | null,
): Promise<GuestRow[]> {
  await getEventForUser(userId, eventId);

  const guests = await prisma.eventGuest.findMany({
    where: { eventId },
    include: { contact: true, group: true, rsvp: true },
    orderBy: { contact: { name: "asc" } },
  });

  return guests
    .map<GuestRow>((guest) => ({
      id: guest.id,
      name: guest.contact.name,
      mobileNormalized: guest.contact.mobileNormalized,
      groupId: guest.groupId,
      groupName: guest.group?.name ?? null,
      lastInvitedAt: guest.lastInvitedAt,
      lastRemindedAt: guest.lastRemindedAt,
      rsvpStatus: guest.rsvp?.status ?? null,
      firstOpenedAt: guest.firstOpenedAt,
    }))
    .filter((row) =>
      matchesFilter(
        {
          groupId: row.groupId,
          lastSentAtForRound:
            round === "invite" ? row.lastInvitedAt : row.lastRemindedAt,
          rsvpStatus: row.rsvpStatus,
          firstOpenedAt: row.firstOpenedAt,
        },
        filter,
        groupId,
      ),
    );
}
