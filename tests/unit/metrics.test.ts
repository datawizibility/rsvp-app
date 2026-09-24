import { describe, it, expect } from "vitest";
import { computeEventMetrics, type MetricGuest } from "@/lib/services/metrics";

const guest = (over: Partial<MetricGuest> = {}): MetricGuest => ({
  isVip: false,
  functions: ["wedding"],
  rsvp: null,
  ...over,
});

describe("computeEventMetrics", () => {
  it("counts statuses and per-function attendance", () => {
    const m = computeEventMetrics(
      [
        guest({
          rsvp: {
            status: "yes",
            functions: ["wedding", "reception"],
            adults: 2,
            children: 1,
          },
        }),
        guest({ rsvp: { status: "maybe", functions: ["wedding"], adults: 2, children: 0 } }),
        guest({ rsvp: { status: "no", functions: [], adults: 0, children: 0 } }),
        guest(),
      ],
      1,
    );

    expect(m.invited).toBe(4);
    expect(m.opened).toBe(1);
    expect(m.responded).toBe(3);
    expect(m.confirmed).toBe(1);
    expect(m.maybe).toBe(1);
    expect(m.declined).toBe(1);
    expect(m.pending).toBe(1);
  });

  it("counts guests and people per function (yes) with maybe separate", () => {
    const m = computeEventMetrics([
      guest({
        rsvp: { status: "yes", functions: ["wedding", "reception"], adults: 2, children: 1 },
      }),
      guest({ rsvp: { status: "maybe", functions: ["wedding"], adults: 2, children: 0 } }),
      guest({ rsvp: { status: "no", functions: [], adults: 0, children: 0 } }),
    ]);

    expect(m.perFunction["wedding"]).toEqual({
      guests: 1,
      people: 3,
      tentativeGuests: 1,
      tentativePeople: 2,
    });
    expect(m.perFunction["reception"]).toEqual({
      guests: 1,
      people: 3,
      tentativeGuests: 0,
      tentativePeople: 0,
    });
  });

  it("totals confirmed and tentative people", () => {
    const m = computeEventMetrics([
      guest({ rsvp: { status: "yes", functions: ["wedding"], adults: 3, children: 2 } }),
      guest({ rsvp: { status: "yes", functions: ["wedding"], adults: 1, children: 0 } }),
      guest({ rsvp: { status: "maybe", functions: ["wedding"], adults: 4, children: 1 } }),
      guest({ rsvp: { status: "no", functions: [], adults: 0, children: 0 } }),
    ]);

    expect(m.confirmedPeople).toBe(6);
    expect(m.tentativePeople).toBe(5);
  });

  it("tracks vip totals and vip confirmations", () => {
    const m = computeEventMetrics([
      guest({ isVip: true, rsvp: { status: "yes", functions: ["wedding"], adults: 1, children: 0 } }),
      guest({ isVip: true }),
      guest({ isVip: false, rsvp: { status: "yes", functions: [], adults: 1, children: 0 } }),
    ]);
    expect(m.vipTotal).toBe(2);
    expect(m.vipConfirmed).toBe(1);
  });

  it("handles an empty guest list", () => {
    const m = computeEventMetrics([]);
    expect(m).toMatchObject({
      invited: 0,
      responded: 0,
      confirmed: 0,
      confirmedPeople: 0,
      pending: 0,
    });
    expect(m.perFunction).toEqual({});
  });
});
