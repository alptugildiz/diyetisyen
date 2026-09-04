"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  adminGetBookings,
  adminGetPatients,
  adminDeleteBooking,
} from "@/lib/api";
import {
  monthGrid,
  monthRange,
  weekGrid,
  weekRange,
  weekStartISO,
  addDaysISO,
  formatMonthTitle,
  formatWeekTitle,
  bookingDayKey,
  todayISO,
} from "@/lib/calendar";
import BookingForm from "@/components/admin/BookingForm";
import BookingActionSheet from "@/components/admin/BookingActionSheet";
import MonthGrid from "@/components/admin/calendar/MonthGrid";
import WeekGrid from "@/components/admin/calendar/WeekGrid";
import DayStrip from "@/components/admin/calendar/DayStrip";
import DayPanel from "@/components/admin/calendar/DayPanel";
import ViewToggle, {
  type CalendarView,
} from "@/components/admin/calendar/ViewToggle";
import { Button, Modal, PageHeader, useConfirm } from "@/components/admin/ui";
import type { Booking, Patient } from "@/types";

const VIEW_STORAGE_KEY = "takvimGorunum";

export default function AdminTakvimPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";
  const confirm = useConfirm();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  // Boş açılan bir takvim ekranın alt yarısını boş bırakıyordu; bugün seçili.
  const [selectedDay, setSelectedDay] = useState<string>(todayISO());
  const [view, setView] = useState<CalendarView>("hafta");
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [acting, setActing] = useState<Booking | null>(null);

  // Diyetisyen hangi görünümü seçtiyse bir sonraki açılışta onu görsün.
  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === "ay" || saved === "hafta") setView(saved);
  }, []);

  const changeView = (v: CalendarView) => {
    setView(v);
    window.localStorage.setItem(VIEW_STORAGE_KEY, v);
  };

  // Haftalık görünümde gün değiştirmek aynı hafta içindeyse yeniden çekim
  // gerektirmez — bağımlılık haftanın başlangıcı.
  const weekAnchor = weekStartISO(selectedDay);

  const fetchBookings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const range =
        view === "ay" ? monthRange(year, month) : weekRange(weekAnchor);
      setBookings(await adminGetBookings(token, range));
    } finally {
      setLoading(false);
    }
  }, [token, view, year, month, weekAnchor]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    if (token)
      adminGetPatients(token, { limit: 200 }).then((r) =>
        setPatients(r.patients),
      );
  }, [token]);

  const grid = useMemo(() => monthGrid(year, month), [year, month]);
  // Mobil şerit haftalık görünümde yalnızca o haftanın 7 gününü gösterir.
  const weekCells = useMemo(() => weekGrid(weekAnchor), [weekAnchor]);
  const byDay = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    for (const b of bookings) {
      const key = bookingDayKey(b.date);
      (map[key] ??= []).push(b);
    }
    return map;
  }, [bookings]);

  const goPrev = () => {
    if (view === "ay") {
      if (month === 0) {
        setYear((y) => y - 1);
        setMonth(11);
      } else setMonth((m) => m - 1);
    } else {
      setSelectedDay((d) => addDaysISO(d, -7));
    }
  };

  const goNext = () => {
    if (view === "ay") {
      if (month === 11) {
        setYear((y) => y + 1);
        setMonth(0);
      } else setMonth((m) => m + 1);
    } else {
      setSelectedDay((d) => addDaysISO(d, 7));
    }
  };

  const goToday = () => {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    setSelectedDay(todayISO());
  };

  const openNew = (day?: string) => {
    setEditing(null);
    if (day) setSelectedDay(day);
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

  const dayBookings = byDay[selectedDay] ?? [];
  const title =
    view === "ay" ? formatMonthTitle(year, month) : formatWeekTitle(selectedDay);

  return (
    <div>
      <PageHeader
        title="Takvim"
        action={<Button onClick={() => openNew()}>+ Yeni Randevu</Button>}
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={goPrev}
          className="w-9 h-9 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          aria-label={view === "ay" ? "Önceki ay" : "Önceki hafta"}
        >
          ‹
        </button>
        <span className="text-lg font-semibold text-gray-900 min-w-44 text-center">
          {title}
        </span>
        <button
          onClick={goNext}
          className="w-9 h-9 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          aria-label={view === "ay" ? "Sonraki ay" : "Sonraki hafta"}
        >
          ›
        </button>
        <Button variant="secondary" size="sm" onClick={goToday}>
          Bugün
        </Button>
        <div className="ml-auto">
          <ViewToggle value={view} onChange={changeView} />
        </div>
      </div>

      <div className="hidden md:block">
        {view === "ay" ? (
          <MonthGrid
            grid={grid}
            byDay={byDay}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
        ) : (
          <WeekGrid
            anchorIso={selectedDay}
            byDay={byDay}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onSelectBooking={(b) =>
              b.status === "planlandi" ? setActing(b) : openEdit(b)
            }
          />
        )}
      </div>

      <div className="md:hidden">
        <DayStrip
          grid={view === "ay" ? grid : weekCells}
          byDay={byDay}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      </div>

      {loading && (
        <p className="text-gray-400 mt-3 text-sm" role="status">
          Randevular yükleniyor…
        </p>
      )}

      <DayPanel
        dayIso={selectedDay}
        bookings={dayBookings}
        onAdd={() => openNew(selectedDay)}
        onAct={setActing}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

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
          defaultDate={editing ? undefined : selectedDay}
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
