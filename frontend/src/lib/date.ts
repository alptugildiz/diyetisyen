// Saat dilimi güvenli tarih yardımcıları — projedeki tek kaynak.
//
// Kural: gün anahtarı üretirken ASLA toISOString() kullanma. Yerel gece
// yarısını UTC'ye çevirir ve UTC+3'te bir gün geriye kaydırır.
// Yalnızca getFullYear/getMonth/getDate kullan.

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

export function isISODate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}
