import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { DeleteGuestButton } from "@/components/DeleteGuestButton";
import { requireUserId } from "@/lib/session";
import { getEventDetail } from "@/lib/services/events";
import { getEventGuestDetail } from "@/lib/services/eventGuests";
import { EditGuestForm } from "./EditGuestForm";
import { ManualRsvpForm } from "./ManualRsvpForm";

export const dynamic = "force-dynamic";

export default async function GuestDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; guestId: string }>;
}) {
  const { eventId, guestId } = await params;
  const userId = await requireUserId();
  const event = await getEventDetail(userId, eventId);
  const guest = await getEventGuestDetail(userId, eventId, guestId);
  if (!guest) notFound();

  const host = (await headers()).get("host") ?? "localhost:3000";
  const personalUrl = `http://${host}/e/${event.slug}/${guest.guestToken}`;
  const whatsappUrl = `https://wa.me/${guest.contact.mobileNormalized.replace("+", "")}?text=${encodeURIComponent(
    `You're invited to ${event.name}. Open your invitation: ${personalUrl}`,
  )}`;

  const attendingFunctions =
    guest.rsvp?.attendance
      .filter((a) => a.attending)
      .map((a) => a.eventFunction.name) ?? [];

  const fmt = (date: Date | null) =>
    date?.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }) ?? null;
  const toLocalInput = (date: Date | null) => {
    if (!date) return null;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  return (
    <div className="space-y-6">
      <Link href={`/events/${eventId}/guests`} className="text-sm text-slate-500 underline">
        ← Back to guests
      </Link>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {guest.contact.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {guest.contact.mobileNormalized}
              {guest.contact.organisation ? ` · ${guest.contact.organisation}` : ""}
              {guest.contact.designation ? ` · ${guest.contact.designation}` : ""}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Group: {guest.group?.name ?? "—"} ·{" "}
              {guest.isVip ? "VIP" : "Standard"} · Party size {guest.partySize}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
              {guest.rsvp?.status ?? "no response"}
            </span>
            <DeleteGuestButton
              eventId={eventId}
              guestId={guestId}
              guestName={guest.contact.name}
            />
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Personal invitation link
          </p>
          <code className="block break-all text-xs text-slate-700">
            {personalUrl}
          </code>
          <div className="mt-2 flex gap-2">
            <CopyLinkButton url={personalUrl} />
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-500"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Edit guest</h3>
        <EditGuestForm
          eventId={eventId}
          guestId={guestId}
          initial={{
            name: guest.contact.name,
            mobile: guest.contact.mobileNormalized,
            email: guest.contact.email ?? "",
            organisation: guest.contact.organisation ?? "",
            designation: guest.contact.designation ?? "",
            city: guest.contact.city ?? "",
            groupName: guest.group?.name ?? "",
            isVip: guest.isVip,
            partySize: guest.partySize,
          }}
        />
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          RSVP &amp; attendance
        </h3>
        {guest.rsvp ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Adults</dt>
              <dd className="font-medium text-slate-900">{guest.rsvp.adultCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Children</dt>
              <dd className="font-medium text-slate-900">{guest.rsvp.childCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Diet</dt>
              <dd className="font-medium text-slate-900">
                {guest.rsvp.dietaryPreference ?? "—"}
              </dd>
            </div>
            <div className="sm:col-span-3">
              <dt className="text-slate-500">Functions</dt>
              <dd className="font-medium text-slate-900">
                {attendingFunctions.length > 0 ? attendingFunctions.join(", ") : "—"}
              </dd>
            </div>
            {guest.rsvp.message && (
              <div className="sm:col-span-3">
                <dt className="text-slate-500">Note</dt>
                <dd className="font-medium text-slate-900">{guest.rsvp.message}</dd>
              </div>
            )}
            {(guest.rsvp.travelArrival ||
              guest.rsvp.travelDeparture ||
              guest.rsvp.travelFlightNumber ||
              guest.rsvp.travelPickup ||
              guest.rsvp.travelDrop) && (
              <>
                <div>
                  <dt className="text-slate-500">Arrival</dt>
                  <dd className="font-medium text-slate-900">
                    {fmt(guest.rsvp.travelArrival) ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Departure</dt>
                  <dd className="font-medium text-slate-900">
                    {fmt(guest.rsvp.travelDeparture) ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Flight / train</dt>
                  <dd className="font-medium text-slate-900">
                    {guest.rsvp.travelFlightNumber ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Travelling</dt>
                  <dd className="font-medium text-slate-900">
                    {guest.rsvp.travelTravellers ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Pickup / drop</dt>
                  <dd className="font-medium text-slate-900">
                    {[guest.rsvp.travelPickup ? "pickup" : null, guest.rsvp.travelDrop ? "drop" : null]
                      .filter(Boolean)
                      .join(" + ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Ticket</dt>
                  <dd className="font-medium text-slate-900">
                    {guest.rsvp.travelTicketUrl ? (
                      <a
                        href={guest.rsvp.travelTicketUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        View file
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                {guest.rsvp.travelNotes && (
                  <div className="sm:col-span-3">
                    <dt className="text-slate-500">Travel notes</dt>
                    <dd className="font-medium text-slate-900">{guest.rsvp.travelNotes}</dd>
                  </div>
                )}
              </>
            )}
          </dl>
        ) : (
          <p className="text-sm text-slate-400">No response yet.</p>
        )}

        <div className="mt-5 border-t border-slate-100 pt-5">
          <h4 className="mb-3 text-sm font-semibold text-slate-900">
            {guest.rsvp
              ? "Update on behalf of guest"
              : "Record RSVP on behalf of guest"}
          </h4>
          <p className="mb-3 text-xs text-slate-500">
            For confirmations received over a phone call or in person.
          </p>
          <ManualRsvpForm
            eventId={eventId}
            guestId={guestId}
            functions={event.functions.map((fn) => ({
              id: fn.id,
              name: fn.name,
              date: fn.date.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              }),
            }))}
            initial={{
              status: guest.rsvp?.status ?? null,
              adultCount: guest.rsvp?.adultCount ?? guest.partySize,
              childCount: guest.rsvp?.childCount ?? 0,
              attendingFunctionIds:
                guest.rsvp?.attendance
                  .filter((a) => a.attending)
                  .map((a) => a.eventFunctionId) ?? [],
              dietaryPreference: guest.rsvp?.dietaryPreference ?? null,
              accommodationRequired: guest.rsvp?.accommodationRequired ?? false,
              travelRequired: guest.rsvp?.travelRequired ?? false,
              message: guest.rsvp?.message ?? "",
              travelArrival: toLocalInput(guest.rsvp?.travelArrival ?? null),
              travelDeparture: toLocalInput(guest.rsvp?.travelDeparture ?? null),
              travelFlightNumber: guest.rsvp?.travelFlightNumber ?? "",
              travelTravellers: guest.rsvp?.travelTravellers ?? null,
              travelPickup: guest.rsvp?.travelPickup ?? false,
              travelDrop: guest.rsvp?.travelDrop ?? false,
              travelNotes: guest.rsvp?.travelNotes ?? "",
            }}
            hasRsvp={Boolean(guest.rsvp)}
          />
        </div>
      </Card>
    </div>
  );
}
