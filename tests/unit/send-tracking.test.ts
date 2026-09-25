import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";

const url = process.env.TEST_DATABASE_URL;
const run = url ? describe : describe.skip;

run("messaging service", () => {
  process.env.DATABASE_URL = url as string;
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  let messaging: typeof import("@/lib/services/messaging");

  let userId = "";
  let eventId = "";
  let guestInvited = "";
  let guestFresh = "";
  let guestResponded = "";

  beforeAll(async () => {
    messaging = await import("@/lib/services/messaging");

    const stamp = Date.now();
    const user = await prisma.user.create({
      data: { email: `msg_${stamp}@test.local`, passwordHash: "x", name: "Msg" },
    });
    userId = user.id;

    const workspace = await prisma.workspace.create({
      data: { ownerId: userId, name: "WS" },
    });

    const event = await prisma.event.create({
      data: {
        workspaceId: workspace.id,
        name: "Msg Event",
        type: "wedding",
        startDate: new Date("2026-12-10"),
        slug: `msg-${stamp}`,
      },
    });
    eventId = event.id;

    const group = await prisma.guestGroup.create({
      data: { eventId, name: "Friends" },
    });

    const mk = async (
      name: string,
      mobile: string,
      opts: { invited?: boolean; rsvp?: boolean; group?: string } = {},
    ) => {
      const contact = await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          name,
          mobile,
          mobileNormalized: `+91${mobile}`,
        },
      });
      const guest = await prisma.eventGuest.create({
        data: {
          eventId,
          contactId: contact.id,
          guestToken: `T${stamp}${mobile}`,
          groupId: opts.group ?? null,
          lastInvitedAt: opts.invited ? new Date() : null,
        },
      });
      if (opts.rsvp) {
        await prisma.rsvp.create({
          data: { eventId, eventGuestId: guest.id, status: "yes" },
        });
      }
      return guest.id;
    };

    guestInvited = await mk("Invited Guy", "9800000301", {
      invited: true,
      group: group.id,
    });
    guestFresh = await mk("Fresh Guy", "9800000302");
    guestResponded = await mk("Responded Guy", "9800000303", { rsvp: true });
  });

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("returns defaults when no templates are saved", async () => {
    const templates = await messaging.getEventTemplates(userId, eventId);
    expect(templates.inviteTemplate).toContain("{link}");
    expect(templates.reminderTemplate).toContain("{link}");
  });

  it("saves and reads templates", async () => {
    await messaging.saveEventTemplates(userId, eventId, {
      inviteTemplate: "Custom invite {name} {link}",
      reminderTemplate: "Custom reminder {name} {link}",
    });
    const templates = await messaging.getEventTemplates(userId, eventId);
    expect(templates.inviteTemplate).toBe("Custom invite {name} {link}");
    expect(templates.reminderTemplate).toBe("Custom reminder {name} {link}");
  });

  it("marks invite and reminder sent independently", async () => {
    await messaging.markSent(userId, eventId, guestFresh, "invite");
    let guest = await prisma.eventGuest.findUnique({ where: { id: guestFresh } });
    expect(guest?.lastInvitedAt).not.toBeNull();
    expect(guest?.lastRemindedAt).toBeNull();

    await messaging.markSent(userId, eventId, guestFresh, "reminder");
    guest = await prisma.eventGuest.findUnique({ where: { id: guestFresh } });
    expect(guest?.lastRemindedAt).not.toBeNull();
  });

  it("filters not_sent for the round", async () => {
    const rows = await messaging.listRecipients(userId, eventId, "not_sent", "invite");
    const ids = rows.map((r) => r.id);
    expect(ids).not.toContain(guestInvited);
    expect(ids).toContain(guestResponded);
  });

  it("filters non_responders", async () => {
    const rows = await messaging.listRecipients(
      userId,
      eventId,
      "non_responders",
      "invite",
    );
    const ids = rows.map((r) => r.id);
    expect(ids).not.toContain(guestResponded);
    expect(ids).toContain(guestFresh);
  });

  it("enforces ownership", async () => {
    await expect(
      messaging.listRecipients("someone-else", eventId, "all", "invite"),
    ).rejects.toThrow();
    await expect(
      messaging.markSent("someone-else", eventId, guestFresh, "invite"),
    ).rejects.toThrow();
  });
});
