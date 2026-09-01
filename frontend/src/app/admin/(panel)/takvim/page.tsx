"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  adminGetBookings,
  adminGetPatients,
  adminDeleteBooking,
} from "@/lib/api";
import {
  monthGrid,
  monthRange,
  formatMonthTitle,
  formatFullDate,
  bookingDayKey,
  todayISO,
  WEEKDAY_LABELS,
} from "@/lib/calendar";
import { STATUS } from "@/lib/bookingStatus";
import BookingForm from "@/components/admin/BookingForm";
import BookingActionSheet from "@/components/admin/BookingActionSheet";
import { Button, Modal, useConfirm } from "@/components/admin/ui";
import type { Booking, Patient } from "@/types";

export default function AdminTakvimPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";
  const confirm = useConfirm();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [acting, setActing] = useState<Booking | null>(null);

  const fetchBookings = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { from, to } = monthRange(year, month);
      setBookings(await adminGetBookings(token, { from, to }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, year, month]);

  useEffect(() => {
    if (token)
      adminGetPatients(token, { limit: 200 }).then((r) => setPatients(r.patients));
  }, [token]);

  const grid = useMemo(() => monthGrid(year, month), [year, month]);
  const byDay = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    for (const b of bookings) {
      const key = bookingDayKey(b.date);
      (map[key] ??= []).push(b);
    }
    return map;
  }, [bookings]);

  const prevMonth = () => {
    setSelectedDay(null);
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    setSelectedDay(null);
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  };
  const goToday = () => {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    setSelectedDay(todayISO());
  };

  const openNew = (day?: string) => {
    setEditing(null);
    setSelectedDay(day ?? selectedDay);
    setShowForm(true);
  };
  const openEdit = (b: Booking) => {
    setEditing(b);
    setShowForm(true);
  };
  const handleDelete = async (b: Booking) => {
    const ok = await confirm({
      title: "Randevu silinsin mi?",
      message: `${b.patient.firstName} ${b.patient.lastName} randevusu ve varsa bağlı tahsilatı silinecek.`,
      confirmLabel: "Sil",
      danger: true,
    });
    if (!ok) return;
    await adminDeleteBooking(b._id, token);
    setBookings((prev) => prev.filter((x) => x._id !== b._id));
  };

  const dayBookings = selectedDay ? (byDay[selectedDay] ?? []) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Takvim</h1>
        <Button onClick={() => openNew()}>+ Yeni Randevu</Button>
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={prevMonth}
          className="w-9 h-9 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          aria-label="Önceki ay"
        >
          ‹
        </button>
        <span className="text-lg font-semibold text-gray-900 min-w-40 text-center">
          {formatMonthTitle(year, month)}
        </span>
        <button
          onClick={nextMonth}
          className="w-9 h-9 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          aria-label="Sonraki ay"
        >
          ›
        </button>
        <Button variant="secondary" size="sm" onClick={goToday}>
          Bugün
        </Button>
      </div>

      {/* Ay grid'i — masaüstü */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-2xl overflow-hidden">
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
                onClick={() => setSelectedDay(cell.iso)}
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

      {/* Mobilde ay grid'i okunamayacak kadar dar — yatay gün seçici */}
      <div className="md:hidden -mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {grid
            .filter((c) => c.inMonth)
            .map((cell) => {
              const count = (byDay[cell.iso] ?? []).length;
              const selected = selectedDay === cell.iso;
              return (
                <button
                  key={cell.iso}
                  onClick={() => setSelectedDay(cell.iso)}
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

      {loading && <p className="text-gray-400 mt-3 text-sm">Yükleniyor…</p>}

      {/* Seçili gün paneli */}
      {selectedDay && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-6">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="font-semibold text-gray-900">
              {formatFullDate(selectedDay)}
            </h2>
            <Button size="sm" onClick={() => openNew(selectedDay)}>
              + Randevu Ekle
            </Button>
          </div>
          {dayBookings.length === 0 ? (
            <p className="text-gray-400 text-sm">Bu güne randevu yok.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {dayBookings.map((b) => (
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
                      <Button size="sm" onClick={() => setActing(b)}>
                        İşle
                      </Button>
                    )}
                    <button
                      onClick={() => openEdit(b)}
                      className="text-brand-600 hover:underline text-sm font-medium"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(b)}
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
      )}

      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
        title={editing ? "Randevu Düzenle" : "Yeni Randevu"}
      >
        <BookingForm
          token={token}
          patients={patients}
          onPatientCreated={(p) => setPatients((prev) => [p, ...prev])}
          initial={editing}
          defaultDate={editing ? undefined : (selectedDay ?? todayISO())}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            fetchBookings();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      </Modal>

      <BookingActionSheet
        booking={acting}
        token={token}
        onClose={() => setActing(null)}
        onSaved={() => {
          setActing(null);
          fetchBookings();
        }}
      />
    </div>
  );
}
