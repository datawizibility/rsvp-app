import { prisma } from "@/lib/db";
import { getEventForUser } from "./events";

export type QuestionInput = {
  label: string;
  type?: string;
  options?: string[];
};

export async function listQuestions(userId: string, eventId: string) {
  await getEventForUser(userId, eventId);
  return prisma.eventQuestion.findMany({
    where: { eventId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createQuestion(
  userId: string,
  eventId: string,
  input: QuestionInput,
) {
  await getEventForUser(userId, eventId);
  const count = await prisma.eventQuestion.count({ where: { eventId } });

  return prisma.eventQuestion.create({
    data: {
      eventId,
      label: input.label,
      type: input.type ?? "text",
      options: input.options ?? [],
      sortOrder: count,
    },
  });
}

export async function updateQuestion(
  userId: string,
  eventId: string,
  questionId: string,
  input: QuestionInput,
) {
  await getEventForUser(userId, eventId);
  return prisma.eventQuestion.updateMany({
    where: { id: questionId, eventId },
    data: {
      label: input.label,
      type: input.type ?? "text",
      options: input.options ?? [],
    },
  });
}

export async function deleteQuestion(
  userId: string,
  eventId: string,
  questionId: string,
) {
  await getEventForUser(userId, eventId);
  return prisma.eventQuestion.deleteMany({ where: { id: questionId, eventId } });
}
