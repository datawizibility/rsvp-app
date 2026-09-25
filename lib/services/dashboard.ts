import { prisma } from "@/lib/db";
import { computeEventMetrics, type MetricGuest } from "./metrics";
import { getEventForUser } from "./events";

export async function getEventMetrics(userId: string, eventId: string) {
  await getEventForUser(userId, eventId);

  const [guests, functions] = await Promise.all([
    prisma.eventGuest.findMany({
      where: { eventId },
      include: { rsvp: { include: { attendance: true } } },
    }),
    prisma.eventFunction.findMany({
      where: { eventId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const metricGuests: MetricGuest[] = guests.map((guest) => ({
    isVip: guest.isVip,
    functions: [],
    rsvp: guest.rsvp
      ? {
          status: guest.rsvp.status,
          functions: guest.rsvp.attendance
            .filter((a) => a.attending)
            .map((a) => a.eventFunctionId),
          adults: guest.rsvp.adultCount,
          children: guest.rsvp.childCount,
        }
      : null,
  }));

  const opened = guests.filter((g) => g.firstOpenedAt !== null).length;
  const metrics = computeEventMetrics(metricGuests, opened);

  const perFunctionByName = functions.map((fn) => ({
    name: fn.name,
    ...(metrics.perFunction[fn.id] ?? {
      guests: 0,
      people: 0,
      tentativeGuests: 0,
      tentativePeople: 0,
    }),
  }));

  return { ...metrics, perFunctionByName };
}

export async function getWorkspaceSummary(userId: string) {
  const [events, contacts, confirmed] = await Promise.all([
    prisma.event.count({ where: { workspace: { ownerId: userId } } }),
    prisma.contact.count({ where: { workspace: { ownerId: userId } } }),
    prisma.rsvp.count({
      where: { event: { workspace: { ownerId: userId } }, status: "yes" },
    }),
  ]);

  return { events, contacts, confirmed };
}
