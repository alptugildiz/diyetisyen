"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { adminGetToday } from "@/lib/api";
import { formatTRY } from "@/lib/periods";
import { STATUS } from "@/lib/bookingStatus";
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  SkeletonRows,
  SkeletonTiles,
  StatTile,
} from "@/components/admin/ui";
import BookingActionSheet from "@/components/admin/BookingActionSheet";
import type { Booking, TodayResponse } from "@/types";

const STATUS_TONE = {
  geldi: "emerald",
  gelmedi: "amber",
  iptal: "gray",
  planlandi: "brand",
} as const;

export default function AdminTodayPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";

  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<Booking | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setData(await adminGetToday(token));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const todayLabel = new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });

  return (
    <div>
      <PageHeader title="Bugün" subtitle={todayLabel} />

      {loading ? (
        <div className="mb-8">
          <SkeletonTiles count={4} />
        </div>
      ) : (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile
          label="Randevu"
          value={String(data?.bookings.length ?? 0)}
        />
        <StatTile
          label="İşlenmedi"
          value={String(data?.unprocessedCount ?? 0)}
          accent={(data?.unprocessedCount ?? 0) > 0}
        />
        <StatTile
          label="Bugün Tahsil Edilen"
          value={formatTRY(data?.collectedToday ?? 0)}
        />
        <StatTile
          label="Bekleyen Alacak"
          value={formatTRY(data?.outstandingReceivables ?? 0)}
        />
      </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Günün Programı</h2>
          <Link
            href="/admin/takvim"
            className="text-sm text-brand-600 hover:underline"
          >
            Takvim →
          </Link>
        </div>

        {loading ? (
          <SkeletonRows count={4} />
        ) : data && data.bookings.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {data.bookings.map((b) => (
              <div
                key={b._id}
                className="flex items-center gap-3 py-3 flex-wrap"
              >
                <span className="text-sm font-semibold text-gray-900 tabular-nums w-14 shrink-0">
                  {b.time || "—"}
                </span>
                <span className="flex-1 min-w-0 text-sm text-gray-900 truncate">
                  {b.patient.firstName} {b.patient.lastName}
                </span>
                {b.status === "geldi" && b.fee > 0 && (
                  <span className="text-sm text-gray-500 tabular-nums">
                    {formatTRY(b.fee)}
                  </span>
                )}
                {b.status === "planlandi" ? (
                  <Button size="sm" onClick={() => setActing(b)}>
                    İşle
                  </Button>
                ) : (
                  <Badge tone={STATUS_TONE[b.status]}>
                    {STATUS[b.status].label}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Bugün randevu yok"
            description="Takvimden yeni randevu ekleyebilirsin."
            action={
              <Link href="/admin/takvim">
                <Button>Takvime git</Button>
              </Link>
            }
          />
        )}
      </div>

      <h2 className="font-semibold text-gray-900 mb-3">Dikkat</h2>
      {loading ? (
        <SkeletonRows count={3} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
          <Link
            href="/admin/finans"
            className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
          >
            <span className="text-sm text-gray-700">Tahsil edilmemiş tutar</span>
            <span className="text-sm font-semibold text-amber-600 tabular-nums">
              {formatTRY(data?.outstandingReceivables ?? 0)}
            </span>
          </Link>
          <Link
            href="/admin/talepler"
            className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
          >
            <span className="text-sm text-gray-700">
              Bekleyen randevu talebi
            </span>
            <span className="text-sm font-semibold text-brand-600">
              {data?.pendingRequests ?? 0}
            </span>
          </Link>
          {(data?.endingPackages.length ?? 0) > 0 && (
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700 mb-2">Paketi bitmek üzere</p>
              <ul className="space-y-1">
                {data?.endingPackages.map((p, i) => (
                  <li key={i} className="text-sm text-gray-500">
                    <Link
                      href={`/admin/hastalar/${p.patient._id}`}
                      className="hover:text-brand-600"
                    >
                      {p.patient.firstName} {p.patient.lastName}
                    </Link>{" "}
                    · {p.name} · {p.remainingSessions} seans kaldı
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <BookingActionSheet
        booking={acting}
        token={token}
        onClose={() => setActing(null)}
        onSaved={() => {
          setActing(null);
          load();
        }}
      />
    </div>
  );
}
