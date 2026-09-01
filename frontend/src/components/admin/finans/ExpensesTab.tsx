"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminGetExpenses,
  adminCreateExpense,
  adminUpdateExpense,
  adminDeleteExpense,
} from "@/lib/api";
import { formatTRY } from "@/lib/periods";
import { todayISO } from "@/lib/date";
import { DateInput, SelectInput } from "@/components/admin/DateTimeInput";
import type { Range } from "@/components/admin/PeriodFilter";
import {
  Button,
  DataTable,
  EmptyState,
  Field,
  INPUT_CLS,
  Modal,
  StatTile,
  useConfirm,
  type Column,
} from "@/components/admin/ui";
import type { Expense, ExpenseCategory } from "@/types";

const EXPENSE_CATEGORY: Record<ExpenseCategory, string> = {
  vergi: "Vergi",
  muhasebe: "Muhasebe",
  bagkur: "Bağkur",
  diger: "Diğer",
};

export default function ExpensesTab({
  token,
  range,
}: {
  token: string;
  range: Range | null;
}) {
  const confirm = useConfirm();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [category, setCategory] = useState<ExpenseCategory>("vergi");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token || !range) return;
    setLoading(true);
    try {
      const data = await adminGetExpenses(token, range);
      setExpenses(data.expenses);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [token, range]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditId(null);
    setCategory("vergi");
    setAmount(0);
    setDate(todayISO());
    setNote("");
    setError("");
    setOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditId(expense._id);
    setCategory(expense.category);
    setAmount(expense.amount);
    setDate(expense.date.slice(0, 10));
    setNote(expense.note ?? "");
    setError("");
    setOpen(true);
  };

  const handleSave = async () => {
    if (amount <= 0) {
      setError("Tutar sıfırdan büyük olmalı.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = { category, amount, date, note };
      if (editId) await adminUpdateExpense(editId, data, token);
      else await adminCreateExpense(data, token);
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expense: Expense) => {
    const ok = await confirm({
      title: "Gider silinsin mi?",
      message: `${EXPENSE_CATEGORY[expense.category]} · ${formatTRY(expense.amount)}`,
      confirmLabel: "Sil",
      danger: true,
    });
    if (!ok) return;
    await adminDeleteExpense(expense._id, token);
    await load();
  };

  const columns: Column<Expense>[] = [
    {
      key: "category",
      header: "Gider Türü",
      render: (e) => EXPENSE_CATEGORY[e.category],
    },
    {
      key: "amount",
      header: "Tutar",
      align: "right",
      render: (e) => (
        <span className="text-red-500 font-medium tabular-nums">
          {formatTRY(e.amount)}
        </span>
      ),
    },
    {
      key: "date",
      header: "Tarih",
      render: (e) => new Date(e.date).toLocaleDateString("tr-TR"),
    },
    {
      key: "note",
      header: "Açıklama",
      hideOnMobile: true,
      render: (e) => <span className="text-gray-400">{e.note}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (e) => (
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => openEdit(e)}
            className="text-brand-600 hover:underline font-medium"
          >
            Düzenle
          </button>
          <button
            onClick={() => handleDelete(e)}
            className="text-red-400 hover:underline font-medium"
          >
            Sil
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="w-full max-w-xs">
          <StatTile label="Toplam Gider" value={formatTRY(total)} />
        </div>
        <Button onClick={openNew}>+ Gider Ekle</Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Yükleniyor…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={expenses}
          keyOf={(e) => e._id}
          empty={<EmptyState title="Bu dönemde gider kaydı yok." />}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? "Gider Düzenle" : "Yeni Gider"}
        footer={
          <>
            <Button onClick={handleSave} loading={saving}>
              Kaydet
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              İptal
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Gider Türü">
            <SelectInput
              value={category}
              onChange={(v) => setCategory(v as ExpenseCategory)}
              inputClassName={INPUT_CLS}
              options={Object.entries(EXPENSE_CATEGORY).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </Field>
          <Field label="Tutar (₺)">
            <input
              type="number"
              min={0}
              value={amount === 0 ? "" : amount}
              placeholder="0"
              onChange={(e) => setAmount(Number(e.target.value))}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Tarih">
            <DateInput
              value={date}
              onChange={setDate}
              inputClassName={INPUT_CLS}
            />
          </Field>
          <Field label="Açıklama" hint="Opsiyonel">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className={`${INPUT_CLS} resize-none`}
            />
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
