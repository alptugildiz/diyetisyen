"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  adminGetPatients,
  adminCreatePatient,
  adminDeletePatient,
} from "@/lib/api";
import { isValidPhone } from "@/lib/phone";
import PhoneInput from "@/components/admin/PhoneInput";
import { SelectInput } from "@/components/admin/DateTimeInput";
import { PATIENT_SOURCE, PATIENT_SOURCE_OPTIONS } from "@/lib/patientSource";
import type { Patient, PatientSource } from "@/types";

const inputCls =
  "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

export default function AdminHastalarPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<PatientSource | "">("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchPatients = async () => {
    if (!token) return;
    try {
      setPatients(await adminGetPatients(token));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setPhone("");
    setSource("");
    setNote("");
    setShowForm(false);
    setError("");
  };

  const handleSave = async () => {
    if (!firstName || !lastName || !phone) {
      setError("Ad, soyad ve telefon zorunludur.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("Geçerli bir telefon girin: 0(5xx)xxx xx xx");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await adminCreatePatient(
        { firstName, lastName, phone, source: source || null, note },
        token,
      );
      setPatients((prev) => [created, ...prev]);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Patient) => {
    if (
      !confirm(
        `${p.firstName} ${p.lastName} ve tüm randevuları silinsin mi?`,
      )
    )
      return;
    await adminDeletePatient(p._id, token);
    setPatients((prev) => prev.filter((x) => x._id !== p._id));
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? patients.filter((p) =>
        `${p.firstName} ${p.lastName} ${p.phone}`.toLowerCase().includes(q),
      )
    : patients;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Danışanlar</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          + Yeni Danışan
        </button>
      </div>

      <input
        placeholder="Ad, soyad veya telefon ara…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={inputCls + " mb-6 max-w-md"}
      />

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Yeni Danışan</h2>
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Ad</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Soyad</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Telefon</label>
              <PhoneInput value={phone} onChange={setPhone} inputClassName={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Kaynak (opsiyonel)</label>
              <SelectInput
                value={source}
                onChange={(v) => setSource(v as PatientSource)}
                inputClassName={inputCls}
                placeholder="Nereden geldi?"
                options={PATIENT_SOURCE_OPTIONS.map((s) => ({
                  value: s,
                  label: PATIENT_SOURCE[s].label,
                }))}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Genel Not (opsiyonel)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className={inputCls + " resize-none"}
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
      ) : filtered.length === 0 ? (
        <p className="text-gray-400">
          {q ? "Eşleşen danışan yok." : "Henüz danışan yok."}
        </p>
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
                  Not
                </th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/hastalar/${p._id}`}
                      className="text-gray-900 font-medium hover:text-brand-600"
                    >
                      {p.firstName} {p.lastName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{p.phone}</td>
                  <td className="px-6 py-4 text-gray-400 max-w-xs truncate">
                    {p.note}
                  </td>
                  <td className="px-6 py-4 flex gap-3 justify-end">
                    <Link
                      href={`/admin/hastalar/${p._id}`}
                      className="text-brand-600 hover:underline font-medium"
                    >
                      Detay
                    </Link>
                    <button
                      onClick={() => handleDelete(p)}
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
