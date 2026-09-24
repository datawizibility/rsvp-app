import { prisma } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { generateGuestToken } from "@/lib/utils/token";
import { normalizeMobile } from "@/lib/utils/phone";
import { upsertContact, type ContactInput } from "./contacts";
import { getEventForUser } from "./events";

export async function ensureGroup(eventId: string, name: string) {
  const trimmed = name.trim();
  return prisma.guestGroup.upsert({
    where: { eventId_name: { eventId, name: trimmed } },
    update: {},
    create: { eventId, name: trimmed },
  });
}

export type AddGuestOptions = {
  groupId?: string | null;
  groupName?: string | null;
  isVip?: boolean;
  partySize?: number;
};

export async function addEventGuest(
  userId: string,
  eventId: string,
  contactData: ContactInput,
  opts: AddGuestOptions = {},
) {
  const event = await getEventForUser(userId, eventId);
  const contact = await upsertContact(event.workspaceId, contactData);

  const existing = await prisma.eventGuest.findUnique({
    where: { eventId_contactId: { eventId, contactId: contact.id } },
  });
  if (existing) return existing;

  let groupId = opts.groupId ?? null;
  if (!groupId && opts.groupName?.trim()) {
    groupId = (await ensureGroup(eventId, opts.groupName)).id;
  }

  return prisma.eventGuest.create({
    data: {
      eventId,
      contactId: contact.id,
      groupId,
      isVip: opts.isVip ?? false,
      partySize: opts.partySize ?? 1,
      guestToken: generateGuestToken(),
    },
  });
}

export async function listEventGuests(userId: string, eventId: string) {
  await getEventForUser(userId, eventId);
  return prisma.eventGuest.findMany({
    where: { eventId },
    include: {
      contact: true,
      group: true,
      rsvp: { include: { attendance: { include: { eventFunction: true } } } },
    },
    orderBy: { contact: { name: "asc" } },
  });
}

export async function getEventGuestDetail(
  userId: string,
  eventId: string,
  guestId: string,
) {
  await getEventForUser(userId, eventId);
  return prisma.eventGuest.findFirst({
    where: { id: guestId, eventId },
    include: {
      contact: true,
      group: true,
      rsvp: {
        include: { attendance: { include: { eventFunction: true } }, answers: true },
      },
    },
  });
}

export async function getEventGuestByToken(eventSlug: string, guestToken: string) {
  return prisma.eventGuest.findFirst({
    where: { guestToken, event: { slug: eventSlug } },
    include: {
      contact: true,
      group: true,
      rsvp: { include: { attendance: true, answers: true } },
      event: {
        include: {
          functions: { orderBy: { sortOrder: "asc" } },
          invitation: { include: { media: { orderBy: { sortOrder: "asc" } } } },
          questions: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
}

export type UpdateGuestInput = {
  name: string;
  mobile: string;
  email?: string | null;
  organisation?: string | null;
  designation?: string | null;
  city?: string | null;
  groupName?: string | null;
  isVip?: boolean;
  partySize?: number;
};

export async function updateEventGuest(
  userId: string,
  eventId: string,
  guestId: string,
  input: UpdateGuestInput,
) {
  const event = await getEventForUser(userId, eventId);

  const guest = await prisma.eventGuest.findFirst({
    where: { id: guestId, eventId },
  });
  if (!guest) throw new NotFoundError("Guest not found");

  const mobileNormalized = normalizeMobile(input.mobile);
  if (!mobileNormalized) {
    throw new ValidationError("Invalid mobile number");
  }

  const clash = await prisma.contact.findFirst({
    where: {
      workspaceId: event.workspaceId,
      mobileNormalized,
      NOT: { id: guest.contactId },
    },
    select: { id: true },
  });
  if (clash) {
    throw new ValidationError("Another guest already uses that mobile number");
  }

  let groupId = guest.groupId;
  if (input.groupName !== undefined) {
    groupId =
      input.groupName && input.groupName.trim()
        ? (await ensureGroup(eventId, input.groupName)).id
        : null;
  }

  await prisma.$transaction([
    prisma.contact.update({
      where: { id: guest.contactId },
      data: {
        name: input.name,
        mobile: input.mobile,
        mobileNormalized,
        email: input.email ?? null,
        organisation: input.organisation ?? null,
        designation: input.designation ?? null,
        city: input.city ?? null,
      },
    }),
    prisma.eventGuest.update({
      where: { id: guestId },
      data: {
        groupId,
        isVip: input.isVip ?? guest.isVip,
        partySize: input.partySize ?? guest.partySize,
      },
    }),
  ]);
}

export async function deleteEventGuest(
  userId: string,
  eventId: string,
  guestId: string,
) {
  await getEventForUser(userId, eventId);
  await prisma.eventGuest.deleteMany({ where: { id: guestId, eventId } });
}

export async function recordOpen(eventGuestId: string) {
  const guest = await prisma.eventGuest.findUnique({
    where: { id: eventGuestId },
    select: { firstOpenedAt: true },
  });
  if (!guest) return;

  await prisma.eventGuest.update({
    where: { id: eventGuestId },
    data: {
      openCount: { increment: 1 },
      ...(guest.firstOpenedAt ? {} : { firstOpenedAt: new Date() }),
    },
  });
}
