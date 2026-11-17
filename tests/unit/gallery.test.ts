import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";

const url = process.env.TEST_DATABASE_URL;
const run = url ? describe : describe.skip;

run("guest photo gallery", () => {
  process.env.DATABASE_URL = url as string;

  const prisma = new PrismaClient({ datasources: { db: { url } } });

  let gallery: typeof import("@/lib/services/gallery");

  let userId = "";
  let otherUserId = "";
  let workspaceId = "";
  let eventId = "";
  let eventSlug = "";
  let guestToken = "";
  let itemId = "";

  beforeAll(async () => {
    gallery = await import("@/lib/services/gallery");

    const suffix = Date.now();
    const user = await prisma.user.create({
      data: { email: `gallery_${suffix}@test.local`, passwordHash: "x", name: "Gallery Test" },
    });
    userId = user.id;

    const other = await prisma.user.create({
      data: { email: `gallery_other_${suffix}@test.local`, passwordHash: "x", name: "Other" },
    });
    otherUserId = other.id;

    const workspace = await prisma.workspace.create({
      data: { ownerId: userId, name: "WS" },
    });
    workspaceId = workspace.id;

    const event = await prisma.event.create({
      data: {
        workspaceId,
        name: "Gallery Event",
        type: "wedding",
        status: "published",
        startDate: new Date("2026-12-10"),
        slug: `gallery-${suffix}`,
      },
    });
    eventId = event.id;
    eventSlug = event.slug;

    const guest = await prisma.eventGuest.create({
      data: {
        eventId,
        contactId: (
          await prisma.contact.create({
            data: {
              workspaceId,
              name: "Photo Guest",
              mobile: "9800000441",
              mobileNormalized: "+919800000441",
            },
          })
        ).id,
        guestToken: `GALLERYTOKEN${suffix}`,
      },
    });
    guestToken = guest.guestToken;
  });

  it("adds a guest photo unapproved", async () => {
    const file = new File(["fake image bytes"], "pic.jpg", { type: "image/jpeg" });
    const item = await gallery.addGuestGalleryItem(eventSlug, guestToken, file);
    itemId = item.id;

    expect(item.approved).toBe(false);
    expect(item.type).toBe("image");
  });

  it("rejects guests that do not exist", async () => {
    const file = new File(["x"], "pic.jpg", { type: "image/jpeg" });
    await expect(
      gallery.addGuestGalleryItem(eventSlug, "WRONGTOKEN", file),
    ).rejects.toThrow();
  });

  it("rejects non-image uploads", async () => {
    const file = new File(["pdf"], "doc.pdf", { type: "application/pdf" });
    await expect(
      gallery.addGuestGalleryItem(eventSlug, guestToken, file),
    ).rejects.toThrow();
  });

  it("rejects uploads for unpublished events", async () => {
    const otherWs = await prisma.workspace.create({
      data: { ownerId: otherUserId, name: "Other WS" },
    });
    const draft = await prisma.event.create({
      data: {
        workspaceId: otherWs.id,
        name: "Draft Event",
        type: "wedding",
        startDate: new Date("2026-12-10"),
        slug: `gallery-draft-${Date.now()}`,
      },
    });
    const draftGuest = await prisma.eventGuest.create({
      data: {
        eventId: draft.id,
        contactId: (
          await prisma.contact.create({
            data: {
              workspaceId: otherWs.id,
              name: "Draft Guest",
              mobile: "9800000442",
              mobileNormalized: "+919800000442",
            },
          })
        ).id,
        guestToken: `DRAFTTOKEN${Date.now()}`,
      },
    });

    const file = new File(["x"], "pic.jpg", { type: "image/jpeg" });
    await expect(
      gallery.addGuestGalleryItem(draft.slug, draftGuest.guestToken, file),
    ).rejects.toThrow();
  });

  it("approved photos appear for guests, unapproved do not", async () => {
    expect((await gallery.listApprovedGallery(eventId)).length).toBe(0);

    await gallery.setGalleryItemApproved(userId, eventId, itemId, true);
    const approved = await gallery.listApprovedGallery(eventId);
    expect(approved.map((i) => i.id)).toEqual([itemId]);
  });

  it("organizer can hide again and ownership is enforced", async () => {
    await gallery.setGalleryItemApproved(userId, eventId, itemId, false);
    expect((await gallery.listApprovedGallery(eventId)).length).toBe(0);

    await expect(
      gallery.setGalleryItemApproved(otherUserId, eventId, itemId, true),
    ).rejects.toThrow();
    await expect(
      gallery.deleteGalleryItem(otherUserId, eventId, itemId),
    ).rejects.toThrow();
  });

  it("organizer listing includes guest names", async () => {
    const rows = await gallery.listGalleryForOrganizer(userId, eventId);
    expect(rows.map((r) => r.guestName)).toEqual(["Photo Guest"]);
  });

  it("organizer can delete a photo", async () => {
    await gallery.deleteGalleryItem(userId, eventId, itemId);
    expect((await gallery.listGalleryForOrganizer(userId, eventId)).length).toBe(0);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
