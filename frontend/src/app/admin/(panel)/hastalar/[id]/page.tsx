"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  adminGetPatient,
  adminUpdatePatient,
  adminDeleteBooking,
} from "@/lib/api";
import { STATUS } from "@/lib/bookingStatus";
import BookingForm from "@/components/admin/BookingForm";
import type { Booking, Patient } from "@/types";

const inputCls =
  "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400";

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";

  const [patient, setPatient] = useState<Patient | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);

  const fetchDetail = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await adminGetPatient(id, token);
      setPatient(data.patient);
      setBookings(data.bookings);
      setNote(data.patient.note ?? "");
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  const saveNote = async () => {
    if (!patient) return;
    setSavingNote(true);
    setNoteSaved(false);
    try {
      await adminUpdatePatient(patient._id, { note }, token);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteBooking = async (b: Booking) => {
    if (!confirm("Bu randevu silinsin mi?")) return;
    await adminDeleteBooking(b._id, token);
    setBookings((prev) => prev.filter((x) => x._id !== b._id));
  };

  if (loading) return <p className="text-gray-400">Yükleniyor…</p>;
  if (notFound || !patient)
    return (
      <div>
        <p className="text-gray-400 mb-4">Hasta bulunamadı.</p>
        <Link href="/admin/hastalar" className="text-brand-600 hover:underline">
          ← Hastalar
        </Link>
      </div>
    );

  return (
    <div>
      <Link
        href="/admin/hastalar"
        className="text-sm text-gray-500 hover:text-brand-600"
      >
        ← Hastalar
      </Link>

      {/* Profile */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-gray-500 mt-1">☎ {patient.phone}</p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            + Randevu Ekle
          </button>
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Genel Not
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Bu hastayla ilgili kalıcı notlar (alerji, hedef, tercihler…)"
            className={inputCls + " resize-none"}
          />
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={saveNote}
              disabled={savingNote || note === patient.note}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              {savingNote ? "Kaydediliyor…" : "Notu Kaydet"}
            </button>
            {noteSaved && (
              <span className="text-sm text-emerald-600">Kaydedildi ✓</span>
            )}
          </div>
        </div>
      </div>

      {/* Booking history */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          Randevu Geçmişi{" "}
          <span className="text-gray-400 font-normal">({bookings.length})</span>
        </h2>
        {bookings.length === 0 ? (
          <p className="text-gray-400 text-sm">Bu hastaya ait randevu yok.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {bookings.map((b) => (
              <div key={b._id} className="flex items-center gap-4 py-3">
                <div className="w-32">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(b.date).toLocaleDateString("tr-TR")}
                  </p>
                  <p className="text-xs text-gray-400 tabular-nums">
                    {b.time || "—"}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  {b.note ? (
                    <p className="text-sm text-gray-600 truncate">{b.note}</p>
                  ) : (
                    <p className="text-sm text-gray-300">not yok</p>
                  )}
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS[b.status].badge}`}
                >
                  {STATUS[b.status].label}
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEditing(b);
                      setShowForm(true);
                    }}
                    className="text-brand-600 hover:underline text-sm font-medium"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDeleteBooking(b)}
                    className="text-red-400 hover:underline text-sm font-medium"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="font-semibold text-gray-900 mb-4">
              {editing ? "Randevu Düzenle" : "Yeni Randevu"}
            </h2>
            <BookingForm
              token={token}
              fixedPatient={patient}
              initial={editing}
              onSaved={() => {
                setShowForm(false);
                setEditing(null);
                fetchDetail();
              }}
              onCancel={() => {
                setShowForm(false);
                setEditing(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
