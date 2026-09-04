"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { adminGetPayments, adminGetExpenses } from "@/lib/api";
import { formatTRY } from "@/lib/periods";
import { PAYMENT_METHOD } from "@/lib/paymentMethod";
import { toCsv, downloadCsv, rangeFilename } from "@/lib/csv";
import PeriodFilter, { type Range } from "@/components/admin/PeriodFilter";
import ExpensesTab from "@/components/admin/finans/ExpensesTab";
import PackagesTab from "@/components/admin/finans/PackagesTab";
import ReceivablesTab from "@/components/admin/finans/ReceivablesTab";
import FinanceSummary from "@/components/admin/finans/FinanceSummary";
import {
  Button,
  DataTable,
  EmptyState,
  PageHeader,
  SkeletonRows,
  Tabs,
  type Column,
} from "@/components/admin/ui";
import type { Payment } from "@/types";

type Tab = "gelirler" | "giderler" | "alacaklar" | "paketler";

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
    const load = async () => {
      if (!token || !range) return;
      setLoading(true);
      try {
        const [pay, exp] = await Promise.all([
          adminGetPayments(token, range),
          adminGetExpenses(token, range),
        ]);
        setPayments(pay.payments);
        setIncomeTotal(pay.total);
        setExpenseTotal(exp.total);
      } finally {
        setLoading(false);
      }
    };
    load();
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
      <PageHeader title="Finans" />

      <Tabs
        items={[
          { key: "gelirler", label: "Gelirler" },
          { key: "giderler", label: "Giderler" },
          { key: "alacaklar", label: "Alacaklar" },
          { key: "paketler", label: "Paketler" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {(tab === "gelirler" || tab === "giderler") && (
        <PeriodFilter onChange={setRange} />
      )}

      {tab === "gelirler" && (
        <>
          <FinanceSummary income={incomeTotal} expense={expenseTotal} />

          <div className="flex justify-end mb-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={payments.length === 0}
              onClick={() => {
                const csv = toCsv(payments, [
                  {
                    header: "Danışan",
                    value: (p) => `${p.patient.firstName} ${p.patient.lastName}`,
                  },
                  { header: "Kaynak", value: sourceLabel },
                  { header: "Tutar", value: (p) => p.amount },
                  {
                    header: "Yöntem",
                    value: (p) => PAYMENT_METHOD[p.method].label,
                  },
                  {
                    header: "Tarih",
                    value: (p) => new Date(p.date).toLocaleDateString("tr-TR"),
                  },
                ]);
                downloadCsv(rangeFilename("gelirler", range), csv);
              }}
            >
              Dışa aktar
            </Button>
          </div>

          {loading ? (
            <SkeletonRows count={6} />
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

      {tab === "giderler" && (
        <ExpensesTab token={token} range={range} incomeTotal={incomeTotal} />
      )}

      {tab === "alacaklar" && <ReceivablesTab token={token} />}

      {tab === "paketler" && <PackagesTab token={token} />}
    </div>
  );
}
