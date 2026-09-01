"use client";

import { formatTRY } from "@/lib/periods";
import { ChartCard } from "./chartBits";
import type { StatsResponse } from "@/types";

export default function TopPatientsCard({
  patients,
}: {
  patients: StatsResponse["topPatients"];
}) {
  const max = patients[0]?.revenue ?? 1;

  return (
    <ChartCard
      title="En Çok Gelir Getiren Danışanlar"
      subtitle="Dönem içinde toplam tahsilata göre ilk 6"
    >
      {patients.length === 0 ? (
        <p className="text-gray-400 text-sm">Bu dönemde tahsilat yok.</p>
      ) : (
        <div className="space-y-3">
          {patients.map((p, i) => (
            <div key={p.phone} className="flex items-center gap-4">
              <span className="w-5 text-sm font-semibold text-gray-400 tabular-nums">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {p.name}
                    <span className="text-gray-400 font-normal ml-2">
                      {p.visits} seans
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums ml-3">
                    {formatTRY(p.revenue)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{
                      width: `${Math.max(4, (p.revenue / max) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}
