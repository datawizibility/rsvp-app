import Link from "next/link";
import { headers } from "next/headers";
import { requireUserId } from "@/lib/session";
import { getEventDetail } from "@/lib/services/events";
import { getOrCreateInvitation } from "@/lib/services/invitation";
import type { InvitationContent, InvitationSections } from "@/lib/services/invitation";
import { InvitationEditor } from "./InvitationEditor";

export const dynamic = "force-dynamic";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const userId = await requireUserId();
  const event = await getEventDetail(userId, eventId);
  const invitation = await getOrCreateInvitation(userId, eventId);

  const host = (await headers()).get("host") ?? "localhost:3000";
  const origin = `http://${host}`;

  return (
    <div className="space-y-6">
      <Link href={`/events/${eventId}`} className="text-sm text-slate-500 underline">
        ← Back to event
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900">Invitation</h1>

      <InvitationEditor
        eventId={eventId}
        eventSlug={event.slug}
        origin={origin}
        published={invitation.published}
        initial={{
          templateKey: invitation.templateKey,
          content: invitation.content as unknown as InvitationContent,
          sections: invitation.sections as unknown as InvitationSections,
          coverImageUrl: invitation.coverImageUrl,
          media: invitation.media.map((m) => ({ url: m.url, type: m.type })),
        }}
        eventView={{
          eventName: event.name,
          eventType: event.type,
          startDate: event.startDate,
          endDate: event.endDate,
          city: event.city,
          locationName: event.locationName,
          hostName: event.hostName,
          contactNumber: event.contactNumber,
          functions: event.functions.map((fn) => ({
            id: fn.id,
            name: fn.name,
            date: fn.date,
            startTime: fn.startTime,
            venueName: fn.venueName,
            dressCode: fn.dressCode,
          })),
        }}
      />
    </div>
  );
}
