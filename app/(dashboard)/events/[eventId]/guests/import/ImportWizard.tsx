"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { CanonicalField, ColumnMapping } from "@/lib/services/import/map";
import type { ImportAnalysis, ImportRow } from "@/lib/services/import/analyze";
import {
  analyzeWithMappingAction,
  commitImportAction,
  previewImportAction,
} from "./actions";

const FIELD_LABELS: { key: CanonicalField; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "mobile", label: "Mobile" },
  { key: "email", label: "Email" },
  { key: "organisation", label: "Organisation" },
  { key: "designation", label: "Designation" },
  { key: "group", label: "Group" },
  { key: "vip", label: "VIP" },
  { key: "partySize", label: "Party size" },
  { key: "city", label: "City" },
];

export function ImportWizard({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [includeReview, setIncludeReview] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  function reset() {
    setHeaders([]);
    setRows([]);
    setMapping(null);
    setAnalysis(null);
    setDone(null);
    setError(null);
  }

  async function onFile(file: File) {
    reset();
    const text = await file.text();
    const preview = await previewImportAction(eventId, text);
    if (preview.headers.length === 0) {
      setError("Could not read any columns from that file.");
      return;
    }
    setHeaders(preview.headers);
    setRows(preview.rows);
    setMapping(preview.mapping);
    setAnalysis(preview.analysis);
  }

  async function onMappingChange(field: CanonicalField, header: string) {
    if (!mapping) return;
    const next: ColumnMapping = { ...mapping, [field]: header === "" ? null : header };
    setMapping(next);
    const result = await analyzeWithMappingAction(eventId, rows, next);
    setAnalysis(result);
  }

  async function onImport() {
    if (!analysis) return;
    const selected: ImportRow[] = [
      ...analysis.ready,
      ...(includeReview ? analysis.review : []),
    ];
    startTransition(async () => {
      const res = await commitImportAction(eventId, selected);
      setDone(res.imported);
      router.refresh();
    });
  }

  if (done !== null) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-slate-900">
          Imported {done} guest{done === 1 ? "" : "s"}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          They now have personal invitation links on the guest list.
        </p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => router.push(`/events/${eventId}/guests`)}>
            View guest list
          </Button>
          <Button variant="secondary" onClick={reset}>
            Import another file
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">
          1. Upload a CSV
        </h3>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
          className="block w-full text-sm text-slate-600"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>

      {mapping && headers.length > 0 && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            2. Map columns
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELD_LABELS.map(({ key, label }) => (
              <label key={key} className="text-sm">
                <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
                  {label}
                </span>
                <select
                  value={mapping[key] ?? ""}
                  onChange={(e) => onMappingChange(key, e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">— not mapped —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </Card>
      )}

      {analysis && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            3. Preview
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Records" value={analysis.total} />
            <Stat label="Ready" value={analysis.ready.length} tone="green" />
            <Stat label="Need review" value={analysis.review.length} tone="amber" />
            <Stat label="Duplicates" value={analysis.duplicates.length} tone="red" />
          </div>

          {analysis.review.length > 0 && (
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={includeReview}
                onChange={(e) => setIncludeReview(e.target.checked)}
              />
              Include {analysis.review.length} row(s) that need review
            </label>
          )}

          <div className="mt-4 max-h-64 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Mobile</th>
                  <th className="px-3 py-2">Group</th>
                  <th className="px-3 py-2">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...analysis.ready, ...analysis.review, ...analysis.duplicates].map(
                  (row) => (
                    <tr key={row.index}>
                      <td className="px-3 py-2">{row.name || "—"}</td>
                      <td className="px-3 py-2">
                        {row.mobileNormalized ?? (row.mobile || "—")}
                      </td>
                      <td className="px-3 py-2">{row.group ?? "—"}</td>
                      <td className="px-3 py-2 text-red-600">
                        {row.issues.join(", ") || "—"}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Button onClick={onImport} disabled={pending}>
              {pending
                ? "Importing..."
                : `Import ${analysis.ready.length + (includeReview ? analysis.review.length : 0)}`}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "green" | "amber" | "red";
}) {
  const tones: Record<string, string> = {
    slate: "text-slate-900",
    green: "text-green-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className={`text-2xl font-semibold ${tones[tone]}`}>{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
