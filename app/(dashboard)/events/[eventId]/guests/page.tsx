import Link from "next/link";
import { headers } from "next/headers";
import { Card } from "@/components/ui/Card";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { requireUserId } from "@/lib/session";
import { getEventDetail } from "@/lib/services/events";
import { listEventGuests } from "@/lib/services/eventGuests";
import { AddGuestForm } from "./AddGuestForm";

export const dynamic = "force-dynamic";

export default async function GuestsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const userId = await requireUserId();
  const event = await getEventDetail(userId, eventId);
  const guests = await listEventGuests(userId, eventId);

  const host = (await headers()).get("host") ?? "localhost:3000";
  const base = `http://${host}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Guests</h2>
          <p className="text-sm text-slate-500">
            {guests.length} guest{guests.length === 1 ? "" : "s"} for {event.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/events/${eventId}/guests/send`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Send invitations
          </Link>
          <a
            href={`/events/${eventId}/guests/export`}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Download CSV
          </a>
          <Link
            href={`/events/${eventId}/guests/import`}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Import CSV
          </Link>
          <Link
            href={`/events/${eventId}`}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Back to event
          </Link>
        </div>
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Add a guest</h3>
        <AddGuestForm eventId={eventId} />
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Group</th>
              <th className="px-4 py-3">VIP</th>
              <th className="px-4 py-3">RSVP</th>
              <th className="px-4 py-3">Opens</th>
              <th className="px-4 py-3">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {guests.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No guests yet. Add one above or import a CSV.
                </td>
              </tr>
            )}
            {guests.map((guest) => (
              <tr key={guest.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/events/${eventId}/guests/${guest.id}`}
                    className="font-medium text-slate-900 underline"
                  >
                    {guest.contact.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {guest.contact.mobileNormalized}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {guest.group?.name ?? "—"}
                </td>
                <td className="px-4 py-3">{guest.isVip ? "★" : "—"}</td>
                <td className="px-4 py-3 capitalize">
                  {guest.rsvp?.status ?? "pending"}
                </td>
                <td className="px-4 py-3 text-slate-600">{guest.openCount}</td>
                <td className="px-4 py-3">
                  <CopyLinkButton
                    url={`${base}/e/${event.slug}/${guest.guestToken}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
