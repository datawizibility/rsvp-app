import Link from "next/link";
import { requireUserId } from "@/lib/session";
import { getEventDetail } from "@/lib/services/events";
import { ImportWizard } from "./ImportWizard";

export const dynamic = "force-dynamic";

export default async function ImportGuestsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const userId = await requireUserId();
  const event = await getEventDetail(userId, eventId);

  return (
    <div className="space-y-6">
      <Link href={`/events/${eventId}/guests`} className="text-sm text-slate-500 underline">
        ← Back to guests
      </Link>
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Import guests</h2>
        <p className="text-sm text-slate-500">
          Upload a CSV, map the columns, review, then import into {event.name}.
        </p>
      </div>
      <ImportWizard eventId={eventId} />
    </div>
  );
}
