"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { adminGetStats } from "@/lib/api";
import { formatTRY, formatMonthLabel, monthsBetween } from "@/lib/periods";
import PeriodFilter, { type Range } from "@/components/admin/PeriodFilter";
import { PATIENT_SOURCE } from "@/lib/patientSource";
import { PROCESS_STATUS } from "@/lib/patientProcessStatus";
import { CANCEL_REASON } from "@/lib/bookingCancelReason";
import { PAYMENT_METHOD, PAYMENT_METHOD_OPTIONS } from "@/lib/paymentMethod";
import {
  MetricTile,
  EMERALD,
  INDIGO,
  AMBER,
  SLATE,
} from "@/components/admin/stats/chartBits";
import RevenueChart from "@/components/admin/stats/RevenueChart";
import BarSeriesChart from "@/components/admin/stats/BarSeriesChart";
import DonutChart from "@/components/admin/stats/DonutChart";
import TopPatientsCard from "@/components/admin/stats/TopPatientsCard";
import ReceivablesPanel from "@/components/admin/stats/ReceivablesPanel";
import {
  EmptyState,
  PageHeader,
  SkeletonTiles,
} from "@/components/admin/ui";
import type { StatsResponse } from "@/types";

const PROCESS_STATUS_COLOR = {
  aktif: INDIGO,
  tamamladi: EMERALD,
  birakti: SLATE,
} as const;

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

  // Dönemdeki her ayı doldur (boş aylar → 0) ki trend, veri dönem
  // ortasında başlasa bile kopmasın.
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
        { name: "Yeni Danışan", value: stats.newPatients, color: EMERALD },
        { name: "Tekrar Eden", value: stats.returningPatients, color: INDIGO },
      ]
    : [];

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
      .map((r) => ({ name: PATIENT_SOURCE[r.source].label, count: r.count })) ??
    [];

  const cancelReasonData =
    stats?.cancelReasonBreakdown
      .filter((r) => r.count > 0)
      .map((r) => ({ name: CANCEL_REASON[r.reason].label, count: r.count })) ??
    [];

  const isEmpty =
    !stats ||
    (stats.totalAppointments === 0 &&
      stats.totalExpenses === 0 &&
      stats.totalRevenue === 0);

  return (
    <div>
      <PageHeader
        title="İstatistikler"
        subtitle="Seçilen döneme ait finans, randevu ve danışan özeti"
      />

      <PeriodFilter onChange={setRange} />

      {loading ? (
        <SkeletonTiles count={6} columns="grid-cols-2 lg:grid-cols-3" />
      ) : isEmpty || !stats ? (
        <EmptyState
          title="Bu dönemde veri yok"
          description="Farklı bir dönem seçebilir veya randevu işleyerek başlayabilirsin."
        />
      ) : (
        <div className="space-y-6">
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricTile
              label="Toplam Tahsilat"
              value={formatTRY(stats.totalRevenue)}
              delta={stats.revenueChangePct}
              caption="önceki döneme göre"
              accent
            />
            <MetricTile
              label="Toplam Gider"
              value={formatTRY(stats.totalExpenses)}
              caption="seçili dönemde"
            />
            <MetricTile
              label="Net Kazanç"
              value={formatTRY(stats.netRevenue)}
              caption="tahsilat eksi gider"
              accent={stats.netRevenue >= 0}
            />
            <MetricTile
              label="Tamamlanan Randevu"
              value={String(stats.totalAppointments)}
              delta={stats.appointmentsChangePct}
              caption="önceki döneme göre"
            />
            <MetricTile
              label="Benzersiz Danışan"
              value={String(stats.uniquePatients)}
              caption="dönemde seansı tamamlanan"
            />
            <MetricTile
              label="Danışan Başına Ort."
              value={formatTRY(stats.avgPerPatient)}
              caption={`randevu başına ${formatTRY(stats.avgPerAppointment)}`}
            />
          </div>

          <ReceivablesPanel stats={stats} />

          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Ödeme Yöntemi</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {PAYMENT_METHOD_OPTIONS.map((method) => (
                <MetricTile
                  key={method}
                  label={PAYMENT_METHOD[method].label}
                  value={formatTRY(
                    stats.paymentBreakdown.find((i) => i.method === method)
                      ?.total ?? 0,
                  )}
                  caption="seçili dönemde"
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Aylık Özet</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricTile
                label="Toplam Randevu"
                value={String(stats.monthlySummary.totalBookings)}
                delta={stats.monthlySummary.totalBookingsChangePct}
                caption="önceki döneme göre"
              />
              <MetricTile
                label="Gerçekleşen"
                value={String(stats.monthlySummary.completed)}
                delta={stats.monthlySummary.completedChangePct}
                caption="önceki döneme göre"
              />
              <MetricTile
                label="İptal"
                value={String(stats.monthlySummary.cancelled)}
                delta={stats.monthlySummary.cancelledChangePct}
                deltaNeutral
                caption="önceki döneme göre"
              />
              <MetricTile
                label="Gelmedi"
                value={String(stats.monthlySummary.noShow)}
                delta={stats.monthlySummary.noShowChangePct}
                deltaNeutral
                caption="önceki döneme göre"
              />
              <MetricTile
                label="Yeni Danışan"
                value={String(stats.monthlySummary.newPatients)}
                delta={stats.monthlySummary.newPatientsChangePct}
                caption="önceki döneme göre"
              />
              <MetricTile
                label="Kontrol Randevusu"
                value={String(stats.monthlySummary.followUps)}
                delta={stats.monthlySummary.followUpsChangePct}
                caption="önceki döneme göre"
              />
              <MetricTile
                label="Toplam Tahsilat"
                value={formatTRY(stats.monthlySummary.revenue)}
                delta={stats.monthlySummary.revenueChangePct}
                caption="önceki döneme göre"
                accent
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RevenueChart data={monthData} />
            </div>
            <DonutChart
              title="Yeni / Tekrar Eden Danışan"
              subtitle="Dönemdeki danışan bileşimi"
              slices={patientSplit}
              centerValue={String(stats.uniquePatients)}
              centerLabel="toplam danışan"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <BarSeriesChart
              title="Aylık Randevu Sayısı"
              subtitle="Aylara göre tamamlanan randevu adedi"
              data={monthData}
              categoryKey="label"
              valueKey="count"
              valueName="Randevu"
              color={EMERALD}
            />
            <BarSeriesChart
              title="Haftanın Günlerine Göre Yoğunluk"
              subtitle="Hangi günler daha çok randevu alınıyor"
              data={stats.weekday}
              categoryKey="day"
              valueKey="count"
              valueName="Randevu"
              color="#34d399"
            />
          </div>

          <TopPatientsCard patients={stats.topPatients} />

          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Devamlılık</h2>
            <div className="grid lg:grid-cols-3 gap-4 mb-6">
              <MetricTile
                label="İlk → İkinci Geçiş Oranı"
                value={
                  stats.retention.firstToSecondRate === null
                    ? "—"
                    : `%${stats.retention.firstToSecondRate}`
                }
                caption="dönemde ilk görüşmesi olan danışanlar arasında"
              />
              <MetricTile
                label="Ortalama Görüşme Sayısı"
                value={String(stats.retention.avgFollowUpCount)}
                caption="danışan başına, gerçekleşen randevular"
              />
              <MetricTile
                label="Ortalama Takip Süresi"
                value={`${stats.retention.avgFollowUpSpanDays} gün`}
                caption="ilk ve son randevu arasında"
              />
            </div>
            {processSplit.length > 0 && (
              <DonutChart
                title="Süreç Durumu Dağılımı"
                subtitle="Dönemde ilk görüşmesi olan danışanların güncel durumu"
                slices={processSplit}
              />
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <BarSeriesChart
              title="Kaynak Dağılımı"
              subtitle="Dönemde ilk görüşmesi olan danışanlar nereden geldi"
              data={sourceData}
              categoryKey="name"
              valueKey="count"
              valueName="Danışan"
              color={INDIGO}
              layout="vertical"
            />
            <BarSeriesChart
              title="İptal & Gelmeme Analizi"
              subtitle="Dönemdeki iptal/gelmeme kayıtları, nedene göre"
              data={cancelReasonData}
              categoryKey="name"
              valueKey="count"
              valueName="Kayıt"
              color={AMBER}
              layout="vertical"
            />
          </div>
        </div>
      )}
    </div>
  );
}
