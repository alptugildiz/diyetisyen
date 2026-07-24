"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { adminGetStats } from "@/lib/api";
import {
  formatTRY,
  formatK,
  formatMonthLabel,
  monthsBetween,
} from "@/lib/periods";
import PeriodFilter, { type Range } from "@/components/admin/PeriodFilter";
import { PATIENT_SOURCE } from "@/lib/patientSource";
import { PROCESS_STATUS } from "@/lib/patientProcessStatus";
import { CANCEL_REASON } from "@/lib/bookingCancelReason";
import type { StatsResponse } from "@/types";

const EMERALD = "#10b981";
const INDIGO = "#6366f1";
const AMBER = "#f59e0b";
const SLATE = "#94a3b8";

// ─── Small presentational helpers ──────────────────────────────

// `neutral` renders a plain gray chip (direction + magnitude only, no
// good/bad color) — used for metrics like iptal/gelmedi where a colored
// up/down arrow would read as a judgment rather than information.
function DeltaChip({
  pct,
  neutral,
}: {
  pct: number | null;
  neutral?: boolean;
}) {
  if (pct === null) return null;
  const up = pct >= 0;
  const tone = neutral
    ? "bg-gray-100 text-gray-600"
    : up
      ? "bg-emerald-50 text-emerald-700"
      : "bg-red-50 text-red-600";
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${tone}`}
    >
      {up ? "▲" : "▼"} %{Math.abs(pct)}
    </span>
  );
}

function StatTile({
  label,
  value,
  delta,
  deltaNeutral,
  caption,
  accent,
}: {
  label: string;
  value: string;
  delta?: number | null;
  deltaNeutral?: boolean;
  caption?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-500">{label}</p>
        {delta !== undefined && (
          <DeltaChip pct={delta ?? null} neutral={deltaNeutral} />
        )}
      </div>
      <p
        className={`text-2xl font-bold mt-2 tabular-nums ${
          accent ? "text-brand-600" : "text-gray-900"
        }`}
      >
        {value}
      </p>
      {caption && <p className="text-xs text-gray-400 mt-1">{caption}</p>}
    </div>
  );
}

interface TipRow {
  dataKey?: string | number;
  name?: string | number;
  value?: number;
  color?: string;
}
function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: TipRow[];
  label?: string | number;
  unit?: "try";
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-sm">
      {label !== undefined && (
        <p className="font-medium text-gray-900 mb-0.5">{label}</p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="text-gray-600 tabular-nums">
          {p.name}:{" "}
          <span className="font-semibold" style={{ color: p.color }}>
            {unit === "try" ? formatTRY(p.value ?? 0) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="mb-5">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const axisTick = { fontSize: 12, fill: "#94a3b8" };

// ─── Page ──────────────────────────────────────────────────────

export default function AdminIstatistikPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!token || !range) return;
      setLoading(true);
      try {
        setStats(await adminGetStats(token, range));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token, range]);

  // Fill every month in the selected range (empty months → 0) so the trend
  // stays continuous and readable even when data starts mid-period.
  const monthKeys =
    range && stats
      ? monthsBetween(range.from, range.to)
      : (stats?.monthly.map((m) => m.month) ?? []);
  const monthData = monthKeys.map((month) => {
    const found = stats?.monthly.find((m) => m.month === month);
    return {
      month,
      label: formatMonthLabel(month),
      revenue: found?.revenue ?? 0,
      count: found?.count ?? 0,
    };
  });

  const patientSplit = stats
    ? [
        { name: "Yeni Hasta", value: stats.newPatients, color: EMERALD },
        { name: "Tekrar Eden", value: stats.returningPatients, color: INDIGO },
      ]
    : [];

  const maxTopRevenue = stats?.topPatients[0]?.revenue ?? 1;

  const PROCESS_STATUS_COLOR = {
    aktif: INDIGO,
    tamamladi: EMERALD,
    birakti: SLATE,
  } as const;
  const processSplit =
    stats?.retention.processStatusBreakdown
      .filter((r) => r.count > 0)
      .map((r) => ({
        name: PROCESS_STATUS[r.status].label,
        value: r.count,
        color: PROCESS_STATUS_COLOR[r.status],
      })) ?? [];

  const sourceData =
    stats?.sourceBreakdown
      .filter((r) => r.count > 0)
      .map((r) => ({
        name: PATIENT_SOURCE[r.source].label,
        count: r.count,
      })) ?? [];

  const cancelReasonData =
    stats?.cancelReasonBreakdown
      .filter((r) => r.count > 0)
      .map((r) => ({
        name: CANCEL_REASON[r.reason].label,
        count: r.count,
      })) ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">İstatistikler</h1>
        <p className="text-sm text-gray-500 mt-1">
          Seçilen döneme ait kazanç ve hasta özeti
        </p>
      </div>

      <PeriodFilter onChange={setRange} />

      {loading ? (
        <p className="text-gray-400">Yükleniyor…</p>
      ) : !stats || stats.totalAppointments === 0 ? (
        <p className="text-gray-400">Bu dönemde veri yok.</p>
      ) : (
        <div className="space-y-6">
          {/* KPI tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile
              label="Toplam Kazanç"
              value={formatTRY(stats.totalRevenue)}
              delta={stats.revenueChangePct}
              caption="önceki döneme göre"
              accent
            />
            <StatTile
              label="Toplam Randevu"
              value={String(stats.totalAppointments)}
              delta={stats.appointmentsChangePct}
              caption="önceki döneme göre"
            />
            <StatTile
              label="Benzersiz Hasta"
              value={String(stats.uniquePatients)}
              caption="telefon numarasına göre"
            />
            <StatTile
              label="Hasta Başına Ort."
              value={formatTRY(stats.avgPerPatient)}
              caption={`randevu başına ${formatTRY(stats.avgPerAppointment)}`}
            />
          </div>

          {/* Monthly summary (Booking-based) */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Aylık Özet</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile
                label="Toplam Randevu"
                value={String(stats.monthlySummary.totalBookings)}
                delta={stats.monthlySummary.totalBookingsChangePct}
                caption="önceki döneme göre"
              />
              <StatTile
                label="Gerçekleşen"
                value={String(stats.monthlySummary.completed)}
                delta={stats.monthlySummary.completedChangePct}
                caption="önceki döneme göre"
              />
              <StatTile
                label="İptal"
                value={String(stats.monthlySummary.cancelled)}
                delta={stats.monthlySummary.cancelledChangePct}
                deltaNeutral
                caption="önceki döneme göre"
              />
              <StatTile
                label="Gelmedi"
                value={String(stats.monthlySummary.noShow)}
                delta={stats.monthlySummary.noShowChangePct}
                deltaNeutral
                caption="önceki döneme göre"
              />
              <StatTile
                label="Yeni Danışan"
                value={String(stats.monthlySummary.newPatients)}
                delta={stats.monthlySummary.newPatientsChangePct}
                caption="önceki döneme göre"
              />
              <StatTile
                label="Kontrol Randevusu"
                value={String(stats.monthlySummary.followUps)}
                delta={stats.monthlySummary.followUpsChangePct}
                caption="önceki döneme göre"
              />
              <StatTile
                label="Toplam Gelir"
                value={formatTRY(stats.monthlySummary.revenue)}
                delta={stats.monthlySummary.revenueChangePct}
                caption="önceki döneme göre"
                accent
              />
            </div>
          </div>

          {/* Revenue trend + patient split */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartCard
                title="Aylık Kazanç"
                subtitle="Dönem içindeki aylara göre toplam gelir"
              >
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart
                    data={monthData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={EMERALD} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f1f5f9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={axisTick}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                    />
                    <YAxis
                      tick={axisTick}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatK}
                      width={44}
                    />
                    <Tooltip
                      content={<ChartTooltip unit="try" />}
                      cursor={{ stroke: EMERALD, strokeOpacity: 0.3 }}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Kazanç"
                      stroke={EMERALD}
                      strokeWidth={2}
                      fill="url(#revFill)"
                      dot={{ r: 3, fill: EMERALD }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <ChartCard
              title="Yeni / Tekrar Eden Hasta"
              subtitle="Dönemdeki hasta bileşimi"
            >
              <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={patientSplit}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={2}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {patientSplit.map((e) => (
                        <Cell key={e.name} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<ChartTooltip />}
                      isAnimationActive={false}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-gray-900 tabular-nums">
                    {stats.uniquePatients}
                  </span>
                  <span className="text-xs text-gray-400">toplam hasta</span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {patientSplit.map((e) => (
                  <div
                    key={e.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2 text-gray-600">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: e.color }}
                      />
                      {e.name}
                    </span>
                    <span className="font-semibold text-gray-900 tabular-nums">
                      {e.value}
                    </span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Appointments per month + weekday distribution */}
          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard
              title="Aylık Randevu Sayısı"
              subtitle="Aylara göre tamamlanan randevu adedi"
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={monthData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  barCategoryGap="35%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={axisTick}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <YAxis
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={32}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: "#f8fafc" }}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="count"
                    name="Randevu"
                    fill={EMERALD}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Haftanın Günlerine Göre Yoğunluk"
              subtitle="Hangi günler daha çok randevu alınıyor"
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={stats.weekday}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={axisTick}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <YAxis
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={32}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: "#f8fafc" }}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="count"
                    name="Randevu"
                    fill="#34d399"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={26}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Top patients */}
          <ChartCard
            title="En Çok Gelir Getiren Hastalar"
            subtitle="Dönem içinde toplam ödemeye göre ilk 6"
          >
            <div className="space-y-3">
              {stats.topPatients.map((p, i) => (
                <div key={p.phone} className="flex items-center gap-4">
                  <span className="w-5 text-sm font-semibold text-gray-400 tabular-nums">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {p.name}
                        <span className="text-gray-400 font-normal ml-2">
                          {p.visits} randevu
                        </span>
                      </span>
                      <span className="text-sm font-semibold text-gray-900 tabular-nums ml-3">
                        {formatTRY(p.revenue)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{
                          width: `${Math.max(
                            4,
                            (p.revenue / maxTopRevenue) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Retention */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Devamlılık</h2>
            <div className="grid lg:grid-cols-3 gap-4 mb-6">
              <StatTile
                label="İlk → İkinci Geçiş Oranı"
                value={
                  stats.retention.firstToSecondRate === null
                    ? "—"
                    : `%${stats.retention.firstToSecondRate}`
                }
                caption="dönemde ilk görüşmesi olan danışanlar arasında"
              />
              <StatTile
                label="Ortalama Görüşme Sayısı"
                value={String(stats.retention.avgFollowUpCount)}
                caption="hasta başına, gerçekleşen randevular"
              />
              <StatTile
                label="Ortalama Takip Süresi"
                value={`${stats.retention.avgFollowUpSpanDays} gün`}
                caption="ilk ve son randevu arasında"
              />
            </div>
            {processSplit.length > 0 && (
              <ChartCard
                title="Süreç Durumu Dağılımı"
                subtitle="Dönemde ilk görüşmesi olan danışanların güncel durumu"
              >
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={processSplit}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={2}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {processSplit.map((e) => (
                        <Cell key={e.name} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} isAnimationActive={false} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {processSplit.map((e) => (
                    <div
                      key={e.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2 text-gray-600">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ background: e.color }}
                        />
                        {e.name}
                      </span>
                      <span className="font-semibold text-gray-900 tabular-nums">
                        {e.value}
                      </span>
                    </div>
                  ))}
                </div>
              </ChartCard>
            )}
          </div>

          {/* Source + cancellation breakdown */}
          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard
              title="Kaynak Dağılımı"
              subtitle="Dönemde ilk görüşmesi olan danışanlar nereden geldi"
            >
              {sourceData.length === 0 ? (
                <p className="text-gray-400 text-sm">Bu dönemde veri yok.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={sourceData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f1f5f9"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={axisTick}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={axisTick}
                      tickLine={false}
                      axisLine={false}
                      width={140}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: "#f8fafc" }}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="count"
                      name="Danışan"
                      fill={INDIGO}
                      radius={[0, 4, 4, 0]}
                      maxBarSize={22}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard
              title="İptal & Gelmeme Analizi"
              subtitle="Dönemdeki iptal/gelmeme kayıtları, nedene göre"
            >
              {cancelReasonData.length === 0 ? (
                <p className="text-gray-400 text-sm">Bu dönemde veri yok.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={cancelReasonData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f1f5f9"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={axisTick}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={axisTick}
                      tickLine={false}
                      axisLine={false}
                      width={140}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: "#f8fafc" }}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="count"
                      name="Kayıt"
                      fill={AMBER}
                      radius={[0, 4, 4, 0]}
                      maxBarSize={22}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
