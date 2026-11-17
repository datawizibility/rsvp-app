import type { DietaryPreference, RsvpStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { getEventForUser } from "./events";

export type RsvpInput = {
  status: RsvpStatus;
  adultCount: number;
  childCount: number;
  functions: string[];
  accommodationRequired?: boolean;
  travelRequired?: boolean;
  dietaryPreference?: DietaryPreference;
  message?: string;
  answers?: { questionId: string; answer: string }[];
};

export async function submitRsvp(eventGuestId: string, input: RsvpInput) {
  const guest = await prisma.eventGuest.findUniqueOrThrow({
    where: { id: eventGuestId },
    select: { eventId: true },
  });

  return applyRsvp(guest.eventId, eventGuestId, input);
}

/**
 * Planner-side RSVP entry ("they confirmed over a call"). Same stored shape as
 * a guest RSVP, but ownership is enforced here, not just in the UI.
 */
export async function recordManualRsvp(
  userId: string,
  eventId: string,
  guestId: string,
  input: Omit<RsvpInput, "answers">,
) {
  await getEventForUser(userId, eventId);

  const guest = await prisma.eventGuest.findFirst({
    where: { id: guestId, eventId },
    select: { id: true, eventId: true },
  });
  if (!guest) throw new NotFoundError("Guest not found");

  return applyRsvp(guest.eventId, guest.id, input);
}

export async function applyRsvp(
  eventId: string,
  eventGuestId: string,
  input: RsvpInput,
) {
  // Only attendance for functions that actually belong to this event survives.
  const validFunctions = new Set(
    (
      await prisma.eventFunction.findMany({
        where: { eventId },
        select: { id: true },
      })
    ).map((fn) => fn.id),
  );
  const allowedFunctions = input.functions.filter((id) => validFunctions.has(id));

  const normalized: RsvpInput =
    input.status === "yes"
      ? { ...input, functions: allowedFunctions }
      : { ...input, adultCount: 0, childCount: 0, functions: [] };

  const data = {
    status: normalized.status,
    adultCount: normalized.adultCount,
    childCount: normalized.childCount,
    accommodationRequired: normalized.accommodationRequired ?? null,
    travelRequired: normalized.travelRequired ?? null,
    dietaryPreference: normalized.dietaryPreference ?? null,
    message: normalized.message ?? null,
    respondedAt: new Date(),
  };

  return prisma.$transaction(async (tx) => {
    const rsvp = await tx.rsvp.upsert({
      where: { eventGuestId },
      update: data,
      create: { ...data, eventGuestId, eventId },
    });

    await tx.rsvpAttendance.deleteMany({ where: { rsvpId: rsvp.id } });
    if (normalized.functions.length > 0) {
      await tx.rsvpAttendance.createMany({
        data: normalized.functions.map((eventFunctionId) => ({
          rsvpId: rsvp.id,
          eventFunctionId,
          attending: true,
        })),
      });
    }

    await tx.rsvpAnswer.deleteMany({ where: { rsvpId: rsvp.id } });
    const answers = (input.answers ?? []).filter((a) => a.answer.trim() !== "");
    if (answers.length > 0) {
      await tx.rsvpAnswer.createMany({
        data: answers.map((a) => ({
          rsvpId: rsvp.id,
          questionId: a.questionId,
          answer: a.answer,
        })),
      });
    }

    return rsvp;
  });
}
