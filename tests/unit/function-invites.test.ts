import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";

const url = process.env.TEST_DATABASE_URL;
const run = url ? describe : describe.skip;

run("per-guest function invitations", () => {
  process.env.DATABASE_URL = url as string;

  const prisma = new PrismaClient({ datasources: { db: { url } } });

  let rsvpService: typeof import("@/lib/services/rsvp");
  let guestsService: typeof import("@/lib/services/eventGuests");

  let userId = "";
  let workspaceId = "";
  let eventId = "";
  let guestId = "";
  let fnA = "";
  let fnB = "";

  beforeAll(async () => {
    rsvpService = await import("@/lib/services/rsvp");
    guestsService = await import("@/lib/services/eventGuests");

    const suffix = Date.now();
    const user = await prisma.user.create({
      data: { email: `invites_${suffix}@test.local`, passwordHash: "x", name: "Invites Test" },
    });
    userId = user.id;

    const workspace = await prisma.workspace.create({
      data: { ownerId: userId, name: "WS" },
    });
    workspaceId = workspace.id;

    const event = await prisma.event.create({
      data: {
        workspaceId,
        name: "Invites Event",
        type: "wedding",
        startDate: new Date("2026-12-10"),
        slug: `invites-${suffix}`,
      },
    });
    eventId = event.id;

    const a = await prisma.eventFunction.create({
      data: { eventId, name: "Mehendi", date: new Date("2026-12-10") },
    });
    fnA = a.id;
    const b = await prisma.eventFunction.create({
      data: { eventId, name: "Reception", date: new Date("2026-12-12") },
    });
    fnB = b.id;

    const guest = await guestsService.addEventGuest(userId, eventId, {
      name: "Subset Guest",
      mobile: "9800000331",
    });
    guestId = guest.id;
  });

  it("guests with no invite rows may RSVP to every function", async () => {
    const rsvp = await rsvpService.recordManualRsvp(userId, eventId, guestId, {
      status: "yes",
      adultCount: 1,
      childCount: 0,
      functions: [fnA, fnB],
    });
    const attendance = await prisma.rsvpAttendance.findMany({
      where: { rsvpId: rsvp.id },
    });
    expect(attendance.length).toBe(2);
  });

  it("restricting a guest drops RSVP rows for uninvited functions", async () => {
    await guestsService.setGuestFunctionInvites(userId, eventId, guestId, [fnB]);

    const rsvp = await rsvpService.recordManualRsvp(userId, eventId, guestId, {
      status: "yes",
      adultCount: 1,
      childCount: 0,
      functions: [fnA, fnB],
    });
    const attendance = await prisma.rsvpAttendance.findMany({
      where: { rsvpId: rsvp.id },
    });
    expect(attendance.map((a) => a.eventFunctionId)).toEqual([fnB]);
  });

  it("visibleFunctions filters to the invited subset", () => {
    expect(
      guestsService.visibleFunctions({
        functionIds: [fnA, fnB],
        invitedFunctionIds: [fnB],
      }),
    ).toEqual([fnB]);

    expect(
      guestsService.visibleFunctions({
        functionIds: [fnA, fnB],
        invitedFunctionIds: [],
      }),
    ).toEqual([fnA, fnB]);
  });

  it("removing all invite rows restores access to every function", async () => {
    await guestsService.setGuestFunctionInvites(userId, eventId, guestId, []);

    const rsvp = await rsvpService.recordManualRsvp(userId, eventId, guestId, {
      status: "yes",
      adultCount: 1,
      childCount: 0,
      functions: [fnA, fnB],
    });
    const attendance = await prisma.rsvpAttendance.findMany({
      where: { rsvpId: rsvp.id },
    });
    expect(attendance.length).toBe(2);
  });

  it("ignores function ids that belong to other events", async () => {
    const otherEvent = await prisma.event.create({
      data: {
        workspaceId,
        name: "Other Event",
        type: "wedding",
        startDate: new Date("2026-12-10"),
        slug: `invites-other-${Date.now()}`,
      },
    });
    const otherFn = await prisma.eventFunction.create({
      data: { eventId: otherEvent.id, name: "Foreign", date: new Date("2026-12-10") },
    });

    await guestsService.setGuestFunctionInvites(userId, eventId, guestId, [fnA, otherFn.id]);

    const invites = await prisma.functionInvite.findMany({
      where: { eventGuestId: guestId },
    });
    expect(invites.map((i) => i.eventFunctionId)).toEqual([fnA]);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
