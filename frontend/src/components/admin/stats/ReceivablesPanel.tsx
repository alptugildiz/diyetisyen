"use client";

import Link from "next/link";
import { formatTRY } from "@/lib/periods";
import { MetricTile } from "./chartBits";
import type { StatsResponse } from "@/types";

export default function ReceivablesPanel({ stats }: { stats: StatsResponse }) {
  return (
    <div>
      <h2 className="font-semibold text-gray-900 mb-3">Alacaklar</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <MetricTile
          label="Bekleyen Alacak"
          value={formatTRY(stats.outstandingReceivables)}
          caption="tahakkuk eden ama tahsil edilmeyen"
          accent={stats.outstandingReceivables > 0}
        />
        <MetricTile
          label="Seans Geliri"
          value={formatTRY(stats.sessionRevenue)}
          caption="tek seans tahsilatları"
        />
        <MetricTile
          label="Paket Geliri"
          value={formatTRY(stats.packageRevenue)}
          caption="satış anında yazılır (kasa esası)"
        />
      </div>

      {stats.topDebtors.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            En Yüksek Borçlular
          </h3>
          <div className="divide-y divide-gray-100">
            {stats.topDebtors.map((d) => (
              <div key={d.phone} className="flex justify-between py-2.5 text-sm">
                <span className="text-gray-900">{d.name}</span>
                <span className="text-amber-600 font-medium tabular-nums">
                  {formatTRY(d.debt)}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/admin/finans"
            className="text-sm text-brand-600 hover:underline mt-3 inline-block"
          >
            Finans →
          </Link>
        </div>
      )}
    </div>
  );
}
