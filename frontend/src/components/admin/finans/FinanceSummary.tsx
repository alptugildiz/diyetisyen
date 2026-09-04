"use client";

import { formatTRY } from "@/lib/periods";
import { StatTile } from "@/components/admin/ui";

/**
 * Dönemin tahsilat / gider / net üçlüsü. Gelirler ve Giderler sekmelerinde
 * aynı görünsün diye tek yerde: hangi sekmede olursan ol dönemin neti
 * gözünün önünde kalıyor.
 */
export default function FinanceSummary({
  income,
  expense,
}: {
  income: number;
  expense: number;
}) {
  const net = income - expense;
  return (
    <div className="grid sm:grid-cols-3 gap-4 mb-6">
      <StatTile label="Toplam Tahsilat" value={formatTRY(income)} accent />
      <StatTile label="Toplam Gider" value={formatTRY(expense)} />
      <StatTile label="Net" value={formatTRY(net)} accent={net < 0} />
    </div>
  );
}
