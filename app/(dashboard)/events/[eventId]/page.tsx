import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { requireUserId } from "@/lib/session";
import { getEventDetail } from "@/lib/services/events";
import { getEventMetrics } from "@/lib/services/dashboard";
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
  const metrics = await getEventMetrics(userId, eventId);

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <Link href={`/events/${eventId}/questions`}>
          <Card className="h-full transition hover:border-slate-400">
            <h3 className="font-semibold text-slate-900">RSVP questions</h3>
            <p className="mt-1 text-sm text-slate-500">
              {event.questions.length} custom question
              {event.questions.length === 1 ? "" : "s"}.
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

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">RSVP overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Invited" value={metrics.invited} />
          <MetricCard label="Opened" value={metrics.opened} tone="indigo" />
          <MetricCard label="Responded" value={metrics.responded} />
          <MetricCard label="Pending" value={metrics.pending} tone="amber" />
          <MetricCard
            label="Confirmed"
            value={metrics.confirmed}
            sub={`${metrics.confirmedPeople.toLocaleString()} people`}
            tone="green"
          />
          <MetricCard
            label="Maybe"
            value={metrics.maybe}
            sub={`${metrics.tentativePeople.toLocaleString()} people tentative`}
            tone="amber"
          />
          <MetricCard label="Declined" value={metrics.declined} tone="red" />
          <MetricCard
            label={`VIP confirmed (${metrics.vipConfirmed}/${metrics.vipTotal})`}
            value={metrics.vipConfirmed}
            tone="indigo"
          />
        </div>
      </div>

      {metrics.perFunctionByName.length > 0 && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            Attendance by function
          </h3>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 text-left font-medium">Function</th>
                <th className="py-2 text-right font-medium">Guests</th>
                <th className="py-2 text-right font-medium">People</th>
                <th className="py-2 text-right font-medium">Maybe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.perFunctionByName.map((fn) => (
                <tr key={fn.name}>
                  <td className="py-2 text-slate-700">{fn.name}</td>
                  <td className="py-2 text-right font-medium text-slate-900">
                    {fn.guests}
                  </td>
                  <td className="py-2 text-right font-medium text-slate-900">
                    {fn.people.toLocaleString()}
                  </td>
                  <td className="py-2 text-right text-slate-500">
                    {fn.tentativeGuests} / {fn.tentativePeople.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

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
