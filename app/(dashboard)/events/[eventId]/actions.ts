"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { addEventGuest } from "@/lib/services/eventGuests";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { guestSchema } from "@/lib/validation/schemas";

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
    if (error instanceof ValidationError) return { error: error.message };
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/events/${eventId}/guests`);
  return { success: "Guest added." };
}
