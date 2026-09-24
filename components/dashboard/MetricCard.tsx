export function MetricCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number | string;
  tone?: "slate" | "green" | "amber" | "red" | "indigo";
}) {
  const tones: Record<string, string> = {
    slate: "text-slate-900",
    green: "text-green-600",
    amber: "text-amber-600",
    red: "text-red-600",
    indigo: "text-indigo-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`text-2xl font-semibold ${tones[tone]}`}>{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}
