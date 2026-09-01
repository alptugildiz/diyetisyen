"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  adminGetBookings,
  adminGetPatients,
  adminDeleteBooking,
  adminCompleteBooking,
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
import { CANCEL_REASON, CANCEL_REASON_OPTIONS } from "@/lib/bookingCancelReason";
import { SelectInput } from "@/components/admin/DateTimeInput";
import BookingForm from "@/components/admin/BookingForm";
import type { Booking, BookingCancelReason, Patient } from "@/types";

export default function AdminTakvimPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [quickBooking, setQuickBooking] = useState<Booking | null>(null);
  type Outcome = "geldi" | "gelmedi" | "iptal";
  const [quickStatus, setQuickStatus] = useState<Outcome>("geldi");
  const [quickAmount, setQuickAmount] = useState(0);
  const [quickPayment, setQuickPayment] = useState<"nakit" | "kart">("nakit");
  const [quickDocument, setQuickDocument] = useState("");
  const [quickReason, setQuickReason] = useState<BookingCancelReason>("belirtilmedi");
  const [quickSaving, setQuickSaving] = useState(false);

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
    if (
      !confirm(
        `${b.patient.firstName} ${b.patient.lastName} randevusu silinsin mi?`,
      )
    )
      return;
    await adminDeleteBooking(b._id, token);
    setBookings((prev) => prev.filter((x) => x._id !== b._id));
  };

  const openQuickStatus = (booking: Booking, status: Outcome) => {
    setQuickBooking(booking);
    setQuickStatus(status);
    setQuickAmount(0);
    setQuickPayment("nakit");
    setQuickDocument("");
    setQuickReason("belirtilmedi");
  };

  const saveQuickStatus = async () => {
    if (!quickBooking) return;
    setQuickSaving(true);
    try {
      await adminCompleteBooking(
        quickBooking._id,
        {
          status: quickStatus,
          cancelReason:
            quickStatus === "gelmedi" || quickStatus === "iptal"
              ? quickReason
              : null,
          fee: quickStatus === "geldi" ? quickAmount : undefined,
          payment:
            quickStatus === "geldi"
              ? {
                  amount: quickAmount,
                  method: quickPayment,
                  documentNumber: quickDocument,
                }
              : undefined,
        },
        token,
      );
      setQuickBooking(null);
      fetchBookings();
    } finally {
      setQuickSaving(false);
    }
  };

  const dayBookings = selectedDay ? (byDay[selectedDay] ?? []) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Takvim</h1>
        <button
          onClick={() => openNew()}
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          + Yeni Randevu
        </button>
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
        <span className="text-lg font-semibold text-gray-900 min-w-44 text-center">
          {formatMonthTitle(year, month)}
        </span>
        <button
          onClick={nextMonth}
          className="w-9 h-9 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          aria-label="Sonraki ay"
        >
          ›
        </button>
        <button
          onClick={goToday}
          className="ml-2 border border-gray-300 text-gray-600 font-medium px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50"
        >
          Bugün
        </button>
      </div>

      {/* Calendar grid */}
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

      {loading && <p className="text-gray-400 mt-3 text-sm">Yükleniyor…</p>}

      {/* Selected day panel */}
      {selectedDay && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">
              {formatFullDate(selectedDay)}
            </h2>
            <button
              onClick={() => openNew(selectedDay)}
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              + Randevu Ekle
            </button>
          </div>
          {dayBookings.length === 0 ? (
            <p className="text-gray-400 text-sm">Bu güne randevu yok.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {dayBookings.map((b) => (
                <div
                  key={b._id}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <span className="text-sm font-semibold text-gray-900 tabular-nums w-14">
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
                  <div className="flex gap-3">
                    {b.status === "planlandi" && (
                      <>
                        <button
                          onClick={() => openQuickStatus(b, "geldi")}
                          className="text-emerald-600 hover:underline text-sm font-medium"
                        >
                          Tamamla
                        </button>
                        <button
                          onClick={() => openQuickStatus(b, "gelmedi")}
                          className="text-amber-600 hover:underline text-sm font-medium"
                        >
                          Gelmedi
                        </button>
                        <button
                          onClick={() => openQuickStatus(b, "iptal")}
                          className="text-gray-500 hover:underline text-sm font-medium"
                        >
                          İptal
                        </button>
                      </>
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

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="font-semibold text-gray-900 mb-4">
              {editing ? "Randevu Düzenle" : "Yeni Randevu"}
            </h2>
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
          </div>
        </div>
      )}

      {quickBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">
                {STATUS[quickStatus].label}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {quickBooking.patient.firstName} {quickBooking.patient.lastName}
              </p>
            </div>
            {quickStatus === "geldi" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alınan Ücret (₺)</label>
                  <input type="number" min={0} value={quickAmount || ""} onChange={(e) => setQuickAmount(Number(e.target.value))} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Yöntemi</label>
                  <SelectInput value={quickPayment} onChange={(v) => setQuickPayment(v as "nakit" | "kart")} options={[{ value: "nakit", label: "Nakit" }, { value: "kart", label: "Kart" }]} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Belge / Fatura No (opsiyonel)</label>
                  <input value={quickDocument} onChange={(e) => setQuickDocument(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm" />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Neden</label>
                <SelectInput value={quickReason} onChange={(v) => setQuickReason(v as BookingCancelReason)} options={CANCEL_REASON_OPTIONS.map((reason) => ({ value: reason, label: CANCEL_REASON[reason].label }))} />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={saveQuickStatus} disabled={quickSaving} className="bg-brand-500 text-white font-semibold px-5 py-2 rounded-xl text-sm disabled:opacity-50">{quickSaving ? "Kaydediliyor…" : "Kaydet"}</button>
              <button onClick={() => setQuickBooking(null)} className="border border-gray-300 text-gray-600 font-semibold px-5 py-2 rounded-xl text-sm">Vazgeç</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
