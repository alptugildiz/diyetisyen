"use client";

import { formatTRY } from "@/lib/periods";

export const EMERALD = "#10b981";
export const INDIGO = "#6366f1";
export const AMBER = "#f59e0b";
export const SLATE = "#94a3b8";

export const axisTick = { fontSize: 12, fill: "#94a3b8" };

// `neutral` renders a plain gray chip (direction + magnitude only, no
// good/bad color) — used for metrics like iptal/gelmedi where a colored
// up/down arrow would read as a judgment rather than information.
export function DeltaChip({
  pct,
  neutral,
}: {
  pct: number | null;
  neutral?: boolean;
}) {
  if (pct === null) return null;
  const up = pct >= 0;
  const tone = neutral
    ? "bg-gray-100 text-gray-600"
    : up
      ? "bg-emerald-50 text-emerald-700"
      : "bg-red-50 text-red-600";
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${tone}`}
    >
      {up ? "▲" : "▼"} %{Math.abs(pct)}
    </span>
  );
}

// Trend rozeti taşıyan istatistik kutusu. Paneldeki sade ui/StatTile'dan
// ayrı: yalnızca istatistik ekranının ihtiyacı olan delta/caption var.
export function MetricTile({
  label,
  value,
  delta,
  deltaNeutral,
  caption,
  accent,
}: {
  label: string;
  value: string;
  delta?: number | null;
  deltaNeutral?: boolean;
  caption?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-500">{label}</p>
        {delta !== undefined && (
          <DeltaChip pct={delta ?? null} neutral={deltaNeutral} />
        )}
      </div>
      <p
        className={`text-2xl font-bold mt-2 tabular-nums ${
          accent ? "text-brand-600" : "text-gray-900"
        }`}
      >
        {value}
      </p>
      {caption && <p className="text-xs text-gray-400 mt-1">{caption}</p>}
    </div>
  );
}

interface TipRow {
  dataKey?: string | number;
  name?: string | number;
  value?: number;
  color?: string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: TipRow[];
  label?: string | number;
  unit?: "try";
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-sm">
      {label !== undefined && (
        <p className="font-medium text-gray-900 mb-0.5">{label}</p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="text-gray-600 tabular-nums">
          {p.name}:{" "}
          <span className="font-semibold" style={{ color: p.color }}>
            {unit === "try" ? formatTRY(p.value ?? 0) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="mb-5">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// İki pasta grafiğinde ortak kullanılan renkli legend.
export function PieLegend({
  items,
}: {
  items: { name: string; value: number; color: string }[];
}) {
  return (
    <div className="mt-4 space-y-2">
      {items.map((e) => (
        <div key={e.name} className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-gray-600">
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: e.color }}
            />
            {e.name}
          </span>
          <span className="font-semibold text-gray-900 tabular-nums">
            {e.value}
          </span>
        </div>
      ))}
    </div>
  );
}
