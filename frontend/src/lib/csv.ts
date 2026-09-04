/**
 * Basit CSV üretimi.
 *
 * İki Excel ayrıntısı: dosyanın başına UTF-8 BOM konur (yoksa Türkçe
 * karakterler bozuk açılır) ve ayraç olarak noktalı virgül kullanılır
 * (Türkçe yerelde Excel virgülü ondalık ayracı sayar).
 */

const SEPARATOR = ";";

function escapeCell(value: string | number): string {
  const s = String(value ?? "");
  if (s.includes('"') || s.includes(SEPARATOR) || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(SEPARATOR);
  const body = rows.map((row) =>
    columns.map((c) => escapeCell(c.value(row))).join(SEPARATOR),
  );
  return [head, ...body].join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** "gelirler-2026-09-01_2026-09-30.csv" gibi dosya adı üretir. */
export function rangeFilename(
  prefix: string,
  range: { from: string; to: string } | null,
): string {
  if (!range) return `${prefix}.csv`;
  return `${prefix}-${range.from}_${range.to}.csv`;
}
