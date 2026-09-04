"use client";

import { STATUS } from "@/lib/bookingStatus";
import { formatFullDate } from "@/lib/calendar";
import { Button } from "@/components/admin/ui";
import type { Booking } from "@/types";

export default function DayPanel({
  dayIso,
  bookings,
  onAdd,
  onAct,
  onEdit,
  onDelete,
}: {
  dayIso: string;
  bookings: Booking[];
  onAdd: () => void;
  onAct: (b: Booking) => void;
  onEdit: (b: Booking) => void;
  onDelete: (b: Booking) => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-semibold text-gray-900">{formatFullDate(dayIso)}</h2>
        <Button size="sm" onClick={onAdd}>
          + Randevu Ekle
        </Button>
      </div>
      {bookings.length === 0 ? (
        <p className="text-gray-400 text-sm">Bu güne randevu yok.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {bookings.map((b) => (
            <div
              key={b._id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 flex-wrap"
            >
              <span className="text-sm font-semibold text-gray-900 tabular-nums w-14 shrink-0">
                {b.time || "—"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {b.patient.firstName} {b.patient.lastName}
                  <span className="text-gray-400 font-normal ml-2">
                    {b.patient.phone}
                  </span>
                </p>
                {b.note && (
                  <p className="text-xs text-gray-500 truncate">{b.note}</p>
                )}
              </div>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS[b.status].badge}`}
              >
                {STATUS[b.status].label}
              </span>
              <div className="flex gap-3 items-center">
                {b.status === "planlandi" && (
                  <Button size="sm" onClick={() => onAct(b)}>
                    İşle
                  </Button>
                )}
                <button
                  onClick={() => onEdit(b)}
                  className="text-brand-600 hover:underline text-sm font-medium"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => onDelete(b)}
                  className="text-red-400 hover:underline text-sm font-medium"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
