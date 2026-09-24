import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { getEventForUser } from "./events";

export const DEFAULT_CONTENT = {
  headline: "",
  welcome: "",
  about: "",
  hostMessage: "",
  rsvpMessage: "We would love to have you with us. Please confirm your attendance.",
  venueNote: "",
};

export const DEFAULT_SECTIONS = {
  welcome: true,
  about: true,
  functions: true,
  gallery: true,
  venue: true,
  directions: true,
  dressCode: true,
  accommodation: false,
  travel: false,
  rsvp: true,
  contact: true,
  giftRegistry: false,
  agenda: false,
};

export type InvitationContent = typeof DEFAULT_CONTENT;
export type InvitationSections = typeof DEFAULT_SECTIONS;

export async function getOrCreateInvitation(userId: string, eventId: string) {
  await getEventForUser(userId, eventId);

  const existing = await prisma.invitation.findUnique({
    where: { eventId },
    include: { media: { orderBy: { sortOrder: "asc" } } },
  });
  if (existing) return existing;

  return prisma.invitation.create({
    data: {
      eventId,
      templateKey: "royal",
      content: DEFAULT_CONTENT,
      sections: DEFAULT_SECTIONS,
    },
    include: { media: { orderBy: { sortOrder: "asc" } } },
  });
}

export type InvitationInput = {
  templateKey: string;
  content: Prisma.InputJsonValue;
  sections: Prisma.InputJsonValue;
  coverImageUrl?: string | null;
  media?: { url: string; type: string }[];
};

export async function updateInvitation(
  userId: string,
  eventId: string,
  input: InvitationInput,
) {
  await getEventForUser(userId, eventId);
  const invitation = await getOrCreateInvitation(userId, eventId);

  await prisma.$transaction(async (tx) => {
    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        templateKey: input.templateKey,
        content: input.content,
        sections: input.sections,
        coverImageUrl: input.coverImageUrl ?? null,
      },
    });

    if (input.media) {
      await tx.invitationMedia.deleteMany({ where: { invitationId: invitation.id } });
      if (input.media.length > 0) {
        await tx.invitationMedia.createMany({
          data: input.media.map((m, index) => ({
            invitationId: invitation.id,
            url: m.url,
            type: m.type,
            sortOrder: index,
          })),
        });
      }
    }
  });

  return getOrCreateInvitation(userId, eventId);
}

export async function publishInvitation(userId: string, eventId: string) {
  await getEventForUser(userId, eventId);
  const invitation = await getOrCreateInvitation(userId, eventId);
  if (!invitation) throw new NotFoundError("Invitation not found");

  await prisma.$transaction([
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { published: true, version: { increment: 1 } },
    }),
    prisma.event.update({
      where: { id: eventId },
      data: { status: "published", publishedAt: new Date() },
    }),
  ]);
}
