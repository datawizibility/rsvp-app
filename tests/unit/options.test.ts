import { describe, it, expect } from "vitest";
import { parseOptionsText } from "@/lib/utils/options";

describe("parseOptionsText", () => {
  it("splits on newlines and commas", () => {
    expect(parseOptionsText("Veg\nNon-veg\nJain")).toEqual(["Veg", "Non-veg", "Jain"]);
    expect(parseOptionsText("Veg, Non-veg, Jain")).toEqual(["Veg", "Non-veg", "Jain"]);
  });

  it("trims, drops blanks and de-duplicates", () => {
    expect(parseOptionsText("  Veg \n\n Veg \n , Non-veg ,")).toEqual(["Veg", "Non-veg"]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseOptionsText("")).toEqual([]);
  });
});
