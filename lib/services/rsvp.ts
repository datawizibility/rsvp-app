import type { DietaryPreference, RsvpStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

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

  const normalized: RsvpInput =
    input.status === "yes"
      ? input
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
      create: { ...data, eventGuestId, eventId: guest.eventId },
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
