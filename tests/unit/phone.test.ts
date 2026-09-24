import { describe, it, expect } from "vitest";
import { normalizeMobile } from "@/lib/utils/phone";

describe("normalizeMobile", () => {
  it("normalizes a 10-digit indian number", () => {
    expect(normalizeMobile("9876543210")).toBe("+919876543210");
  });

  it("strips formatting and existing country code", () => {
    expect(normalizeMobile("+91 98765 43210")).toBe("+919876543210");
  });

  it("handles a leading zero", () => {
    expect(normalizeMobile("09876543210")).toBe("+919876543210");
  });

  it("keeps international numbers over 12 digits", () => {
    expect(normalizeMobile("+14155552671")).toBe("+14155552671");
  });

  it("rejects junk", () => {
    expect(normalizeMobile("123")).toBeNull();
  });

  it("rejects empty and null-ish input", () => {
    expect(normalizeMobile("")).toBeNull();
    expect(normalizeMobile(null)).toBeNull();
    expect(normalizeMobile(undefined)).toBeNull();
  });
});
