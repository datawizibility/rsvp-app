import { prisma } from "@/lib/db";
import { getEventForUser } from "./events";

export type FunctionInput = {
  name: string;
  date: Date;
  startTime?: string | null;
  endTime?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  description?: string | null;
  dressCode?: string | null;
  capacity?: number | null;
  rsvpRequired?: boolean;
  sortOrder?: number;
};

export async function listFunctions(userId: string, eventId: string) {
  await getEventForUser(userId, eventId);
  return prisma.eventFunction.findMany({
    where: { eventId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createFunction(
  userId: string,
  eventId: string,
  input: FunctionInput,
) {
  await getEventForUser(userId, eventId);
  const count = await prisma.eventFunction.count({ where: { eventId } });
  return prisma.eventFunction.create({
    data: { eventId, sortOrder: input.sortOrder ?? count, ...input },
  });
}

export async function updateFunction(
  userId: string,
  eventId: string,
  functionId: string,
  input: Partial<FunctionInput>,
) {
  await getEventForUser(userId, eventId);
  return prisma.eventFunction.updateMany({
    where: { id: functionId, eventId },
    data: input,
  });
}

export async function deleteFunction(
  userId: string,
  eventId: string,
  functionId: string,
) {
  await getEventForUser(userId, eventId);
  return prisma.eventFunction.deleteMany({ where: { id: functionId, eventId } });
}
