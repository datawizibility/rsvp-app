import Papa from "papaparse";

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const headers = (result.meta.fields ?? []).map((h) => h.trim());
  const rows = result.data.filter((r) =>
    Object.values(r).some((v) => (v ?? "").trim() !== ""),
  );

  return { headers, rows };
}
