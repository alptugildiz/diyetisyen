// Native-Date calendar helpers for the Takvim (month grid) page.
// All day keys are ISO "YYYY-MM-DD" in UTC to stay timezone-safe, matching how
// booking dates are stored (new Date("YYYY-MM-DD") = UTC midnight).

export const WEEKDAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const MONTHS = [
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

export interface DayCell {
  iso: string; // "YYYY-MM-DD"
  day: number; // 1..31
  inMonth: boolean;
  isToday: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (y: number, m: number, d: number) =>
  `${y}-${pad(m + 1)}-${pad(d)}`;

export function todayISO(): string {
  const n = new Date();
  return isoOf(n.getFullYear(), n.getMonth(), n.getDate());
}

// Monday-first 6×7 grid covering the given month (with leading/trailing days).
export function monthGrid(year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1);
  // JS: 0=Sun..6=Sat → Monday-first offset
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const today = todayISO();

  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const iso = isoOf(d.getFullYear(), d.getMonth(), d.getDate());
    cells.push({
      iso,
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: iso === today,
    });
  }
  return cells;
}

// ISO range spanning the visible grid so leading/trailing bookings load too.
export function monthRange(year: number, month: number): {
  from: string;
  to: string;
} {
  const grid = monthGrid(year, month);
  return { from: grid[0].iso, to: grid[grid.length - 1].iso };
}

export function formatMonthTitle(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}

// "2026-07-24" → "24 Temmuz 2026 Cuma"
export function formatFullDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const wd = WEEKDAY_LABELS[(date.getUTCDay() + 6) % 7];
  const wdFull = {
    Pzt: "Pazartesi",
    Sal: "Salı",
    Çar: "Çarşamba",
    Per: "Perşembe",
    Cum: "Cuma",
    Cmt: "Cumartesi",
    Paz: "Pazar",
  }[wd];
  return `${d} ${MONTHS[m - 1]} ${y} ${wdFull}`;
}

// Day key of a stored booking date (ISO string or Date-ish) in UTC.
export function bookingDayKey(dateStr: string): string {
  return dateStr.slice(0, 10);
}
