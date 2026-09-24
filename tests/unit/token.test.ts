import { describe, it, expect } from "vitest";
import { generateGuestToken } from "@/lib/utils/token";

describe("generateGuestToken", () => {
  it("returns 26-char uppercase base32 without ambiguous chars", () => {
    const t = generateGuestToken();
    expect(t).toMatch(/^[A-Z2-9]{26}$/);
    expect(t).not.toMatch(/[IO01]/);
  });

  it("is unique across many draws", () => {
    const set = new Set(Array.from({ length: 5000 }, () => generateGuestToken()));
    expect(set.size).toBe(5000);
  });

  it("honours a custom length", () => {
    expect(generateGuestToken(10)).toHaveLength(10);
  });
});
