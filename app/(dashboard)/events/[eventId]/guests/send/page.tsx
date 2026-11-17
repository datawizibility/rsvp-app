import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { getEventDetail } from "@/lib/services/events";
import { getEventTemplates, listRecipients } from "@/lib/services/messaging";
import { isWabaConfigured, wabaTemplateName } from "@/lib/messaging/waba";
import { TemplateEditor } from "./TemplateEditor";
import { SendQueue, type QueueGuest } from "./SendQueue";

export const dynamic = "force-dynamic";

export default async function SendPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const userId = await requireUserId();
  const event = await getEventDetail(userId, eventId);
  const templates = await getEventTemplates(userId, eventId);
  const rows = await listRecipients(userId, eventId, "all", "invite");

  const host = (await headers()).get("host") ?? "localhost:3000";
  const base = `http://${host}`;

  const tokens = await prisma.eventGuest.findMany({
    where: { eventId },
    select: { id: true, guestToken: true },
  });
  const linkById = new Map(
    tokens.map((t) => [t.id, `${base}/e/${event.slug}/${t.guestToken}`]),
  );

  const guests: QueueGuest[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    mobileNormalized: row.mobileNormalized,
    groupId: row.groupId,
    groupName: row.groupName,
    lastInvitedAt: row.lastInvitedAt ? row.lastInvitedAt.toISOString() : null,
    lastRemindedAt: row.lastRemindedAt ? row.lastRemindedAt.toISOString() : null,
    rsvpStatus: row.rsvpStatus,
    firstOpenedAt: row.firstOpenedAt ? row.firstOpenedAt.toISOString() : null,
    link: linkById.get(row.id) ?? "",
  }));

  const eventDate = event.startDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <Link href={`/events/${eventId}/guests`} className="text-sm text-slate-500 underline">
        ← Back to guests
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Send invitations</h1>
        <p className="mt-1 text-sm text-slate-500">
          One guest at a time. Open WhatsApp, send, and the app moves on.
        </p>
      </div>

      {isWabaConfigured() ? (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          WhatsApp Business API is connected — approved templates{" "}
          <strong>{wabaTemplateName("invite")}</strong> /{" "}
          <strong>{wabaTemplateName("reminder")}</strong> can be sent automatically.
        </div>
      ) : (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Manual sending is active (safe for paced, personal sends). To send
          through the official WhatsApp Business Cloud API instead, set{" "}
          <code>WHATSAPP_BUSINESS_TOKEN</code>, <code>WHATSAPP_PHONE_NUMBER_ID</code>{" "}
          and approved template names — see the README.
        </div>
      )}

      <TemplateEditor
        eventId={eventId}
        inviteTemplate={templates.inviteTemplate}
        reminderTemplate={templates.reminderTemplate}
      />

      <SendQueue
        eventId={eventId}
        eventName={event.name}
        eventDate={eventDate}
        inviteTemplate={templates.inviteTemplate}
        reminderTemplate={templates.reminderTemplate}
        guests={guests}
        groups={event.groups.map((g) => ({ id: g.id, name: g.name }))}
        wabaConfigured={isWabaConfigured()}
      />
    </div>
  );
}
