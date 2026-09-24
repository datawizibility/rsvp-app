import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/utils/slug";

describe("slugify", () => {
  it("kebab-cases a title", () => {
    expect(slugify("Rahul & Neha Wedding")).toBe("rahul-neha-wedding");
  });

  it("appends a numeric suffix when taken", () => {
    expect(slugify("Rahul & Neha Wedding", (s) => s === "rahul-neha-wedding")).toBe(
      "rahul-neha-wedding-2",
    );
  });

  it("keeps incrementing past multiple collisions", () => {
    const taken = new Set(["event", "event-2", "event-3"]);
    expect(slugify("event", (s) => taken.has(s))).toBe("event-4");
  });

  it("falls back to 'event' for empty input", () => {
    expect(slugify("   ")).toBe("event");
  });
});
