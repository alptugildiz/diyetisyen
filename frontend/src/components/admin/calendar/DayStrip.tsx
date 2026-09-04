"use client";

import type { DayCell } from "@/lib/calendar";
import type { Booking } from "@/types";

/** Mobilde ay ızgarası okunamayacak kadar dar — yatay gün seçici. */
export default function DayStrip({
  grid,
  byDay,
  selectedDay,
  onSelectDay,
}: {
  grid: DayCell[];
  byDay: Record<string, Booking[]>;
  selectedDay: string | null;
  onSelectDay: (iso: string) => void;
}) {
  return (
    <div className="-mx-4 px-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {grid
          .filter((c) => c.inMonth)
          .map((cell) => {
            const count = (byDay[cell.iso] ?? []).length;
            const selected = selectedDay === cell.iso;
            return (
              <button
                key={cell.iso}
                onClick={() => onSelectDay(cell.iso)}
                className={`shrink-0 w-14 py-2 rounded-xl text-center border transition-colors ${
                  selected
                    ? "bg-brand-500 border-brand-500 text-white"
                    : cell.isToday
                      ? "border-brand-300 text-brand-600"
                      : "border-gray-200 text-gray-600 bg-white"
                }`}
              >
                <span className="block text-sm font-semibold">{cell.day}</span>
                <span className="block text-[10px] opacity-70">
                  {count > 0 ? `${count} rnd` : "—"}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
