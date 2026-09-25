import { describe, it, expect } from "vitest";
import { matchesFilter, type FilterSubject } from "@/lib/services/recipientFilter";

const subject = (over: Partial<FilterSubject> = {}): FilterSubject => ({
  groupId: null,
  lastSentAtForRound: null,
  rsvpStatus: null,
  firstOpenedAt: null,
  ...over,
});

describe("matchesFilter", () => {
  it("all includes everyone", () => {
    expect(matchesFilter(subject(), "all")).toBe(true);
  });

  it("group matches only the given group", () => {
    expect(matchesFilter(subject({ groupId: "g1" }), "group", "g1")).toBe(true);
    expect(matchesFilter(subject({ groupId: "g2" }), "group", "g1")).toBe(false);
    expect(matchesFilter(subject({ groupId: null }), "group", "g1")).toBe(false);
  });

  it("not_sent matches when the round timestamp is null", () => {
    expect(matchesFilter(subject(), "not_sent")).toBe(true);
    expect(matchesFilter(subject({ lastSentAtForRound: new Date() }), "not_sent")).toBe(
      false,
    );
  });

  it("non_responders matches when there is no rsvp", () => {
    expect(matchesFilter(subject(), "non_responders")).toBe(true);
    expect(matchesFilter(subject({ rsvpStatus: "yes" }), "non_responders")).toBe(false);
    expect(matchesFilter(subject({ rsvpStatus: "no" }), "non_responders")).toBe(false);
  });

  it("not_opened matches when never opened", () => {
    expect(matchesFilter(subject(), "not_opened")).toBe(true);
    expect(matchesFilter(subject({ firstOpenedAt: new Date() }), "not_opened")).toBe(
      false,
    );
  });
});
