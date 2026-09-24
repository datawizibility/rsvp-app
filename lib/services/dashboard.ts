import { prisma } from "@/lib/db";
import { computeEventMetrics, type MetricGuest } from "./metrics";
import { getEventForUser } from "./events";
import { requireWorkspace } from "./workspaces";

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
        }
      : null,
  }));

  const opened = guests.filter((g) => g.firstOpenedAt !== null).length;
  const metrics = computeEventMetrics(metricGuests, opened);

  const perFunctionByName = functions.map((fn) => ({
    name: fn.name,
    count: metrics.perFunction[fn.id] ?? 0,
  }));

  return { ...metrics, perFunctionByName };
}

export async function getWorkspaceSummary(userId: string) {
  const workspace = await requireWorkspace(userId);

  const [events, contacts, confirmed] = await Promise.all([
    prisma.event.count({ where: { workspaceId: workspace.id } }),
    prisma.contact.count({ where: { workspaceId: workspace.id } }),
    prisma.rsvp.count({
      where: { event: { workspaceId: workspace.id }, status: "yes" },
    }),
  ]);

  return { events, contacts, confirmed };
}
