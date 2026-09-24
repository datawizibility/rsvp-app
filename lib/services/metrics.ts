export type RsvpStatusValue = "yes" | "maybe" | "no";

export type MetricGuest = {
  isVip: boolean;
  functions: string[];
  rsvp: { status: RsvpStatusValue; functions: string[] } | null;
};

export type EventMetrics = {
  invited: number;
  opened: number;
  responded: number;
  confirmed: number;
  maybe: number;
  declined: number;
  pending: number;
  vipTotal: number;
  vipConfirmed: number;
  perFunction: Record<string, number>;
};

export function computeEventMetrics(
  guests: MetricGuest[],
  openedCount = 0,
): EventMetrics {
  const perFunction: Record<string, number> = {};
  let confirmed = 0;
  let maybe = 0;
  let declined = 0;
  let vipConfirmed = 0;

  for (const guest of guests) {
    if (guest.isVip && guest.rsvp?.status === "yes") vipConfirmed++;
    if (!guest.rsvp) continue;

    if (guest.rsvp.status === "yes") confirmed++;
    else if (guest.rsvp.status === "maybe") maybe++;
    else declined++;

    for (const fn of guest.rsvp.functions) {
      perFunction[fn] = (perFunction[fn] ?? 0) + 1;
    }
  }

  const responded = confirmed + maybe + declined;

  return {
    invited: guests.length,
    opened: openedCount,
    responded,
    confirmed,
    maybe,
    declined,
    pending: guests.length - responded,
    vipTotal: guests.filter((g) => g.isVip).length,
    vipConfirmed,
    perFunction,
  };
}
