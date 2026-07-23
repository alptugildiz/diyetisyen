"use client";

import { useState } from "react";
import {
  adminCreateBooking,
  adminUpdateBooking,
  adminCreatePatient,
} from "@/lib/api";
import { STATUS, STATUS_OPTIONS } from "@/lib/bookingStatus";
import {
  DateInput,
  TimeInput,
  SelectInput,
} from "@/components/admin/DateTimeInput";
import PhoneInput from "@/components/admin/PhoneInput";
import { isValidPhone } from "@/lib/phone";
import type { Booking, BookingStatus, Patient } from "@/types";

const inputCls =
  "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

export default function BookingForm({
  token,
  patients,
  onPatientCreated,
  fixedPatient,
  initial,
  defaultDate,
  onSaved,
  onCancel,
}: {
  token: string;
  patients?: Patient[];
  onPatientCreated?: (p: Patient) => void;
  fixedPatient?: Pick<Patient, "_id" | "firstName" | "lastName">;
  initial?: Booking | null;
  defaultDate?: string;
  onSaved: (b: Booking) => void;
  onCancel: () => void;
}) {
  const [patientId, setPatientId] = useState(
    initial?.patient._id ?? fixedPatient?._id ?? "",
  );
  const [newMode, setNewMode] = useState(false);
  const [nFirst, setNFirst] = useState("");
  const [nLast, setNLast] = useState("");
  const [nPhone, setNPhone] = useState("");

  const [date, setDate] = useState(
    initial?.date.slice(0, 10) ?? defaultDate ?? "",
  );
  const [time, setTime] = useState(initial?.time ?? "");
  const [status, setStatus] = useState<BookingStatus>(
    initial?.status ?? "planlandi",
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!date) {
      setError("Tarih zorunludur.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let pid = patientId;

      // Quick-create a new patient inline
      if (!fixedPatient && newMode) {
        if (!nFirst || !nLast || !nPhone) {
          setError("Yeni hasta için ad, soyad ve telefon gerekli.");
          setSaving(false);
          return;
        }
        if (!isValidPhone(nPhone)) {
          setError("Geçerli bir telefon girin: 0(5xx)xxx xx xx");
          setSaving(false);
          return;
        }
        const created = await adminCreatePatient(
          { firstName: nFirst, lastName: nLast, phone: nPhone },
          token,
        );
        pid = created._id;
        onPatientCreated?.(created);
      }

      if (!pid) {
        setError("Lütfen bir hasta seçin.");
        setSaving(false);
        return;
      }

      const payload = { patient: pid, date, time, status, note };
      const saved = initial
        ? await adminUpdateBooking(initial._id, payload, token)
        : await adminCreateBooking(payload, token);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Patient selection */}
      {fixedPatient ? (
        <div>
          <span className={labelCls}>Hasta</span>
          <p className="text-sm font-medium text-gray-900">
            {fixedPatient.firstName} {fixedPatient.lastName}
          </p>
        </div>
      ) : newMode ? (
        <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Yeni Hasta
            </span>
            <button
              type="button"
              onClick={() => setNewMode(false)}
              className="text-xs text-brand-600 hover:underline"
            >
              Mevcut hastadan seç
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              placeholder="Ad"
              value={nFirst}
              onChange={(e) => setNFirst(e.target.value)}
              className={inputCls}
            />
            <input
              placeholder="Soyad"
              value={nLast}
              onChange={(e) => setNLast(e.target.value)}
              className={inputCls}
            />
            <PhoneInput
              value={nPhone}
              onChange={setNPhone}
              inputClassName={inputCls}
            />
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className={labelCls + " mb-0"}>Hasta</span>
            <button
              type="button"
              onClick={() => setNewMode(true)}
              className="text-xs text-brand-600 hover:underline"
            >
              + Yeni hasta
            </button>
          </div>
          <SelectInput
            value={patientId}
            onChange={setPatientId}
            searchable
            placeholder="Hasta seçin"
            inputClassName={inputCls}
            options={(patients ?? []).map((p) => ({
              value: p._id,
              label: `${p.firstName} ${p.lastName} · ${p.phone}`,
            }))}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tarih</label>
          <DateInput value={date} onChange={setDate} inputClassName={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Saat</label>
          <TimeInput value={time} onChange={setTime} inputClassName={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Durum</label>
        <SelectInput
          value={status}
          onChange={(v) => setStatus(v as BookingStatus)}
          inputClassName={inputCls}
          options={STATUS_OPTIONS.map((s) => ({
            value: s,
            label: STATUS[s].label,
          }))}
        />
      </div>

      <div>
        <label className={labelCls}>Not</label>
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
          onClick={onCancel}
          className="border border-gray-300 text-gray-600 font-semibold px-5 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors"
        >
          İptal
        </button>
      </div>
    </div>
  );
}
