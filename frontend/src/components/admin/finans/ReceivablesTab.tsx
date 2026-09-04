"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminGetReceivables } from "@/lib/api";
import { formatTRY } from "@/lib/periods";
import { toCsv, downloadCsv } from "@/lib/csv";
import { waLink, debtReminderText } from "@/lib/whatsapp";
import {
  Button,
  DataTable,
  EmptyState,
  SkeletonRows,
  StatTile,
  type Column,
} from "@/components/admin/ui";
import type { ReceivableRow, ReceivablesResponse } from "@/types";

/**
 * Bekleyen alacaklar. Dönem filtresi yok — alacak birikimli bir bakiye,
 * "eylül ayının alacağı" diye bir şey yok.
 */
export default function ReceivablesTab({ token }: { token: string }) {
  const [data, setData] = useState<ReceivablesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // loading zaten true başlıyor; efekt gövdesinde tekrar set etmek
  // basamaklı render tetikliyor (bkz. react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!token) return;
    adminGetReceivables(token)
      .then(setData)
      .finally(() => setLoading(false));
  }, [token]);

  const columns: Column<ReceivableRow>[] = [
    {
      key: "patient",
      header: "Danışan",
      render: (r) => (
        <Link
          href={`/admin/hastalar/${r.patient._id}`}
          className="text-gray-900 font-medium hover:text-brand-600"
        >
          {r.patient.firstName} {r.patient.lastName}
        </Link>
      ),
    },
    { key: "phone", header: "Telefon", render: (r) => r.patient.phone },
    {
      key: "debt",
      header: "Borç",
      align: "right",
      render: (r) => (
        <span className="font-medium tabular-nums text-amber-600">
          {formatTRY(r.debt)}
        </span>
      ),
    },
    {
      key: "action",
      header: "",
      render: (r) => {
        const href = waLink(
          r.patient.phone,
          debtReminderText(r.patient.firstName, formatTRY(r.debt)),
        );
        if (!href) return null;
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:underline text-sm font-medium"
          >
            Hatırlat
          </a>
        );
      },
    },
  ];

  const exportCsv = () => {
    if (!data) return;
    const csv = toCsv(data.rows, [
      {
        header: "Danışan",
        value: (r) => `${r.patient.firstName} ${r.patient.lastName}`,
      },
      { header: "Telefon", value: (r) => r.patient.phone },
      { header: "Borç", value: (r) => r.debt },
    ]);
    downloadCsv("alacaklar.csv", csv);
  };

  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatTile
          label="Bekleyen Alacak"
          value={formatTRY(data?.total ?? 0)}
          accent={(data?.total ?? 0) > 0}
        />
        <StatTile
          label="Borçlu Danışan"
          value={String(data?.rows.length ?? 0)}
        />
      </div>

      <div className="flex justify-end mb-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={exportCsv}
          disabled={!data || data.rows.length === 0}
        >
          Dışa aktar
        </Button>
      </div>

      {loading ? (
        <SkeletonRows count={5} />
      ) : (
        <DataTable
          columns={columns}
          rows={data?.rows ?? []}
          keyOf={(r) => r.patient._id}
          empty={
            <EmptyState
              title="Bekleyen alacak yok"
              description="Tahakkuk eden her ücret tahsil edilmiş görünüyor."
            />
          }
        />
      )}
    </div>
  );
}
