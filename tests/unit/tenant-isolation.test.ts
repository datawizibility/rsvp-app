import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";

const url = process.env.TEST_DATABASE_URL;
const run = url ? describe : describe.skip;

run("tenant isolation", () => {
  process.env.DATABASE_URL = url as string;
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  let events: typeof import("@/lib/services/events");
  let functions: typeof import("@/lib/services/functions");
  let guests: typeof import("@/lib/services/eventGuests");
  let invitations: typeof import("@/lib/services/invitation");
  let questions: typeof import("@/lib/services/questions");
  let dashboard: typeof import("@/lib/services/dashboard");

  let userA = "";
  let userB = "";
  let workspaceA = "";
  let eventA = "";
  let eventB = "";
  let guestA = "";
  let functionA = "";
  let questionA = "";

  beforeAll(async () => {
    events = await import("@/lib/services/events");
    functions = await import("@/lib/services/functions");
    guests = await import("@/lib/services/eventGuests");
    invitations = await import("@/lib/services/invitation");
    questions = await import("@/lib/services/questions");
    dashboard = await import("@/lib/services/dashboard");

    const stamp = Date.now();

    const a = await prisma.user.create({
      data: { email: `tenant_a_${stamp}@test.local`, passwordHash: "x", name: "A" },
    });
    const b = await prisma.user.create({
      data: { email: `tenant_b_${stamp}@test.local`, passwordHash: "x", name: "B" },
    });
    userA = a.id;
    userB = b.id;

    const wa = await prisma.workspace.create({ data: { ownerId: userA, name: "WS A" } });
    const wb = await prisma.workspace.create({ data: { ownerId: userB, name: "WS B" } });
    workspaceA = wa.id;

    const ea = await prisma.event.create({
      data: {
        workspaceId: wa.id,
        name: "Event A",
        type: "wedding",
        startDate: new Date("2026-12-01"),
        slug: `event-a-${stamp}`,
      },
    });
    const eb = await prisma.event.create({
      data: {
        workspaceId: wb.id,
        name: "Event B",
        type: "corporate",
        startDate: new Date("2026-12-02"),
        slug: `event-b-${stamp}`,
      },
    });
    eventA = ea.id;
    eventB = eb.id;

    const ca = await prisma.contact.create({
      data: {
        workspaceId: wa.id,
        name: "Guest A",
        mobile: "9800000201",
        mobileNormalized: "+919800000201",
      },
    });
    const cb = await prisma.contact.create({
      data: {
        workspaceId: wb.id,
        name: "Guest B",
        mobile: "9800000202",
        mobileNormalized: "+919800000202",
      },
    });

    const ga = await prisma.eventGuest.create({
      data: { eventId: ea.id, contactId: ca.id, guestToken: `GA${stamp}` },
    });
    await prisma.eventGuest.create({
      data: { eventId: eb.id, contactId: cb.id, guestToken: `GB${stamp}` },
    });
    guestA = ga.id;

    const fa = await prisma.eventFunction.create({
      data: { eventId: ea.id, name: "Fn A", date: new Date("2026-12-01") },
    });
    functionA = fa.id;

    const qa = await prisma.eventQuestion.create({
      data: { eventId: ea.id, label: "Q A", type: "text", options: [] },
    });
    questionA = qa.id;
  });

  afterAll(async () => {
    if (userA) await prisma.user.delete({ where: { id: userA } }).catch(() => {});
    if (userB) await prisma.user.delete({ where: { id: userB } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("B cannot read A's event", async () => {
    await expect(events.getEventForUser(userB, eventA)).rejects.toThrow();
    await expect(events.getEventDetail(userB, eventA)).rejects.toThrow();
  });

  it("B's event list excludes A's event", async () => {
    const list = await events.listEventsForUser(userB);
    expect(list.map((e) => e.id)).toEqual([eventB]);
  });

  it("B cannot read A's guests", async () => {
    await expect(guests.listEventGuests(userB, eventA)).rejects.toThrow();
    await expect(guests.getEventGuestDetail(userB, eventA, guestA)).rejects.toThrow();
    expect(await guests.getEventGuestDetail(userB, eventB, guestA)).toBeNull();
  });

  it("B cannot modify A's guests", async () => {
    await expect(
      guests.updateEventGuest(userB, eventA, guestA, {
        name: "hack",
        mobile: "9800000299",
      }),
    ).rejects.toThrow();
    await expect(guests.deleteEventGuest(userB, eventA, guestA)).rejects.toThrow();
  });

  it("B cannot touch A's functions", async () => {
    await expect(
      functions.createFunction(userB, eventA, { name: "x", date: new Date() }),
    ).rejects.toThrow();
    await expect(
      functions.updateFunction(userB, eventA, functionA, { name: "x" }),
    ).rejects.toThrow();
    await expect(
      functions.deleteFunction(userB, eventA, functionA),
    ).rejects.toThrow();
  });

  it("B cannot touch A's invitation", async () => {
    await expect(invitations.getOrCreateInvitation(userB, eventA)).rejects.toThrow();
    await expect(
      invitations.updateInvitation(userB, eventA, {
        templateKey: "royal",
        content: {},
        sections: {},
      }),
    ).rejects.toThrow();
    await expect(invitations.publishInvitation(userB, eventA)).rejects.toThrow();
  });

  it("B cannot touch A's questions", async () => {
    await expect(questions.listQuestions(userB, eventA)).rejects.toThrow();
    await expect(
      questions.createQuestion(userB, eventA, { label: "x" }),
    ).rejects.toThrow();
    await expect(
      questions.updateQuestion(userB, eventA, questionA, { label: "x" }),
    ).rejects.toThrow();
    await expect(
      questions.deleteQuestion(userB, eventA, questionA),
    ).rejects.toThrow();
  });

  it("B cannot read A's metrics and B's summary is scoped", async () => {
    await expect(dashboard.getEventMetrics(userB, eventA)).rejects.toThrow();
    const summary = await dashboard.getWorkspaceSummary(userB);
    expect(summary.events).toBe(1);
    expect(summary.contacts).toBe(1);
  });

  it("A's data is untouched by B's attempts", async () => {
    expect(
      await prisma.eventGuest.findUnique({ where: { id: guestA } }),
    ).not.toBeNull();
    expect(
      await prisma.eventFunction.findUnique({ where: { id: functionA } }),
    ).not.toBeNull();
    expect(
      await prisma.eventQuestion.findUnique({ where: { id: questionA } }),
    ).not.toBeNull();
    const contact = await prisma.contact.findFirst({
      where: { workspaceId: workspaceA, mobileNormalized: "+919800000201" },
    });
    expect(contact?.name).toBe("Guest A");
  });
});
