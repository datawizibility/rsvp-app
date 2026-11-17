import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";

const url = process.env.TEST_DATABASE_URL;
const run = url ? describe : describe.skip;

run("manual RSVP recording (organiser override)", () => {
  process.env.DATABASE_URL = url as string;

  const prisma = new PrismaClient({ datasources: { db: { url } } });

  let rsvpService: typeof import("@/lib/services/rsvp");
  let guestsService: typeof import("@/lib/services/eventGuests");

  let userId = "";
  let otherUserId = "";
  let workspaceId = "";
  let eventId = "";
  let guestId = "";
  let functionAId = "";
  let functionBId = "";
  let otherEventGuestId = "";

  beforeAll(async () => {
    rsvpService = await import("@/lib/services/rsvp");
    guestsService = await import("@/lib/services/eventGuests");

    const suffix = Date.now();
    const user = await prisma.user.create({
      data: { email: `manual_${suffix}@test.local`, passwordHash: "x", name: "Manual Test" },
    });
    userId = user.id;

    const other = await prisma.user.create({
      data: { email: `manual_other_${suffix}@test.local`, passwordHash: "x", name: "Other" },
    });
    otherUserId = other.id;

    const workspace = await prisma.workspace.create({
      data: { ownerId: userId, name: "WS" },
    });
    workspaceId = workspace.id;

    const event = await prisma.event.create({
      data: {
        workspaceId,
        name: "Manual Event",
        type: "wedding",
        startDate: new Date("2026-12-10"),
        slug: `manual-${suffix}`,
      },
    });
    eventId = event.id;

    const fnA = await prisma.eventFunction.create({
      data: { eventId, name: "Mehendi", date: new Date("2026-12-10") },
    });
    functionAId = fnA.id;
    const fnB = await prisma.eventFunction.create({
      data: { eventId, name: "Reception", date: new Date("2026-12-12") },
    });
    functionBId = fnB.id;

    const guest = await guestsService.addEventGuest(userId, eventId, {
      name: "Phone Caller",
      mobile: "9800000221",
    });
    guestId = guest.id;

    // A guest in another user's event, used for ownership tests.
    const otherWorkspace = await prisma.workspace.create({
      data: { ownerId: otherUserId, name: "Other WS" },
    });
    const otherEvent = await prisma.event.create({
      data: {
        workspaceId: otherWorkspace.id,
        name: "Other Event",
        type: "wedding",
        startDate: new Date("2026-12-10"),
        slug: `manual-other-${suffix}`,
      },
    });
    const otherGuest = await guestsService.addEventGuest(
      otherUserId,
      otherEvent.id,
      { name: "Other Guest", mobile: "9800000222" },
    );
    otherEventGuestId = otherGuest.id;
  });

  it("records a yes RSVP with headcounts and function attendance", async () => {
    const rsvp = await rsvpService.recordManualRsvp(userId, eventId, guestId, {
      status: "yes",
      adultCount: 2,
      childCount: 1,
      functions: [functionAId, functionBId],
      dietaryPreference: "veg",
      accommodationRequired: true,
      message: "Confirmed over call",
    });

    expect(rsvp.status).toBe("yes");
    expect(rsvp.adultCount).toBe(2);
    expect(rsvp.childCount).toBe(1);
    expect(rsvp.message).toBe("Confirmed over call");

    const attendance = await prisma.rsvpAttendance.findMany({
      where: { rsvpId: rsvp.id },
    });
    expect(attendance.map((a) => a.eventFunctionId).sort()).toEqual(
      [functionAId, functionBId].sort(),
    );
  });

  it("re-record updates the same RSVP instead of duplicating", async () => {
    const rsvp = await rsvpService.recordManualRsvp(userId, eventId, guestId, {
      status: "maybe",
      adultCount: 0,
      childCount: 0,
      functions: [],
    });

    expect(rsvp.status).toBe("maybe");

    const all = await prisma.rsvp.findMany({ where: { eventGuestId: guestId } });
    expect(all.length).toBe(1);
  });

  it("zeroes headcounts when status is not yes", async () => {
    const rsvp = await rsvpService.recordManualRsvp(userId, eventId, guestId, {
      status: "no",
      adultCount: 4,
      childCount: 2,
      functions: [functionAId],
    });

    expect(rsvp.status).toBe("no");
    expect(rsvp.adultCount).toBe(0);
    expect(rsvp.childCount).toBe(0);

    const attendance = await prisma.rsvpAttendance.findMany({
      where: { rsvpId: rsvp.id },
    });
    expect(attendance.length).toBe(0);
  });

  it("drops attendance rows pointing at functions outside this event", async () => {
    const rsvp = await rsvpService.recordManualRsvp(userId, eventId, guestId, {
      status: "yes",
      adultCount: 1,
      childCount: 0,
      functions: [functionAId, "made-up-function-id"],
    });

    const attendance = await prisma.rsvpAttendance.findMany({
      where: { rsvpId: rsvp.id },
    });
    expect(attendance.map((a) => a.eventFunctionId)).toEqual([functionAId]);
  });

  it("stores travel details and clears them when the guest declines", async () => {
    const rsvp = await rsvpService.recordManualRsvp(userId, eventId, guestId, {
      status: "yes",
      adultCount: 2,
      childCount: 0,
      functions: [],
      travelRequired: true,
      travelArrival: "2026-12-10T08:30",
      travelDeparture: "2026-12-12T20:00",
      travelFlightNumber: "6E 234",
      travelTravellers: 3,
      travelPickup: true,
      travelDrop: true,
      travelNotes: "Arriving at NSCBI airport",
    });

    expect(rsvp.travelArrival).toBeInstanceOf(Date);
    expect(rsvp.travelFlightNumber).toBe("6E 234");
    expect(rsvp.travelTravellers).toBe(3);
    expect(rsvp.travelPickup).toBe(true);
    expect(rsvp.travelDrop).toBe(true);

    const declined = await rsvpService.recordManualRsvp(userId, eventId, guestId, {
      status: "no",
      adultCount: 2,
      childCount: 0,
      functions: [],
      travelArrival: "2026-12-10T08:30",
    });

    expect(declined.travelArrival).toBeNull();
    expect(declined.travelFlightNumber).toBeNull();
    expect(declined.travelPickup).toBeNull();
  });

  it("rejects a guest from another organiser's event", async () => {
    await expect(
      rsvpService.recordManualRsvp(userId, eventId, otherEventGuestId, {
        status: "yes",
        adultCount: 1,
        childCount: 0,
        functions: [],
      }),
    ).rejects.toThrow();

    const rsvp = await prisma.rsvp.findUnique({
      where: { eventGuestId: otherEventGuestId },
    });
    expect(rsvp).toBeNull();
  });

  it("rejects an unknown guest id", async () => {
    await expect(
      rsvpService.recordManualRsvp(userId, eventId, "missing-guest-id", {
        status: "yes",
        adultCount: 1,
        childCount: 0,
        functions: [],
      }),
    ).rejects.toThrow();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
