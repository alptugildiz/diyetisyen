"use client";

import { useEffect, useState } from "react";
import {
  PERIODS,
  periodRange,
  monthOptions,
  monthToRange,
  type PeriodKey,
} from "@/lib/periods";
import { DateInput, SelectInput } from "@/components/admin/DateTimeInput";

export interface Range {
  from: string;
  to: string;
}

const MONTHS = monthOptions(24);

// Period preset bar (left) + a "pick any month" dropdown (right).
// Emits the resolved {from, to} whenever the selection changes.
export default function PeriodFilter({
  onChange,
}: {
  onChange: (range: Range) => void;
}) {
  const [period, setPeriod] = useState<PeriodKey>("thisMonth");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(""); // "YYYY-MM"

  useEffect(() => {
    if (selectedMonth) {
      onChange(monthToRange(selectedMonth));
    } else if (period === "custom") {
      if (customFrom && customTo) onChange({ from: customFrom, to: customTo });
    } else {
      onChange(periodRange(period));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customFrom, customTo, selectedMonth]);

  const pickPreset = (key: PeriodKey) => {
    setSelectedMonth("");
    setPeriod(key);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-2">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => pickPreset(p.key)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            !selectedMonth && period === p.key
              ? "bg-brand-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {p.label}
        </button>
      ))}

      {!selectedMonth && period === "custom" && (
        <div className="flex items-center gap-2 ml-2">
          <div className="w-36">
            <DateInput
              value={customFrom}
              onChange={setCustomFrom}
              inputClassName="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <span className="text-gray-400">–</span>
          <div className="w-36">
            <DateInput
              value={customTo}
              onChange={setCustomTo}
              inputClassName="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>
      )}

      {/* Any-month dropdown, right-aligned */}
      <div className="ml-auto w-44">
        <SelectInput
          value={selectedMonth}
          onChange={setSelectedMonth}
          placeholder="Ay seç…"
          options={MONTHS}
          inputClassName="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>
    </div>
  );
}
