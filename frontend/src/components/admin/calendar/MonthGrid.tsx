"use client";

import { STATUS } from "@/lib/bookingStatus";
import { WEEKDAY_LABELS, type DayCell } from "@/lib/calendar";
import type { Booking } from "@/types";

export default function MonthGrid({
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
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-xs font-semibold text-gray-500 text-center"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((cell) => {
          const items = byDay[cell.iso] ?? [];
          const selected = selectedDay === cell.iso;
          return (
            <button
              key={cell.iso}
              onClick={() => onSelectDay(cell.iso)}
              className={`min-h-24 border-b border-r border-gray-100 p-1.5 text-left align-top transition-colors ${
                cell.inMonth ? "bg-white" : "bg-gray-50/50"
              } ${selected ? "ring-2 ring-brand-400 ring-inset" : "hover:bg-brand-50/40"}`}
            >
              <div
                className={`text-xs font-medium mb-1 flex items-center justify-center w-6 h-6 rounded-full ${
                  cell.isToday
                    ? "bg-brand-500 text-white"
                    : cell.inMonth
                      ? "text-gray-700"
                      : "text-gray-300"
                }`}
              >
                {cell.day}
              </div>
              <div className="space-y-1">
                {items.slice(0, 3).map((b) => (
                  <div
                    key={b._id}
                    className={`text-[11px] leading-tight px-1.5 py-0.5 rounded truncate ${STATUS[b.status].badge}`}
                    title={`${b.time} ${b.patient.firstName} ${b.patient.lastName}`}
                  >
                    {b.time && <span className="font-medium">{b.time} </span>}
                    {b.patient.lastName}
                  </div>
                ))}
                {items.length > 3 && (
                  <div className="text-[11px] text-gray-400 px-1.5">
                    +{items.length - 3} daha
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
