"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/session";
import { setEventStatus } from "@/lib/services/events";
import {
  createFunction,
  deleteFunction,
  updateFunction,
} from "@/lib/services/functions";
import {
  addEventGuest,
  deleteEventGuest,
  updateEventGuest,
} from "@/lib/services/eventGuests";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  createQuestion,
  deleteQuestion,
  updateQuestion,
} from "@/lib/services/questions";
import { parseOptionsText } from "@/lib/utils/options";
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

export async function updateGuestAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const eventId = String(formData.get("eventId"));
  const guestId = String(formData.get("guestId"));

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
    await updateEventGuest(userId, eventId, guestId, {
      name: parsed.data.name,
      mobile: parsed.data.mobile,
      email: parsed.data.email,
      organisation: parsed.data.organisation,
      designation: parsed.data.designation,
      city: parsed.data.city,
      groupName: field(formData, "groupName"),
      isVip: parsed.data.isVip,
      partySize: parsed.data.partySize,
    });
  } catch (error) {
    if (
      error instanceof ValidationError ||
      error instanceof ForbiddenError ||
      error instanceof NotFoundError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/events/${eventId}/guests`);
  revalidatePath(`/events/${eventId}/guests/${guestId}`);
  return { success: "Guest updated." };
}

export async function deleteGuestAction(formData: FormData) {
  const userId = await requireUserId();
  const eventId = String(formData.get("eventId"));
  const guestId = String(formData.get("guestId"));
  await deleteEventGuest(userId, eventId, guestId);
  revalidatePath(`/events/${eventId}/guests`);
  redirect(`/events/${eventId}/guests`);
}

export async function updateFunctionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const eventId = String(formData.get("eventId"));
  const functionId = String(formData.get("functionId"));

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
    await updateFunction(userId, eventId, functionId, parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/events/${eventId}/functions`);
  revalidatePath(`/events/${eventId}`);
  return { success: "Function updated." };
}

export async function createQuestionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const eventId = String(formData.get("eventId"));
  const label = field(formData, "label");
  if (!label) return { error: "Please enter a question." };

  try {
    await createQuestion(userId, eventId, {
      label,
      type: field(formData, "type") ?? "text",
      options: parseOptionsText(String(formData.get("options") ?? "")),
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/events/${eventId}/questions`);
  return { success: "Question added." };
}

export async function updateQuestionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const eventId = String(formData.get("eventId"));
  const questionId = String(formData.get("questionId"));
  const label = field(formData, "label");
  if (!label) return { error: "Please enter a question." };

  try {
    await updateQuestion(userId, eventId, questionId, {
      label,
      type: field(formData, "type") ?? "text",
      options: parseOptionsText(String(formData.get("options") ?? "")),
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/events/${eventId}/questions`);
  return { success: "Question updated." };
}

export async function deleteQuestionAction(formData: FormData) {
  const userId = await requireUserId();
  const eventId = String(formData.get("eventId"));
  const questionId = String(formData.get("questionId"));
  await deleteQuestion(userId, eventId, questionId);
  revalidatePath(`/events/${eventId}/questions`);
}
