import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";

const url = process.env.TEST_DATABASE_URL;
const run = url ? describe : describe.skip;

run("guest edit/delete and function edit", () => {
  // Point the shared Prisma singleton at the test database before importing services.
  process.env.DATABASE_URL = url as string;

  const prisma = new PrismaClient({ datasources: { db: { url } } });

  let guests: typeof import("@/lib/services/eventGuests");
  let functions: typeof import("@/lib/services/functions");

  let userId = "";
  let workspaceId = "";
  let eventId = "";
  let guestId = "";
  let contactId = "";
  let functionId = "";

  beforeAll(async () => {
    guests = await import("@/lib/services/eventGuests");
    functions = await import("@/lib/services/functions");

    const user = await prisma.user.create({
      data: {
        email: `edit_${Date.now()}@test.local`,
        passwordHash: "x",
        name: "Edit Test",
      },
    });
    userId = user.id;

    const workspace = await prisma.workspace.create({
      data: { ownerId: userId, name: "WS" },
    });
    workspaceId = workspace.id;

    const event = await prisma.event.create({
      data: {
        workspaceId,
        name: "Edit Event",
        type: "wedding",
        startDate: new Date("2026-12-10"),
        slug: `edit-${Date.now()}`,
      },
    });
    eventId = event.id;

    const contact = await prisma.contact.create({
      data: {
        workspaceId,
        name: "Old Name",
        mobile: "9800000101",
        mobileNormalized: "+919800000101",
      },
    });
    contactId = contact.id;

    const guest = await prisma.eventGuest.create({
      data: { eventId, contactId: contact.id, guestToken: `T${Date.now()}` },
    });
    guestId = guest.id;

    const fn = await prisma.eventFunction.create({
      data: { eventId, name: "Old Function", date: new Date("2026-12-10") },
    });
    functionId = fn.id;

    await prisma.contact.create({
      data: {
        workspaceId,
        name: "Other Person",
        mobile: "9800000102",
        mobileNormalized: "+919800000102",
      },
    });
  });

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("updates contact and event-guest fields", async () => {
    await guests.updateEventGuest(userId, eventId, guestId, {
      name: "New Name",
      mobile: "9800000199",
      isVip: true,
      partySize: 3,
      groupName: "VIP",
    });

    const guest = await prisma.eventGuest.findUnique({
      where: { id: guestId },
      include: { contact: true, group: true },
    });
    expect(guest?.contact.name).toBe("New Name");
    expect(guest?.contact.mobileNormalized).toBe("+919800000199");
    expect(guest?.isVip).toBe(true);
    expect(guest?.partySize).toBe(3);
    expect(guest?.group?.name).toBe("VIP");
  });

  it("rejects a mobile number already used by another contact", async () => {
    await expect(
      guests.updateEventGuest(userId, eventId, guestId, {
        name: "New Name",
        mobile: "9800000102",
      }),
    ).rejects.toThrow(/mobile/i);
  });

  it("deletes the event guest but keeps the contact", async () => {
    await guests.deleteEventGuest(userId, eventId, guestId);
    expect(
      await prisma.eventGuest.findUnique({ where: { id: guestId } }),
    ).toBeNull();
    expect(
      await prisma.contact.findUnique({ where: { id: contactId } }),
    ).not.toBeNull();
  });

  it("updates a function", async () => {
    await functions.updateFunction(userId, eventId, functionId, {
      name: "New Function",
      venueName: "Grand Hall",
    });
    const fn = await prisma.eventFunction.findUnique({
      where: { id: functionId },
    });
    expect(fn?.name).toBe("New Function");
    expect(fn?.venueName).toBe("Grand Hall");
  });
});
