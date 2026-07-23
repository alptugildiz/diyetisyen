"use client";

import { useEffect, useState } from "react";
import { PERIODS, periodRange, type PeriodKey } from "@/lib/periods";

export interface Range {
  from: string;
  to: string;
}

// Period preset bar + custom date range. Emits the resolved {from, to}
// whenever the selection changes. Defaults to "Bu Ay".
export default function PeriodFilter({
  onChange,
}: {
  onChange: (range: Range) => void;
}) {
  const [period, setPeriod] = useState<PeriodKey>("thisMonth");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    if (period === "custom") {
      if (customFrom && customTo) onChange({ from: customFrom, to: customTo });
    } else {
      onChange(periodRange(period));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customFrom, customTo]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-2">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => setPeriod(p.key)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            period === p.key
              ? "bg-brand-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {p.label}
        </button>
      ))}

      {period === "custom" && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <span className="text-gray-400">–</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
      )}
    </div>
  );
}
