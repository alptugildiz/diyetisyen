// Native-Date calendar helpers for the Takvim (month grid) page.
// All day keys are ISO "YYYY-MM-DD" in UTC to stay timezone-safe, matching how
// booking dates are stored (new Date("YYYY-MM-DD") = UTC midnight).

import { toISODate, todayISO } from "@/lib/date";

export { todayISO };

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
    const iso = toISODate(d);
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

// ── Haftalık görünüm ────────────────────────────────────────────────────────

/** ISO tarihe gün ekler. Saat dilimi kaymasını önlemek için UTC üzerinden. */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Verilen günün içinde bulunduğu haftanın pazartesisi. */
export function weekStartISO(iso: string): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  // getUTCDay: 0 = pazar. Pazartesi başlangıçlı haftaya çeviriyoruz.
  const offset = (d.getUTCDay() + 6) % 7;
  return addDaysISO(iso, -offset);
}

/** Pazartesiden pazara 7 hücre. */
export function weekGrid(iso: string): DayCell[] {
  const start = weekStartISO(iso);
  const today = todayISO();
  return Array.from({ length: 7 }, (_, i) => {
    const cellIso = addDaysISO(start, i);
    return {
      iso: cellIso,
      day: Number(cellIso.slice(8, 10)),
      inMonth: true,
      isToday: cellIso === today,
    };
  });
}

export function weekRange(iso: string): { from: string; to: string } {
  const from = weekStartISO(iso);
  return { from, to: addDaysISO(from, 6) };
}

// "8 – 14 Eylül 2026". Hafta iki aya yayılıyorsa ilk günde de ay yazılır.
export function formatWeekTitle(iso: string): string {
  const { from, to } = weekRange(iso);
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const left = fm === tm ? `${fd}` : `${fd} ${MONTHS[fm - 1]}`;
  const right =
    fy === ty
      ? `${td} ${MONTHS[tm - 1]} ${ty}`
      : `${td} ${MONTHS[tm - 1]} ${ty}`;
  return `${left} – ${right}`;
}

/** Haftalık ızgaranın saat satırları: 08:00 – 20:00. */
export const HOUR_SLOTS = Array.from(
  { length: 13 },
  (_, i) => `${String(i + 8).padStart(2, "0")}:00`,
);

/**
 * Randevu saatini ızgara satırına oturtur. Klinik saatleri dışına taşan
 * randevular en yakın uca çekilir — hiçbir randevu görünmez kalmasın.
 */
export function slotOf(time: string): string | null {
  if (!time) return null;
  const hour = Number(time.slice(0, 2));
  if (Number.isNaN(hour)) return null;
  const clamped = Math.min(Math.max(hour, 8), 20);
  return `${String(clamped).padStart(2, "0")}:00`;
}
