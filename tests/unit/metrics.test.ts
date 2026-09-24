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
        guest({ rsvp: { status: "yes", functions: ["wedding", "reception"] } }),
        guest({ rsvp: { status: "maybe", functions: ["wedding"] } }),
        guest({ rsvp: { status: "no", functions: [] } }),
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
    expect(m.perFunction["wedding"]).toBe(2);
    expect(m.perFunction["reception"]).toBe(1);
  });

  it("tracks vip totals and vip confirmations", () => {
    const m = computeEventMetrics([
      guest({ isVip: true, rsvp: { status: "yes", functions: ["wedding"] } }),
      guest({ isVip: true }),
      guest({ isVip: false, rsvp: { status: "yes", functions: [] } }),
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
      pending: 0,
    });
  });
});
