"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getEventGuestByToken } from "@/lib/services/eventGuests";
import { submitRsvp } from "@/lib/services/rsvp";
import { rsvpSchema } from "@/lib/validation/schemas";

export type RsvpState = { error?: string } | null;

const buckets = new Map<string, { count: number; reset: number }>();

function allow(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

export async function submitRsvpAction(
  _prev: RsvpState,
  formData: FormData,
): Promise<RsvpState> {
  const eventSlug = String(formData.get("eventSlug"));
  const guestToken = String(formData.get("guestToken"));

  const guest = await getEventGuestByToken(eventSlug, guestToken);
  if (!guest) return { error: "Invitation not found." };

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allow(`${ip}:${guestToken}`)) {
    return { error: "Too many attempts. Please try again in a minute." };
  }

  const answers: { questionId: string; answer: string }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("q_") && typeof value === "string") {
      answers.push({ questionId: key.slice(2), answer: value });
    }
  }

  const parsed = rsvpSchema.safeParse({
    status: formData.get("status"),
    adultCount: formData.get("adultCount") ?? 0,
    childCount: formData.get("childCount") ?? 0,
    functions: formData.getAll("functions").map(String),
    accommodationRequired: formData.get("accommodationRequired") === "on" ? true : undefined,
    travelRequired: formData.get("travelRequired") === "on" ? true : undefined,
    dietaryPreference: formData.get("dietaryPreference") || undefined,
    message: formData.get("message") ? String(formData.get("message")) : undefined,
    answers,
  });

  if (!parsed.success) return { error: "Please check your response." };

  await submitRsvp(guest.id, parsed.data);
  redirect(`/e/${eventSlug}/${guestToken}?submitted=1`);
}
