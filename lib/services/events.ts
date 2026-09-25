import type { EventStatus, EventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { slugify } from "@/lib/utils/slug";
import { requireWorkspace } from "./workspaces";

export type EventInput = {
  name: string;
  type: EventType;
  startDate: Date;
  endDate?: Date | null;
  locationName?: string | null;
  city?: string | null;
  coverImageUrl?: string | null;
  hostName?: string | null;
  contactNumber?: string | null;
};

export async function listEventsForUser(userId: string) {
  return prisma.event.findMany({
    where: { workspace: { ownerId: userId } },
    orderBy: { startDate: "asc" },
    include: { _count: { select: { eventGuests: true } } },
  });
}

export async function createEvent(userId: string, input: EventInput) {
  const workspace = await requireWorkspace(userId);

  const existing = new Set(
    (await prisma.event.findMany({ select: { slug: true } })).map((e) => e.slug),
  );
  const slug = slugify(input.name, (s) => existing.has(s));

  return prisma.event.create({
    data: { workspaceId: workspace.id, ...input, slug },
  });
}

export async function getEventForUser(userId: string, eventId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, workspace: { ownerId: userId } },
  });
  if (!event) {
    throw new ForbiddenError("Event does not belong to this user");
  }
  return event;
}

export async function getEventDetail(userId: string, eventId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, workspace: { ownerId: userId } },
    include: {
      functions: { orderBy: { sortOrder: "asc" } },
      invitation: { include: { media: { orderBy: { sortOrder: "asc" } } } },
      questions: { orderBy: { sortOrder: "asc" } },
      groups: true,
    },
  });
  if (!event) throw new NotFoundError("Event not found");
  return event;
}

export async function updateEvent(
  userId: string,
  eventId: string,
  input: Partial<EventInput> & { status?: EventStatus },
) {
  await getEventForUser(userId, eventId);
  return prisma.event.update({ where: { id: eventId }, data: input });
}

export async function setEventStatus(
  userId: string,
  eventId: string,
  status: EventStatus,
) {
  await getEventForUser(userId, eventId);
  const data: Prisma.EventUpdateInput = { status };
  if (status === "published") data.publishedAt = new Date();
  return prisma.event.update({ where: { id: eventId }, data });
}

export async function deleteEvent(userId: string, eventId: string) {
  await getEventForUser(userId, eventId);
  return prisma.event.delete({ where: { id: eventId } });
}
