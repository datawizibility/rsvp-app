import { normalizeMobile } from "@/lib/utils/phone";
import type { ColumnMapping, CanonicalField } from "./map";

export type ImportRow = {
  index: number;
  name: string;
  mobile: string;
  mobileNormalized: string | null;
  email: string | null;
  organisation: string | null;
  designation: string | null;
  group: string | null;
  isVip: boolean;
  partySize: number;
  issues: string[];
};

export type ImportAnalysis = {
  total: number;
  ready: ImportRow[];
  review: ImportRow[];
  duplicates: ImportRow[];
  importable: ImportRow[];
};

const VIP_VALUES = new Set(["yes", "y", "true", "1", "vip"]);

export function analyzeImport(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  existingMobiles: Set<string>,
): ImportAnalysis {
  const get = (row: Record<string, string>, field: CanonicalField) =>
    mapping[field] ? (row[mapping[field] as string] ?? "").trim() : "";

  const seen = new Set<string>();

  const parsed: ImportRow[] = rows.map((row, index) => {
    const name = get(row, "name");
    const rawMobile = get(row, "mobile");
    const mobileNormalized = normalizeMobile(rawMobile);
    const party = parseInt(get(row, "partySize") || "1", 10);
    const issues: string[] = [];

    if (!name) issues.push("missing name");
    if (!mobileNormalized) issues.push("invalid mobile");
    if (mobileNormalized && seen.has(mobileNormalized))
      issues.push("duplicate in file");
    if (mobileNormalized && existingMobiles.has(mobileNormalized))
      issues.push("already exists");
    if (mobileNormalized) seen.add(mobileNormalized);

    return {
      index,
      name,
      mobile: rawMobile,
      mobileNormalized,
      email: get(row, "email") || null,
      organisation: get(row, "organisation") || null,
      designation: get(row, "designation") || null,
      group: get(row, "group") || null,
      isVip: VIP_VALUES.has(get(row, "vip").toLowerCase()),
      partySize: Number.isFinite(party) && party > 0 ? party : 1,
      issues,
    };
  });

  const isDuplicate = (r: ImportRow) =>
    r.issues.some((i) => i.includes("duplicate") || i.includes("exists"));

  const duplicates = parsed.filter(isDuplicate);
  const review = parsed.filter((r) => !isDuplicate(r) && r.issues.length > 0);
  const ready = parsed.filter((r) => r.issues.length === 0);

  return {
    total: parsed.length,
    ready,
    review,
    duplicates,
    importable: [...ready, ...review].filter(
      (r) => r.name && r.mobileNormalized,
    ),
  };
}
