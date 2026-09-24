import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";

const url = process.env.TEST_DATABASE_URL;
const run = url ? describe : describe.skip;

run("custom RSVP questions", () => {
  process.env.DATABASE_URL = url as string;

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  let questions: typeof import("@/lib/services/questions");

  let userId = "";
  let eventId = "";

  beforeAll(async () => {
    questions = await import("@/lib/services/questions");

    const user = await prisma.user.create({
      data: {
        email: `q_${Date.now()}@test.local`,
        passwordHash: "x",
        name: "Q Test",
      },
    });
    userId = user.id;

    const workspace = await prisma.workspace.create({
      data: { ownerId: userId, name: "WS" },
    });

    const event = await prisma.event.create({
      data: {
        workspaceId: workspace.id,
        name: "Q Event",
        type: "wedding",
        startDate: new Date("2026-12-10"),
        slug: `q-${Date.now()}`,
      },
    });
    eventId = event.id;
  });

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("creates questions in order with options", async () => {
    const first = await questions.createQuestion(userId, eventId, {
      label: "Any song request?",
      type: "text",
    });
    const second = await questions.createQuestion(userId, eventId, {
      label: "Meal preference?",
      type: "select",
      options: ["Veg", "Non-veg"],
    });

    const list = await questions.listQuestions(userId, eventId);
    expect(list.map((q) => q.label)).toEqual([
      "Any song request?",
      "Meal preference?",
    ]);
    expect(list[0].sortOrder).toBe(0);
    expect(list[1].sortOrder).toBe(1);
    expect(list[1].options).toEqual(["Veg", "Non-veg"]);
    expect(first.id).not.toBe(second.id);
  });

  it("updates a question", async () => {
    const list = await questions.listQuestions(userId, eventId);
    const target = list[0];

    await questions.updateQuestion(userId, eventId, target.id, {
      label: "Song request",
      type: "textarea",
      options: [],
    });

    const updated = (await questions.listQuestions(userId, eventId)).find(
      (q) => q.id === target.id,
    );
    expect(updated?.label).toBe("Song request");
    expect(updated?.type).toBe("textarea");
  });

  it("deletes a question", async () => {
    const list = await questions.listQuestions(userId, eventId);
    const target = list[1];

    await questions.deleteQuestion(userId, eventId, target.id);
    const remaining = await questions.listQuestions(userId, eventId);
    expect(remaining.map((q) => q.id)).toEqual([list[0].id]);
  });

  it("enforces ownership", async () => {
    await expect(
      questions.createQuestion("someone-else", eventId, { label: "x" }),
    ).rejects.toThrow();
  });
});
