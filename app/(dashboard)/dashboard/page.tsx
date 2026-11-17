import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageTour } from "@/components/tour/PageTour";
import { requireUserId } from "@/lib/session";
import { listEventsForUser } from "@/lib/services/events";
import { getWorkspaceSummary } from "@/lib/services/dashboard";

export const dynamic = "force-dynamic";

const TOUR_STEPS = [
  {
    target: null,
    title: "Welcome to RSVP App 👋",
    body: "One workspace for every event — weddings, corporate AGMs, investor meets. This short tour shows you around.",
  },
  {
    target: "dash-stats",
    title: "Live snapshot",
    body: "Your total events, every contact in your CRM, and confirmed guests — always up to date.",
  },
  {
    target: "dash-event-card",
    title: "Open an event",
    body: "Each card is a full event workspace: guests, functions, invitation, RSVPs, WhatsApp sender and the shared photo gallery.",
  },
  {
    target: "nav-new-event",
    title: "Create any event",
    body: "New event takes you through a 30-second setup — the engine adapts to weddings, investor meets, conferences and more.",
  },
  {
    target: null,
    title: "You're all set 🎉",
    body: "Open an event to dive in. Missed something? The Tour button in the corner replays this anytime.",
  },
];

export default async function DashboardPage() {
  const userId = await requireUserId();
  const [events, summary] = await Promise.all([
    listEventsForUser(userId),
    getWorkspaceSummary(userId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Your events</h1>
        <Link
          href="/events/new"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          New event
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3" data-tour="dash-stats">
        <MetricCard label="Events" value={summary.events} />
        <MetricCard label="Contacts" value={summary.contacts} />
        <MetricCard label="Confirmed guests" value={summary.confirmed} tone="green" />
      </div>

      {events.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            No events yet. Create your first event to get started.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`} data-tour="dash-event-card">
              <Card className="h-full transition hover:border-slate-400">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
                    {event.type}
                  </span>
                  <span className="text-xs capitalize text-slate-400">
                    {event.status}
                  </span>
                </div>
                <h2 className="mt-3 font-semibold text-slate-900">{event.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {event.startDate.toLocaleDateString()}
                  {event.city ? ` · ${event.city}` : ""}
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  {event._count.eventGuests} guest
                  {event._count.eventGuests === 1 ? "" : "s"}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <PageTour tourId="dashboard" steps={TOUR_STEPS} />
    </div>
  );
}
