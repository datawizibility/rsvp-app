import Link from "next/link";
import { Card } from "@/components/ui/Card";
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

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Use the template (recommended)
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Not sure what to upload? Start from the template. Recognised columns:
            </p>
            <p className="mt-2 text-xs text-slate-600">
              <code className="rounded bg-slate-100 px-1">Name</code> (required),{" "}
              <code className="rounded bg-slate-100 px-1">Mobile</code> (required),{" "}
              <code className="rounded bg-slate-100 px-1">Email</code>,{" "}
              <code className="rounded bg-slate-100 px-1">Organisation</code>,{" "}
              <code className="rounded bg-slate-100 px-1">Designation</code>,{" "}
              <code className="rounded bg-slate-100 px-1">City</code>,{" "}
              <code className="rounded bg-slate-100 px-1">Group</code>,{" "}
              <code className="rounded bg-slate-100 px-1">VIP</code>,{" "}
              <code className="rounded bg-slate-100 px-1">Party Size</code>
            </p>
          </div>
          <a
            href={`/events/${eventId}/guests/import/template`}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Download template
          </a>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Headers don&apos;t have to match exactly — common names like
          &quot;Mob No&quot; or &quot;Company&quot; are auto-detected and you can
          remap them on the next screen.
        </p>
      </Card>

      <ImportWizard eventId={eventId} />
    </div>
  );
}
