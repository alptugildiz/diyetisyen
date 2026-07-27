"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  adminCreateExpense,
  adminDeleteExpense,
  adminGetExpenses,
  adminUpdateExpense,
} from "@/lib/api";
import { formatTRY } from "@/lib/periods";
import PeriodFilter, { type Range } from "@/components/admin/PeriodFilter";
import { DateInput, SelectInput } from "@/components/admin/DateTimeInput";
import type { Expense, ExpenseCategory } from "@/types";

const today = () => new Date().toISOString().slice(0, 10);

const EXPENSE_CATEGORY: Record<ExpenseCategory, string> = {
  vergi: "Vergi",
  muhasebe: "Muhasebe",
  bagkur: "Bağ-Kur",
  diger: "Diğer",
};

export default function AdminGiderlerPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [range, setRange] = useState<Range | null>(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [category, setCategory] = useState<ExpenseCategory>("vergi");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchExpenses = async () => {
    if (!token || !range) return;
    setLoading(true);
    try {
      const data = await adminGetExpenses(token, range);
      setExpenses(data.expenses);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, range]);

  const resetForm = () => {
    setEditId(null);
    setCategory("vergi");
    setAmount(0);
    setDate(today());
    setNote("");
    setShowForm(false);
    setError("");
  };

  const handleEdit = (expense: Expense) => {
    setEditId(expense._id);
    setCategory(expense.category);
    setAmount(expense.amount);
    setDate(expense.date.slice(0, 10));
    setNote(expense.note ?? "");
    setShowForm(true);
    setError("");
  };

  const handleSave = async () => {
    if (!date || amount <= 0) {
      setError("Gider tutarı ve tarihi zorunludur.");
      return;
    }
    setSaving(true);
    setError("");
    const data = { category, amount, date, note };
    try {
      if (editId) {
        await adminUpdateExpense(editId, data, token);
      } else {
        await adminCreateExpense(data, token);
      }
      resetForm();
      await fetchExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gider kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (!confirm(`${EXPENSE_CATEGORY[expense.category]} gideri silinsin mi?`))
      return;
    await adminDeleteExpense(expense._id, token);
    setExpenses((current) => current.filter((item) => item._id !== expense._id));
    setTotal((current) => current - expense.amount);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Giderler</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          + Gider Ekle
        </button>
      </div>

      <PeriodFilter onChange={setRange} />

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
        <p className="text-sm text-gray-500">Toplam Gider</p>
        <p className="text-2xl font-bold text-red-500 mt-1">
          {formatTRY(total)}
        </p>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 space-y-4">
          <h2 className="font-semibold text-gray-900">
            {editId ? "Gider Düzenle" : "Yeni Gider"}
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gider Türü
              </label>
              <SelectInput
                value={category}
                onChange={(value) => setCategory(value as ExpenseCategory)}
                inputClassName="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                options={Object.entries(EXPENSE_CATEGORY).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tutar (₺)
              </label>
              <input
                type="number"
                min={0}
                value={amount === 0 ? "" : amount}
                placeholder="0"
                onChange={(event) => setAmount(Number(event.target.value))}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarih
              </label>
              <DateInput
                value={date}
                onChange={setDate}
                inputClassName="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Açıklama (opsiyonel)
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors"
            >
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
            <button
              onClick={resetForm}
              className="border border-gray-300 text-gray-600 font-semibold px-5 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">Yükleniyor…</p>
      ) : expenses.length === 0 ? (
        <p className="text-gray-400">Bu dönemde gider kaydı yok.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">
                  Gider Türü
                </th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">
                  Tutar
                </th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">
                  Tarih
                </th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">
                  Açıklama
                </th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((expense) => (
                <tr key={expense._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">
                    {EXPENSE_CATEGORY[expense.category]}
                  </td>
                  <td className="px-6 py-4 text-red-500 font-medium">
                    {formatTRY(expense.amount)}
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {new Date(expense.date).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-6 py-4 text-gray-400 max-w-xs truncate">
                    {expense.note}
                  </td>
                  <td className="px-6 py-4 flex gap-3 justify-end">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="text-brand-600 hover:underline font-medium"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(expense)}
                      className="text-red-400 hover:underline font-medium"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
