import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getEventDetail } from "@/lib/services/events";
import { listEventGuests } from "@/lib/services/eventGuests";
import { buildGuestCsv, type GuestExportRow } from "@/lib/services/export/guestCsv";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { eventId } = await params;

  let event;
  try {
    event = await getEventDetail(userId, eventId);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const guests = await listEventGuests(userId, eventId);
  const functionNames = event.functions.map((fn) => fn.name);
  const host = (await headers()).get("host") ?? "localhost:3000";
  const base = `http://${host}`;

  const rows: GuestExportRow[] = guests.map((guest) => ({
    name: guest.contact.name,
    mobile: guest.contact.mobileNormalized,
    email: guest.contact.email,
    organisation: guest.contact.organisation,
    designation: guest.contact.designation,
    city: guest.contact.city,
    group: guest.group?.name ?? null,
    isVip: guest.isVip,
    partySize: guest.partySize,
    rsvpStatus: guest.rsvp?.status ?? "",
    adults: guest.rsvp?.adultCount ?? 0,
    children: guest.rsvp?.childCount ?? 0,
    dietaryPreference: guest.rsvp?.dietaryPreference ?? null,
    accommodation: guest.rsvp?.accommodationRequired ?? null,
    travel: guest.rsvp?.travelRequired ?? null,
    functionsAttended: (guest.rsvp?.attendance ?? [])
      .filter((a) => a.attending)
      .map((a) => a.eventFunction.name),
    opened: guest.firstOpenedAt !== null,
    openCount: guest.openCount,
    inviteLink: `${base}/e/${event.slug}/${guest.guestToken}`,
  }));

  const csv = buildGuestCsv(rows, functionNames);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}-guests.csv"`,
    },
  });
}
