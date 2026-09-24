import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { requireUserId } from "@/lib/session";
import { getEventDetail } from "@/lib/services/events";
import { setEventStatusAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUSES = ["draft", "published", "completed", "archived"];

export default async function EventOverviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const userId = await requireUserId();
  const event = await getEventDetail(userId, eventId);

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm text-slate-500 underline">
        ← All events
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{event.name}</h1>
          <p className="mt-1 text-sm text-slate-500 capitalize">
            {event.type} · {event.startDate.toLocaleDateString()}
            {event.city ? ` · ${event.city}` : ""}
          </p>
        </div>
        <form action={setEventStatusAction} className="flex items-center gap-2">
          <input type="hidden" name="eventId" value={eventId} />
          <select
            name="status"
            defaultValue={event.status}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status[0].toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Update status
          </button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href={`/events/${eventId}/guests`}>
          <Card className="h-full transition hover:border-slate-400">
            <h3 className="font-semibold text-slate-900">Guests</h3>
            <p className="mt-1 text-sm text-slate-500">
              Add, import and manage your guest list.
            </p>
          </Card>
        </Link>
        <Link href={`/events/${eventId}/functions`}>
          <Card className="h-full transition hover:border-slate-400">
            <h3 className="font-semibold text-slate-900">Functions</h3>
            <p className="mt-1 text-sm text-slate-500">
              {event.functions.length} function
              {event.functions.length === 1 ? "" : "s"} scheduled.
            </p>
          </Card>
        </Link>
        <Link href={`/events/${eventId}/invitation`}>
          <Card className="h-full transition hover:border-slate-400">
            <h3 className="font-semibold text-slate-900">Invitation</h3>
            <p className="mt-1 text-sm text-slate-500">
              {event.invitation?.published ? "Published" : "Not published yet"}.
            </p>
          </Card>
        </Link>
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Schedule</h3>
        {event.functions.length === 0 ? (
          <p className="text-sm text-slate-400">
            No functions yet.{" "}
            <Link href={`/events/${eventId}/functions`} className="underline">
              Add one
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {event.functions.map((fn) => (
              <li key={fn.id} className="flex items-center justify-between py-2">
                <span className="font-medium text-slate-900">{fn.name}</span>
                <span className="text-slate-500">
                  {fn.date.toLocaleDateString()}
                  {fn.startTime ? ` · ${fn.startTime}` : ""}
                  {fn.venueName ? ` · ${fn.venueName}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
