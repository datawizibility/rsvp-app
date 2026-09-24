export type RsvpStatusValue = "yes" | "maybe" | "no";

export type MetricGuest = {
  isVip: boolean;
  functions: string[];
  rsvp: {
    status: RsvpStatusValue;
    functions: string[];
    adults: number;
    children: number;
  } | null;
};

export type FunctionMetric = {
  guests: number;
  people: number;
  tentativeGuests: number;
  tentativePeople: number;
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
  confirmedPeople: number;
  tentativePeople: number;
  perFunction: Record<string, FunctionMetric>;
};

function emptyFunctionMetric(): FunctionMetric {
  return { guests: 0, people: 0, tentativeGuests: 0, tentativePeople: 0 };
}

export function computeEventMetrics(
  guests: MetricGuest[],
  openedCount = 0,
): EventMetrics {
  const perFunction: Record<string, FunctionMetric> = {};
  let confirmed = 0;
  let maybe = 0;
  let declined = 0;
  let vipConfirmed = 0;
  let confirmedPeople = 0;
  let tentativePeople = 0;

  for (const guest of guests) {
    if (guest.isVip && guest.rsvp?.status === "yes") vipConfirmed++;
    if (!guest.rsvp) continue;

    const { status, functions, adults, children } = guest.rsvp;
    const headcount = adults + children;

    if (status === "yes") {
      confirmed++;
      confirmedPeople += headcount;
    } else if (status === "maybe") {
      maybe++;
      tentativePeople += headcount;
    } else {
      declined++;
    }

    if (status === "no") continue;

    for (const fn of functions) {
      const metric = (perFunction[fn] ??= emptyFunctionMetric());
      if (status === "yes") {
        metric.guests++;
        metric.people += headcount;
      } else {
        metric.tentativeGuests++;
        metric.tentativePeople += headcount;
      }
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
    confirmedPeople,
    tentativePeople,
    perFunction,
  };
}
