"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signOut } from "@/lib/auth";
import { requireUserId } from "@/lib/session";
import { createEvent } from "@/lib/services/events";
import { eventSchema } from "@/lib/validation/schemas";

export type FormState = { error?: string; success?: string } | null;

export async function signOutAction() {
  await signOut({ redirectTo: "/signin" });
}

export async function createEventAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();

  const optional = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  };

  const parsed = eventSchema.safeParse({
    name: optional("name") ?? "",
    type: optional("type") ?? "",
    startDate: optional("startDate") ?? "",
    endDate: optional("endDate"),
    locationName: optional("locationName"),
    city: optional("city"),
    hostName: optional("hostName"),
    contactNumber: optional("contactNumber"),
  });
  if (!parsed.success) {
    return { error: "Please provide an event name, type and start date." };
  }

  const event = await createEvent(userId, parsed.data);
  revalidatePath("/dashboard");
  redirect(`/events/${event.id}`);
}
