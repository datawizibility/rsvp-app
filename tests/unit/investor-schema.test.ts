import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";

const url = process.env.TEST_DATABASE_URL;
const run = url ? describe : describe.skip;

run("investor vertical round-trips with zero schema change", () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  let userId = "";

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `investor_${Date.now()}@test.local`,
        passwordHash: "x",
        name: "Investor Test",
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("stores organisation, designation, VIP, custom question and answer", async () => {
    const workspace = await prisma.workspace.create({
      data: { ownerId: userId, name: "Raima Capital" },
    });

    const contact = await prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: "Raj Mehta",
        mobile: "+919800000001",
        mobileNormalized: "+919800000001",
        organisation: "ABC Capital",
        designation: "Managing Director",
      },
    });

    const event = await prisma.event.create({
      data: {
        workspaceId: workspace.id,
        name: "Raima Investor Meet 2026",
        type: "investor",
        startDate: new Date("2026-10-01"),
        slug: `raima-investor-meet-${Date.now()}`,
      },
    });

    const eventGuest = await prisma.eventGuest.create({
      data: {
        eventId: event.id,
        contactId: contact.id,
        isVip: true,
        guestToken: `TOKEN${Date.now()}`,
        eventCustomFields: { investorType: "institutional" },
      },
    });

    const question = await prisma.eventQuestion.create({
      data: {
        eventId: event.id,
        label: "Would you like a management meeting?",
        type: "text",
      },
    });

    const rsvp = await prisma.rsvp.create({
      data: {
        eventId: event.id,
        eventGuestId: eventGuest.id,
        status: "yes",
        adultCount: 1,
      },
    });

    await prisma.rsvpAnswer.create({
      data: { rsvpId: rsvp.id, questionId: question.id, answer: "Yes" },
    });

    const loaded = await prisma.eventGuest.findUnique({
      where: { id: eventGuest.id },
      include: {
        contact: true,
        rsvp: { include: { answers: { include: { question: true } } } },
      },
    });

    expect(loaded?.contact.organisation).toBe("ABC Capital");
    expect(loaded?.contact.designation).toBe("Managing Director");
    expect(loaded?.isVip).toBe(true);
    expect(loaded?.eventCustomFields).toEqual({ investorType: "institutional" });
    expect(loaded?.rsvp?.answers[0].answer).toBe("Yes");
    expect(loaded?.rsvp?.answers[0].question.label).toBe(
      "Would you like a management meeting?",
    );
  });
});
