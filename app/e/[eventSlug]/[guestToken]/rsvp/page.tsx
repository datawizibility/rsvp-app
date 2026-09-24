import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getEventGuestByToken } from "@/lib/services/eventGuests";
import { RsvpForm } from "./RsvpForm";

export const dynamic = "force-dynamic";

export default async function RsvpPage({
  params,
}: {
  params: Promise<{ eventSlug: string; guestToken: string }>;
}) {
  const { eventSlug, guestToken } = await params;
  const guest = await getEventGuestByToken(eventSlug, guestToken);
  if (!guest) notFound();

  const functionIds =
    guest.rsvp?.attendance.filter((a) => a.attending).map((a) => a.eventFunctionId) ?? [];
  const answers: Record<string, string> = {};
  for (const answer of guest.rsvp?.answers ?? []) {
    answers[answer.questionId] = answer.answer;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link
        href={`/e/${eventSlug}/${guestToken}`}
        className="mb-4 text-sm text-slate-500 underline"
      >
        ← Back to invitation
      </Link>
      <Card>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {guest.event.name}
        </p>
        <div className="mt-4">
          <RsvpForm
            eventSlug={eventSlug}
            guestToken={guestToken}
            guestName={guest.contact.name}
            functions={guest.event.functions.map((fn) => ({ id: fn.id, name: fn.name }))}
            questions={guest.event.questions.map((q) => ({
              id: q.id,
              label: q.label,
              type: q.type,
              options: q.options,
            }))}
            initial={{
              status: guest.rsvp?.status ?? null,
              adultCount: guest.rsvp?.adultCount ?? 1,
              childCount: guest.rsvp?.childCount ?? 0,
              functionIds,
              dietaryPreference: guest.rsvp?.dietaryPreference ?? null,
              accommodationRequired: guest.rsvp?.accommodationRequired ?? null,
              travelRequired: guest.rsvp?.travelRequired ?? null,
              message: guest.rsvp?.message ?? null,
              answers,
            }}
          />
        </div>
      </Card>
    </main>
  );
}
