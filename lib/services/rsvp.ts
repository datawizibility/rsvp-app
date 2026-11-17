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
  travelArrival?: string | null;
  travelDeparture?: string | null;
  travelFlightNumber?: string | null;
  travelTravellers?: number | null;
  travelPickup?: boolean | null;
  travelDrop?: boolean | null;
  travelTicketUrl?: string | null;
  travelNotes?: string | null;
};

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

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
  // Only attendance for functions that actually belong to this event survives…
  const eventFunctions = await prisma.eventFunction.findMany({
    where: { eventId },
    select: { id: true },
  });
  const validFunctions = new Set(eventFunctions.map((fn) => fn.id));

  // …and when the guest has function-level invitations, only invited ones.
  const invitedIds = (
    await prisma.functionInvite.findMany({
      where: { eventGuestId },
      select: { eventFunctionId: true },
    })
  ).map((row) => row.eventFunctionId);
  const invitedSet = invitedIds.length > 0 ? new Set(invitedIds) : null;

  const allowedFunctions = input.functions.filter(
    (id) => validFunctions.has(id) && (!invitedSet || invitedSet.has(id)),
  );

  const normalized: RsvpInput =
    input.status === "yes"
      ? { ...input, functions: allowedFunctions }
      : {
          ...input,
          adultCount: 0,
          childCount: 0,
          functions: [],
          travelArrival: null,
          travelDeparture: null,
          travelFlightNumber: null,
          travelTravellers: null,
          travelPickup: null,
          travelDrop: null,
          travelNotes: null,
        };

  const data = {
    status: normalized.status,
    adultCount: normalized.adultCount,
    childCount: normalized.childCount,
    accommodationRequired: normalized.accommodationRequired ?? null,
    travelRequired: normalized.travelRequired ?? null,
    dietaryPreference: normalized.dietaryPreference ?? null,
    message: normalized.message ?? null,
    respondedAt: new Date(),
    travelArrival: toDate(normalized.travelArrival),
    travelDeparture: toDate(normalized.travelDeparture),
    travelFlightNumber: normalized.travelFlightNumber ?? null,
    travelTravellers: normalized.travelTravellers ?? null,
    travelPickup: normalized.travelPickup ?? null,
    travelDrop: normalized.travelDrop ?? null,
    travelNotes: normalized.travelNotes ?? null,
  };

  return prisma.$transaction(async (tx) => {
    const rsvp = await tx.rsvp.upsert({
      where: { eventGuestId },
      update: {
        ...data,
        // A new ticket upload replaces the stored URL; when no file was sent
        // this submit, the previously uploaded ticket is preserved.
        ...(normalized.travelTicketUrl !== undefined
          ? { travelTicketUrl: normalized.travelTicketUrl }
          : {}),
      },
      create: {
        ...data,
        eventGuestId,
        eventId,
        travelTicketUrl: normalized.travelTicketUrl ?? null,
      },
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
