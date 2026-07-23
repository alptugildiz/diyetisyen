"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  adminGetAppointments,
  adminCreateAppointment,
  adminUpdateAppointment,
  adminDeleteAppointment,
} from "@/lib/api";
import { formatTRY } from "@/lib/periods";
import PeriodFilter, { type Range } from "@/components/admin/PeriodFilter";
import { DateInput } from "@/components/admin/DateTimeInput";
import PhoneInput from "@/components/admin/PhoneInput";
import { isValidPhone } from "@/lib/phone";
import type { Appointment } from "@/types";

const today = () => new Date().toISOString().slice(0, 10);

export default function AdminRandevularPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range | null>(null);

  // Form state
  const [editId, setEditId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchAppointments = async () => {
    if (!token || !range) return;
    setLoading(true);
    try {
      const data = await adminGetAppointments(token, range);
      setAppointments(data.appointments);
      setTotal(data.total);
      setCount(data.count);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, range]);

  const resetForm = () => {
    setEditId(null);
    setFirstName("");
    setLastName("");
    setPhone("");
    setAmount(0);
    setDate(today());
    setNote("");
    setShowForm(false);
    setError("");
  };

  const handleEdit = (a: Appointment) => {
    setEditId(a._id);
    setFirstName(a.firstName);
    setLastName(a.lastName);
    setPhone(a.phone);
    setAmount(a.amount);
    setDate(a.date.slice(0, 10));
    setNote(a.note ?? "");
    setShowForm(true);
    setError("");
  };

  const handleSave = async () => {
    if (!firstName || !lastName || !phone || !date) {
      setError("Ad, soyad, telefon ve tarih zorunludur.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("Geçerli bir telefon girin: 0(5xx)xxx xx xx");
      return;
    }
    setSaving(true);
    setError("");
    const data = { firstName, lastName, phone, amount, date, note };
    try {
      if (editId) {
        await adminUpdateAppointment(editId, data, token);
      } else {
        await adminCreateAppointment(data, token);
      }
      resetForm();
      await fetchAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: Appointment) => {
    if (!confirm(`${a.firstName} ${a.lastName} randevusu silinsin mi?`)) return;
    await adminDeleteAppointment(a._id, token);
    setAppointments((prev) => prev.filter((x) => x._id !== a._id));
    setTotal((t) => t - a.amount);
    setCount((c) => c - 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Tamamlanmış Randevular
        </h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          + Yeni Randevu
        </button>
      </div>

      <PeriodFilter onChange={setRange} />

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <p className="text-sm text-gray-500">Toplam Kazanç</p>
          <p className="text-2xl font-bold text-brand-600 mt-1">
            {formatTRY(total)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <p className="text-sm text-gray-500">Randevu Sayısı</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 space-y-4">
          <h2 className="font-semibold text-gray-900">
            {editId ? "Randevu Düzenle" : "Yeni Randevu"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ad
              </label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Soyad
              </label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefon
              </label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                inputClassName="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alınan Ücret (₺)
              </label>
              <input
                type="number"
                min={0}
                value={amount === 0 ? "" : amount}
                placeholder="0"
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Randevu Tarihi
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
              Not (opsiyonel)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
      ) : appointments.length === 0 ? (
        <p className="text-gray-400">Bu dönemde randevu yok.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">
                  Ad Soyad
                </th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">
                  Telefon
                </th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">
                  Ücret
                </th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">
                  Tarih
                </th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">
                  Not
                </th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {appointments.map((a) => (
                <tr key={a._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">
                    {a.firstName} {a.lastName}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{a.phone}</td>
                  <td className="px-6 py-4 text-gray-900 font-medium">
                    {formatTRY(a.amount)}
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {new Date(a.date).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-6 py-4 text-gray-400 max-w-xs truncate">
                    {a.note}
                  </td>
                  <td className="px-6 py-4 flex gap-3 justify-end">
                    <button
                      onClick={() => handleEdit(a)}
                      className="text-brand-600 hover:underline font-medium"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(a)}
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
