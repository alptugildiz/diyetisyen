"use client";

import { STATUS } from "@/lib/bookingStatus";
import { HOUR_SLOTS, slotOf, weekGrid, WEEKDAY_LABELS } from "@/lib/calendar";
import type { Booking } from "@/types";

/**
 * Haftalık saat ızgarası. Ay görünümü hücre başına 3 randevu gösterip
 * gerisini gizliyor; diyetisyenin "salı 14:00 boş mu" sorusuna cevap
 * veren görünüm bu.
 */
export default function WeekGrid({
  anchorIso,
  byDay,
  selectedDay,
  onSelectDay,
  onSelectBooking,
}: {
  anchorIso: string;
  byDay: Record<string, Booking[]>;
  selectedDay: string | null;
  onSelectDay: (iso: string) => void;
  onSelectBooking: (b: Booking) => void;
}) {
  const days = weekGrid(anchorIso);

  const cellOf = (iso: string, slot: string) =>
    (byDay[iso] ?? []).filter((b) => slotOf(b.time) === slot);
  // Saati olmayan randevular ayrı bir satırda toplanır; aksi hâlde
  // ızgarada hiçbir yere düşmeyip görünmez kalırlar.
  const untimed = (iso: string) => (byDay[iso] ?? []).filter((b) => !b.time);
  const hasUntimed = days.some((d) => untimed(d.iso).length > 0);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[56px_repeat(7,1fr)] bg-gray-50 border-b border-gray-200">
            <div />
            {days.map((d, i) => (
              <button
                key={d.iso}
                onClick={() => onSelectDay(d.iso)}
                className={`px-2 py-2 text-center border-l border-gray-200 transition-colors ${
                  selectedDay === d.iso ? "bg-brand-50" : "hover:bg-gray-100"
                }`}
              >
                <span className="block text-xs font-semibold text-gray-500">
                  {WEEKDAY_LABELS[i]}
                </span>
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 mt-0.5 rounded-full text-xs font-medium ${
                    d.isToday ? "bg-brand-500 text-white" : "text-gray-700"
                  }`}
                >
                  {d.day}
                </span>
              </button>
            ))}
          </div>

          {hasUntimed && (
            <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-200 bg-amber-50/40">
              <div className="px-2 py-1.5 text-[11px] text-gray-500 text-right">
                Saatsiz
              </div>
              {days.map((d) => (
                <div
                  key={d.iso}
                  className="border-l border-gray-100 p-1 space-y-1"
                >
                  {untimed(d.iso).map((b) => (
                    <button
                      key={b._id}
                      onClick={() => onSelectBooking(b)}
                      title={`${b.patient.firstName} ${b.patient.lastName}`}
                      className={`block w-full text-left text-[11px] leading-tight px-1.5 py-1 rounded truncate ${STATUS[b.status].badge}`}
                    >
                      {b.patient.lastName}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {HOUR_SLOTS.map((slot) => (
            <div
              key={slot}
              className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-100 last:border-b-0"
            >
              <div className="px-2 py-1.5 text-[11px] text-gray-400 text-right tabular-nums">
                {slot}
              </div>
              {days.map((d) => {
                const items = cellOf(d.iso, slot);
                return (
                  <div
                    key={d.iso}
                    onClick={() => items.length === 0 && onSelectDay(d.iso)}
                    className={`min-h-11 border-l border-gray-100 p-1 space-y-1 transition-colors ${
                      items.length === 0 ? "cursor-pointer" : ""
                    } ${
                      selectedDay === d.iso
                        ? "bg-brand-50/40"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {items.map((b) => (
                      <button
                        key={b._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBooking(b);
                        }}
                        title={`${b.time} ${b.patient.firstName} ${b.patient.lastName}`}
                        className={`block w-full text-left text-[11px] leading-tight px-1.5 py-1 rounded truncate ${STATUS[b.status].badge}`}
                      >
                        <span className="font-medium">{b.time}</span>{" "}
                        {b.patient.lastName}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
