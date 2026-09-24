import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { requireUserId } from "@/lib/session";
import { getEventDetail } from "@/lib/services/events";
import { deleteFunctionAction } from "../actions";
import { FunctionForm } from "./FunctionForm";
import { EditFunctionForm } from "./EditFunctionForm";

export const dynamic = "force-dynamic";

function toDateInput(date: Date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default async function FunctionsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const userId = await requireUserId();
  const event = await getEventDetail(userId, eventId);

  return (
    <div className="space-y-6">
      <Link href={`/events/${eventId}`} className="text-sm text-slate-500 underline">
        ← Back to event
      </Link>

      <h1 className="text-2xl font-semibold text-slate-900">Functions</h1>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Add a function</h3>
        <FunctionForm eventId={eventId} />
      </Card>

      <Card className="p-0">
        <ul className="divide-y divide-slate-100 text-sm">
          {event.functions.length === 0 && (
            <li className="px-4 py-6 text-center text-slate-400">
              No functions yet.
            </li>
          )}
          {event.functions.map((fn) => (
            <li key={fn.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{fn.name}</p>
                  <p className="text-slate-500">
                    {fn.date.toLocaleDateString()}
                    {fn.startTime ? ` · ${fn.startTime}` : ""}
                    {fn.venueName ? ` · ${fn.venueName}` : ""}
                    {fn.dressCode ? ` · ${fn.dressCode}` : ""}
                  </p>
                </div>
                <form action={deleteFunctionAction}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="functionId" value={fn.id} />
                  <button className="text-xs text-red-600 underline">Delete</button>
                </form>
              </div>

              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-slate-500">
                  Edit
                </summary>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <EditFunctionForm
                    eventId={eventId}
                    functionId={fn.id}
                    initial={{
                      name: fn.name,
                      date: toDateInput(fn.date),
                      startTime: fn.startTime ?? "",
                      endTime: fn.endTime ?? "",
                      venueName: fn.venueName ?? "",
                      venueAddress: fn.venueAddress ?? "",
                      description: fn.description ?? "",
                      dressCode: fn.dressCode ?? "",
                      capacity: fn.capacity != null ? String(fn.capacity) : "",
                      rsvpRequired: fn.rsvpRequired,
                    }}
                  />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
