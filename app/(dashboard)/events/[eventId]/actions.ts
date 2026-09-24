"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { setEventStatus } from "@/lib/services/events";
import { createFunction, deleteFunction } from "@/lib/services/functions";
import { addEventGuest } from "@/lib/services/eventGuests";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { eventStatusSchema, functionSchema, guestSchema } from "@/lib/validation/schemas";

export type FormState = { error?: string; success?: string } | null;

function field(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export async function addGuestAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const eventId = String(formData.get("eventId"));

  const parsed = guestSchema.safeParse({
    name: field(formData, "name") ?? "",
    mobile: field(formData, "mobile") ?? "",
    email: field(formData, "email"),
    organisation: field(formData, "organisation"),
    designation: field(formData, "designation"),
    city: field(formData, "city"),
    isVip: formData.get("isVip") === "on",
    partySize: field(formData, "partySize") ?? 1,
  });
  if (!parsed.success) {
    return { error: "Please check the guest name and mobile number." };
  }

  try {
    await addEventGuest(
      userId,
      eventId,
      {
        name: parsed.data.name,
        mobile: parsed.data.mobile,
        email: parsed.data.email,
        organisation: parsed.data.organisation,
        designation: parsed.data.designation,
        city: parsed.data.city,
      },
      {
        groupName: field(formData, "groupName"),
        isVip: parsed.data.isVip,
        partySize: parsed.data.partySize,
      },
    );
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ForbiddenError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/events/${eventId}/guests`);
  return { success: "Guest added." };
}

export async function createFunctionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const eventId = String(formData.get("eventId"));

  const parsed = functionSchema.safeParse({
    name: field(formData, "name") ?? "",
    date: field(formData, "date") ?? "",
    startTime: field(formData, "startTime"),
    endTime: field(formData, "endTime"),
    venueName: field(formData, "venueName"),
    venueAddress: field(formData, "venueAddress"),
    description: field(formData, "description"),
    dressCode: field(formData, "dressCode"),
    capacity: field(formData, "capacity"),
    rsvpRequired: formData.get("rsvpRequired") === "on",
  });
  if (!parsed.success) {
    return { error: "Please provide a function name and date." };
  }

  try {
    await createFunction(userId, eventId, parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/events/${eventId}/functions`);
  revalidatePath(`/events/${eventId}`);
  return { success: "Function added." };
}

export async function deleteFunctionAction(formData: FormData) {
  const userId = await requireUserId();
  const eventId = String(formData.get("eventId"));
  const functionId = String(formData.get("functionId"));
  await deleteFunction(userId, eventId, functionId);
  revalidatePath(`/events/${eventId}/functions`);
  revalidatePath(`/events/${eventId}`);
}

export async function setEventStatusAction(formData: FormData) {
  const userId = await requireUserId();
  const eventId = String(formData.get("eventId"));
  const status = eventStatusSchema.parse(formData.get("status"));
  await setEventStatus(userId, eventId, status);
  revalidatePath(`/events/${eventId}`);
}
