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
  bookingDayKey,
  todayISO,
} from "@/lib/calendar";
import BookingForm from "@/components/admin/BookingForm";
import BookingActionSheet from "@/components/admin/BookingActionSheet";
import MonthGrid from "@/components/admin/calendar/MonthGrid";
import DayStrip from "@/components/admin/calendar/DayStrip";
import DayPanel from "@/components/admin/calendar/DayPanel";
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

      <div className="hidden md:block">
        <MonthGrid
          grid={grid}
          byDay={byDay}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      </div>

      <div className="md:hidden">
        <DayStrip
          grid={grid}
          byDay={byDay}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      </div>

      {loading && <p className="text-gray-400 mt-3 text-sm">Yükleniyor…</p>}

      {selectedDay && (
        <DayPanel
          dayIso={selectedDay}
          bookings={dayBookings}
          onAdd={() => openNew(selectedDay)}
          onAct={setActing}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
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
