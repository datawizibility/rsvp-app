import { prisma } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { getEventForUser } from "./events";

export const MAX_GALLERY_BYTES = 4 * 1024 * 1024;

/**
 * Guests upload from their personal link; everything lands unapproved.
 * Uploads are only accepted while the invitation is published.
 */
export async function addGuestGalleryItem(
  eventSlug: string,
  guestToken: string,
  file: File,
) {
  const guest = await prisma.eventGuest.findFirst({
    where: { guestToken, event: { slug: eventSlug } },
    select: { id: true, eventId: true, event: { select: { status: true } } },
  });
  if (!guest) throw new NotFoundError("Invitation not found");
  if (guest.event.status !== "published") {
    throw new ValidationError("This invitation is not live yet.");
  }
  if (!file.type.startsWith("image/")) {
    throw new ValidationError("Only photos (images) can be shared.");
  }
  if (file.size > MAX_GALLERY_BYTES) {
    throw new ValidationError("Photo must be under 4 MB.");
  }

  const { saveUpload } = await import("@/lib/storage/media");
  const url = await saveUpload(file);

  return prisma.galleryItem.create({
    data: {
      eventId: guest.eventId,
      eventGuestId: guest.id,
      url,
      type: "image",
      approved: false,
    },
  });
}

export async function listApprovedGallery(eventId: string) {
  return prisma.galleryItem.findMany({
    where: { eventId, approved: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
}

export type GalleryRow = {
  id: string;
  url: string;
  approved: boolean;
  createdAt: Date;
  guestName: string | null;
};

export async function listGalleryForOrganizer(
  userId: string,
  eventId: string,
): Promise<GalleryRow[]> {
  await getEventForUser(userId, eventId);
  const items = await prisma.galleryItem.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    include: { eventGuest: { include: { contact: true } } },
  });
  return items.map((item) => ({
    id: item.id,
    url: item.url,
    approved: item.approved,
    createdAt: item.createdAt,
    guestName: item.eventGuest?.contact.name ?? null,
  }));
}

async function getOwnedItem(userId: string, eventId: string, itemId: string) {
  await getEventForUser(userId, eventId);
  const item = await prisma.galleryItem.findFirst({
    where: { id: itemId, eventId },
    select: { id: true },
  });
  if (!item) throw new NotFoundError("Photo not found");
}

export async function setGalleryItemApproved(
  userId: string,
  eventId: string,
  itemId: string,
  approved: boolean,
) {
  await getOwnedItem(userId, eventId, itemId);
  await prisma.galleryItem.update({
    where: { id: itemId },
    data: { approved },
  });
}

export async function deleteGalleryItem(
  userId: string,
  eventId: string,
  itemId: string,
) {
  await getOwnedItem(userId, eventId, itemId);
  await prisma.galleryItem.deleteMany({ where: { id: itemId, eventId } });
}
