"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  adminGetStats,
  adminGetBookings,
  adminGetPatients,
} from "@/lib/api";
import { periodRange, formatTRY } from "@/lib/periods";
import { todayISO, addDays } from "@/lib/date";
import { STATUS } from "@/lib/bookingStatus";
import type { Booking } from "@/types";

const NAV_CARDS = [
  { title: "Takvim", desc: "Randevuları takvimde görüntüle ve planla.", href: "/admin/takvim", emoji: "📆" },
  { title: "Danışanlar", desc: "Danışan profilleri ve notlarını yönet.", href: "/admin/hastalar", emoji: "👥" },
  { title: "Randevu İşlemleri", desc: "Randevu gelirlerini ve ödemeleri yönet.", href: "/admin/randevular", emoji: "💰" },
  { title: "Giderler", desc: "Vergi ve işletme giderlerini yönet.", href: "/admin/giderler", emoji: "🧾" },
  { title: "İstatistikler", desc: "Finans, randevu ve danışan analizleri.", href: "/admin/istatistik", emoji: "📈" },
  { title: "Blog Yazıları", desc: "Yeni yazı ekle, düzenle veya sil.", href: "/admin/blog", emoji: "📝" },
  { title: "SSS", desc: "Sıkça sorulan soruları yönet.", href: "/admin/sss", emoji: "❓" },
];

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 tabular-nums ${
          accent ? "text-brand-600" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function BookingRow({ b, showDate }: { b: Booking; showDate?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="text-sm font-semibold text-gray-900 tabular-nums w-24 shrink-0">
        {showDate && (
          <span className="text-gray-500 font-medium">
            {new Date(b.date).toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "short",
            })}{" "}
          </span>
        )}
        {b.time || "—"}
      </span>
      <span className="flex-1 min-w-0 text-sm text-gray-900 truncate">
        {b.patient.firstName} {b.patient.lastName}
      </span>
      <span
        className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${STATUS[b.status].badge}`}
      >
        {STATUS[b.status].label}
      </span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";

  const [loading, setLoading] = useState(true);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [patientCount, setPatientCount] = useState(0);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      const today = todayISO();
      const { from, to } = periodRange("thisMonth");
      try {
        const [stats, patients, todayB, upcomingB] = await Promise.all([
          adminGetStats(token, { from, to }),
          adminGetPatients(token),
          adminGetBookings(token, { from: today, to: today }),
          adminGetBookings(token, {
            from: addDays(today, 1),
            to: addDays(today, 60),
          }),
        ]);
        setMonthRevenue(stats.totalRevenue);
        setMonthCount(stats.totalAppointments);
        setPatientCount(patients.length);
        setTodayBookings(todayB);
        setUpcoming(upcomingB.slice(0, 6));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-gray-500 mb-8">
        Bugüne ve bu aya dair genel bakış.
      </p>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile
          label="Bugünkü Randevu"
          value={loading ? "…" : String(todayBookings.length)}
        />
        <StatTile
          label="Bu Ay Kazanç"
          value={loading ? "…" : formatTRY(monthRevenue)}
          accent
        />
        <StatTile
          label="Bu Ay Tamamlanan"
          value={loading ? "…" : String(monthCount)}
        />
        <StatTile
          label="Toplam Danışan"
          value={loading ? "…" : String(patientCount)}
        />
      </div>

      {/* Today + upcoming */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Bugünün Randevuları</h2>
            <Link
              href="/admin/takvim"
              className="text-sm text-brand-600 hover:underline"
            >
              Takvim →
            </Link>
          </div>
          {loading ? (
            <p className="text-gray-400 text-sm">Yükleniyor…</p>
          ) : todayBookings.length === 0 ? (
            <p className="text-gray-400 text-sm">Bugün randevu yok.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {todayBookings.map((b) => (
                <BookingRow key={b._id} b={b} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Yaklaşan Randevular</h2>
            <Link
              href="/admin/takvim"
              className="text-sm text-brand-600 hover:underline"
            >
              Takvim →
            </Link>
          </div>
          {loading ? (
            <p className="text-gray-400 text-sm">Yükleniyor…</p>
          ) : upcoming.length === 0 ? (
            <p className="text-gray-400 text-sm">Yaklaşan randevu yok.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {upcoming.map((b) => (
                <BookingRow key={b._id} b={b} showDate />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation cards */}
      <h2 className="font-semibold text-gray-900 mb-4">Bölümler</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {NAV_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">{card.emoji}</div>
            <h3 className="font-bold text-gray-900 mb-1">{card.title}</h3>
            <p className="text-gray-500 text-sm">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
