import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { InvitationRenderer, type InvitationView } from "@/components/invitation-templates/InvitationRenderer";
import { getEventGuestByToken, recordOpen } from "@/lib/services/eventGuests";
import type { InvitationContent, InvitationSections } from "@/lib/services/invitation";

export const dynamic = "force-dynamic";

async function loadGuest(eventSlug: string, guestToken: string) {
  return getEventGuestByToken(eventSlug, guestToken);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventSlug: string; guestToken: string }>;
}): Promise<Metadata> {
  const { eventSlug, guestToken } = await params;
  const guest = await loadGuest(eventSlug, guestToken);
  if (!guest) return { title: "Invitation" };

  const content = guest.event.invitation?.content as unknown as InvitationContent | undefined;
  return {
    title: guest.event.name,
    description: content?.welcome || `You are invited to ${guest.event.name}.`,
    openGraph: {
      title: guest.event.name,
      description: content?.welcome || `You are invited to ${guest.event.name}.`,
      images: guest.event.invitation?.coverImageUrl
        ? [guest.event.invitation.coverImageUrl]
        : undefined,
    },
  };
}

export default async function PublicInvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string; guestToken: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { eventSlug, guestToken } = await params;
  const { submitted } = await searchParams;
  const guest = await loadGuest(eventSlug, guestToken);
  if (!guest) notFound();

  await recordOpen(guest.id);

  const invitation = guest.event.invitation;
  const content = (invitation?.content ?? {}) as unknown as InvitationContent;
  const sections = (invitation?.sections ?? {}) as unknown as InvitationSections;

  const host = (await headers()).get("host") ?? "localhost:3000";
  const rsvpUrl = `http://${host}/e/${eventSlug}/${guestToken}/rsvp`;

  const view: InvitationView = {
    eventName: guest.event.name,
    eventType: guest.event.type,
    startDate: guest.event.startDate,
    endDate: guest.event.endDate,
    city: guest.event.city,
    locationName: guest.event.locationName,
    hostName: guest.event.hostName,
    contactNumber: guest.event.contactNumber,
    content,
    sections,
    functions: guest.event.functions.map((fn) => ({
      id: fn.id,
      name: fn.name,
      date: fn.date,
      startTime: fn.startTime,
      venueName: fn.venueName,
      dressCode: fn.dressCode,
    })),
    media: invitation?.media.map((m) => ({ url: m.url, type: m.type })) ?? [],
    coverImageUrl: invitation?.coverImageUrl ?? guest.event.coverImageUrl,
    guest: { name: guest.contact.name, isVip: guest.isVip },
    rsvpUrl,
  };

  if (invitation && !invitation.published) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-semibold text-slate-900">{guest.event.name}</h1>
        <p className="mt-2 text-sm text-slate-500">
          This invitation isn&apos;t live yet. Please check back soon.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md">
      {submitted === "1" && (
        <div className="bg-green-600 px-4 py-3 text-center text-sm text-white">
          Thank you! Your response has been recorded.
        </div>
      )}
      <InvitationRenderer templateKey={invitation?.templateKey ?? "royal"} view={view} />
    </main>
  );
}
