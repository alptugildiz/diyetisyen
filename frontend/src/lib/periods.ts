// Shared date-range presets for the admin appointment & stats pages.

import { toISODate } from "@/lib/date";

export type PeriodKey =
  | "thisMonth"
  | "last3"
  | "last6"
  | "thisYear"
  | "custom";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "thisMonth", label: "Bu Ay" },
  { key: "last3", label: "Son 3 Ay" },
  { key: "last6", label: "Son 6 Ay" },
  { key: "thisYear", label: "Bu Yıl" },
  { key: "custom", label: "Özel" },
];

// Returns { from, to } as YYYY-MM-DD strings for a preset period.
// Custom ranges are handled by the page (two date inputs), not here.
export function periodRange(key: Exclude<PeriodKey, "custom">): {
  from: string;
  to: string;
} {
  const now = new Date();
  const to = toISODate(now);
  let from: Date;

  switch (key) {
    case "thisMonth":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last3":
      from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      break;
    case "last6":
      from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      break;
    case "thisYear":
      from = new Date(now.getFullYear(), 0, 1);
      break;
  }

  return { from: toISODate(from), to };
}

// Turkish currency formatting: 12500 → "12.500 ₺"
export function formatTRY(amount: number): string {
  return `${amount.toLocaleString("tr-TR")} ₺`;
}

const MONTHS_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

// Dropdown options for the last `count` months, newest first.
export function monthOptions(
  count = 24,
): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth(); // 0-based
  for (let i = 0; i < count; i++) {
    out.push({
      value: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: `${MONTHS_TR[m]} ${y}`,
    });
    m--;
    if (m < 0) {
      m = 11;
      y--;
    }
  }
  return out;
}

// "2026-07" → { from: "2026-07-01", to: "2026-07-31" }
export function monthToRange(ym: string): { from: string; to: string } {
  const [y, m] = ym.split("-").map(Number); // m 1-based
  const p = (n: number) => String(n).padStart(2, "0");
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${y}-${p(m)}-01`, to: `${y}-${p(m)}-${p(last)}` };
}

// Compact for axis ticks: 45000 → "45B", 4500 → "4,5B"
export function formatK(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}B`;
  }
  return String(n);
}

// All "YYYY-MM" months between two ISO dates, inclusive.
// Used to fill empty months so the trend line stays continuous.
export function monthsBetween(from: string, to: string): string[] {
  const [fy, fm] = from.slice(0, 7).split("-").map(Number);
  const [ty, tm] = to.slice(0, 7).split("-").map(Number);
  const out: string[] = [];
  let y = fy;
  let m = fm;
  // guard against pathological ranges
  while ((y < ty || (y === ty && m <= tm)) && out.length < 60) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

// "2026-07" → "Tem 2026"
export function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const names = [
    "Oca",
    "Şub",
    "Mar",
    "Nis",
    "May",
    "Haz",
    "Tem",
    "Ağu",
    "Eyl",
    "Eki",
    "Kas",
    "Ara",
  ];
  return `${names[m - 1]} ${y}`;
}
