import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseCsv } from "@/lib/services/import/parse";
import { mapColumns } from "@/lib/services/import/map";
import { analyzeImport } from "@/lib/services/import/analyze";

const csv = readFileSync(join("tests/unit/fixtures/guests.csv"), "utf8");

describe("import engine", () => {
  it("parses headers and rows", () => {
    const { headers, rows } = parseCsv(csv);
    expect(headers[0]).toBe("Guest Name");
    expect(rows).toHaveLength(5);
  });

  it("maps messy headers to canonical fields", () => {
    const { headers } = parseCsv(csv);
    const m = mapColumns(headers);
    expect(m.name).toBe("Guest Name");
    expect(m.mobile).toBe("Mob No");
    expect(m.organisation).toBe("Company");
    expect(m.group).toBe("Side");
    expect(m.vip).toBe("VIP");
    expect(m.partySize).toBe("Party Size");
  });

  it("classifies rows into ready / review / duplicates", () => {
    const { headers, rows } = parseCsv(csv);
    const a = analyzeImport(rows, mapColumns(headers), new Set());
    expect(a.total).toBe(5);
    expect(a.duplicates).toHaveLength(1);
    expect(a.review).toHaveLength(2);
    expect(a.importable).toHaveLength(2);
  });

  it("flags duplicates against existing contacts", () => {
    const { headers, rows } = parseCsv(csv);
    const a = analyzeImport(rows, mapColumns(headers), new Set(["+919876543210"]));
    expect(a.duplicates).toHaveLength(2);
  });

  it("normalizes mobiles and flags vip", () => {
    const { headers, rows } = parseCsv(csv);
    const a = analyzeImport(rows, mapColumns(headers), new Set());
    expect(a.ready[0].mobileNormalized).toBe("+919876543210");
    expect(a.ready[1].mobileNormalized).toBe("+919811122233");
    expect(a.ready[1].isVip).toBe(true);
  });
});
