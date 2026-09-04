"use client";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  // Mobil kartta gizlenecek sütunlar için
  hideOnMobile?: boolean;
  align?: "left" | "right";
}

// Masaüstünde tablo, <md ekranda kart listesi. Yatay kaydırma yok.
//
// Uzun listelerde tablo kendi içinde kayar ve başlık satırı yapışık kalır:
// Finans'ta yüz satır gelir arasında gezerken hangi sütuna baktığın
// kaybolmasın. Kısa tablolar max-height'a ulaşmadığı için değişmez.
export default function DataTable<T>({
  columns,
  rows,
  keyOf,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  keyOf: (row: T) => string;
  empty: React.ReactNode;
}) {
  if (rows.length === 0) return <>{empty}</>;

  return (
    <>
      <div className="hidden md:block bg-white border border-gray-200 rounded-2xl overflow-auto max-h-[70vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr className="border-b border-gray-200">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`px-6 py-4 font-semibold text-gray-600 ${c.align === "right" ? "text-right" : "text-left"}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={keyOf(row)} className="hover:bg-gray-50 transition-colors">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-6 py-4 ${
                      c.align === "right" ? "text-right tabular-nums" : ""
                    }`}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {rows.map((row) => (
          <div
            key={keyOf(row)}
            className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2"
          >
            {columns
              .filter((c) => !c.hideOnMobile)
              .map((c) => (
                <div key={c.key} className="flex justify-between gap-3">
                  <span className="text-xs text-gray-400 shrink-0">
                    {c.header}
                  </span>
                  <span className="text-sm text-right min-w-0">
                    {c.render(row)}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}
