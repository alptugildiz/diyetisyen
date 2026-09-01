"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { adminGetPayments, adminGetExpenses } from "@/lib/api";
import { formatTRY } from "@/lib/periods";
import { PAYMENT_METHOD } from "@/lib/paymentMethod";
import PeriodFilter, { type Range } from "@/components/admin/PeriodFilter";
import ExpensesTab from "@/components/admin/finans/ExpensesTab";
import PackagesTab from "@/components/admin/finans/PackagesTab";
import {
  DataTable,
  EmptyState,
  StatTile,
  Tabs,
  type Column,
} from "@/components/admin/ui";
import type { Payment } from "@/types";

type Tab = "gelirler" | "giderler" | "paketler";

export default function AdminFinansPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";

  const [tab, setTab] = useState<Tab>("gelirler");
  const [range, setRange] = useState<Range | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !range) return;
    setLoading(true);
    Promise.all([
      adminGetPayments(token, range),
      adminGetExpenses(token, range),
    ])
      .then(([pay, exp]) => {
        setPayments(pay.payments);
        setIncomeTotal(pay.total);
        setExpenseTotal(exp.total);
      })
      .finally(() => setLoading(false));
  }, [token, range]);

  // Tahsilatın nereden geldiğini tek satırda anlatır.
  const sourceLabel = (p: Payment) =>
    p.source === "package"
      ? `Paket · ${p.patientPackage?.name ?? "—"}`
      : "Randevu";

  const paymentColumns: Column<Payment>[] = [
    {
      key: "patient",
      header: "Danışan",
      render: (p) => (
        <Link
          href={`/admin/hastalar/${p.patient._id}`}
          className="text-gray-900 font-medium hover:text-brand-600"
        >
          {p.patient.firstName} {p.patient.lastName}
        </Link>
      ),
    },
    { key: "source", header: "Kaynak", render: sourceLabel },
    {
      key: "amount",
      header: "Tutar",
      align: "right",
      render: (p) => (
        <span className="font-medium tabular-nums">{formatTRY(p.amount)}</span>
      ),
    },
    {
      key: "method",
      header: "Yöntem",
      render: (p) => (
        <span
          className={`text-xs px-2.5 py-1 rounded-full ${PAYMENT_METHOD[p.method].badge}`}
        >
          {PAYMENT_METHOD[p.method].label}
        </span>
      ),
    },
    {
      key: "date",
      header: "Tarih",
      render: (p) => new Date(p.date).toLocaleDateString("tr-TR"),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Finans</h1>

      <Tabs
        items={[
          { key: "gelirler", label: "Gelirler" },
          { key: "giderler", label: "Giderler" },
          { key: "paketler", label: "Paketler" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab !== "paketler" && <PeriodFilter onChange={setRange} />}

      {tab === "gelirler" && (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <StatTile
              label="Toplam Tahsilat"
              value={formatTRY(incomeTotal)}
              accent
            />
            <StatTile label="Toplam Gider" value={formatTRY(expenseTotal)} />
            <StatTile label="Net" value={formatTRY(incomeTotal - expenseTotal)} />
          </div>

          {loading ? (
            <p className="text-gray-400">Yükleniyor…</p>
          ) : (
            <DataTable
              columns={paymentColumns}
              rows={payments}
              keyOf={(p) => p._id}
              empty={
                <EmptyState
                  title="Bu dönemde tahsilat yok"
                  description="Tahsilat, randevu tamamlanırken veya paket taksiti girilirken oluşur."
                />
              }
            />
          )}
        </>
      )}

      {tab === "giderler" && <ExpensesTab token={token} range={range} />}

      {tab === "paketler" && <PackagesTab token={token} />}
    </div>
  );
}
