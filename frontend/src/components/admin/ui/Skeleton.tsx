/**
 * Yükleniyor iskeletleri. Düz "Yükleniyor…" metni yerine düzeni koruyan
 * gri bloklar — veri gelince sayfa zıplamıyor.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200/70 ${className}`}
      aria-hidden="true"
    />
  );
}

/** Liste ve tablo satırları için. */
export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-gray-100" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="h-4 w-12 shrink-0" />
          <Skeleton className="h-4 flex-1 max-w-48" />
          <Skeleton className="h-6 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** StatTile ızgarası için. */
export function SkeletonTiles({
  count = 4,
  columns = "grid-cols-2 lg:grid-cols-4",
}: {
  count?: number;
  columns?: string;
}) {
  return (
    <div className={`grid ${columns} gap-4`} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  );
}
