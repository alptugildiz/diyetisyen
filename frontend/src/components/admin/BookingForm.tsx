"use client";

import { useState } from "react";
import {
  adminCreateBooking,
  adminCreateRecurringBookings,
  adminUpdateBooking,
  adminCreatePatient,
  ApiConflictError,
} from "@/lib/api";
import { STATUS, STATUS_OPTIONS } from "@/lib/bookingStatus";
import { CANCEL_REASON, CANCEL_REASON_OPTIONS } from "@/lib/bookingCancelReason";
import { VISIT_TYPE } from "@/lib/bookingVisitType";
import {
  DateInput,
  TimeInput,
  SelectInput,
} from "@/components/admin/DateTimeInput";
import PhoneInput from "@/components/admin/PhoneInput";
import { isValidPhone } from "@/lib/phone";
import type { Booking, BookingCancelReason, BookingStatus, Patient } from "@/types";

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
  const [cancelReason, setCancelReason] = useState<BookingCancelReason | "">(
    initial?.cancelReason ?? "",
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const needsCancelReason = status === "iptal" || status === "gelmedi";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<{ patientName: string } | null>(null);

  const handleSave = async (force = false) => {
    if (!date) {
      setError("Tarih zorunludur.");
      return;
    }
    if (needsCancelReason && !cancelReason) {
      setError("İptal veya gelmeme durumunda neden seçmelisiniz.");
      return;
    }
    setSaving(true);
    setError("");
    setConflict(null);
    try {
      let pid = patientId;

      // Quick-create a new patient inline
      if (!fixedPatient && newMode) {
        if (!nFirst || !nLast || !nPhone) {
          setError("Yeni danışan için ad, soyad ve telefon gerekli.");
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
        setError("Lütfen bir danışan seçin.");
        setSaving(false);
        return;
      }

      // Seri randevu yalnızca yeni kayıtta anlamlı; düzenlemede tekrar yok.
      if (!initial && repeatWeeks > 1) {
        const result = await adminCreateRecurringBookings(
          { patient: pid, date, time, note, repeatWeeks },
          token,
        );
        if (result.skipped.length > 0) {
          setError(
            `${result.created.length} randevu oluşturuldu. ${result.skipped
              .map((s) => s.date)
              .join(", ")} tarihleri dolu olduğu için atlandı.`,
          );
        }
        onSaved(result.created[0]);
        return;
      }

      const payload = {
        patient: pid,
        date,
        time,
        status,
        cancelReason: needsCancelReason ? cancelReason || null : null,
        note,
      };
      const saved = initial
        ? await adminUpdateBooking(initial._id, payload, token, force)
        : await adminCreateBooking(payload, token, force);
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiConflictError) {
        const body = err.body as {
          conflict?: { patient?: { firstName: string; lastName: string } };
        };
        const p = body.conflict?.patient;
        setConflict({
          patientName: p ? `${p.firstName} ${p.lastName}` : "başka bir danışan",
        });
        return;
      }
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
          <span className={labelCls}>Danışan</span>
          <p className="text-sm font-medium text-gray-900">
            {fixedPatient.firstName} {fixedPatient.lastName}
          </p>
        </div>
      ) : newMode ? (
        <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Yeni Danışan
            </span>
            <button
              type="button"
              onClick={() => setNewMode(false)}
              className="text-xs text-brand-600 hover:underline"
            >
              Mevcut danışandan seç
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
            <span className={labelCls + " mb-0"}>Danışan</span>
            <button
              type="button"
              onClick={() => setNewMode(true)}
              className="text-xs text-brand-600 hover:underline"
            >
              + Yeni danışan
            </button>
          </div>
          <SelectInput
            value={patientId}
            onChange={setPatientId}
            searchable
            placeholder="Danışan seçin"
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

      {initial && <div>
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
      </div>}

      {needsCancelReason && (
        <div>
          <label className={labelCls}>Neden</label>
          <SelectInput
            value={cancelReason}
            onChange={(v) => setCancelReason(v as BookingCancelReason)}
            inputClassName={inputCls}
            placeholder="Neden seçin"
            options={CANCEL_REASON_OPTIONS.map((r) => ({
              value: r,
              label: CANCEL_REASON[r].label,
            }))}
          />
        </div>
      )}

      {initial?.visitType && (
        <div>
          <span className={labelCls}>Ziyaret Tipi</span>
          <span
            className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${VISIT_TYPE[initial.visitType].badge}`}
          >
            {VISIT_TYPE[initial.visitType].label}
          </span>
        </div>
      )}

      {!initial && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls + " mb-0"}>Tekrar</label>
            <span className="text-xs text-gray-400">
              Aynı saatte haftalık seri
            </span>
          </div>
          <SelectInput
            value={String(repeatWeeks)}
            onChange={(v) => setRepeatWeeks(Number(v))}
            inputClassName={inputCls}
            options={[
              { value: "1", label: "Tekrar yok" },
              { value: "4", label: "4 hafta" },
              { value: "8", label: "8 hafta" },
              { value: "12", label: "12 hafta" },
            ]}
          />
        </div>
      )}

      <div>
        <label className={labelCls}>Not</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className={inputCls + " resize-none"}
        />
      </div>

      {conflict && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            Bu saatte <strong>{conflict.patientName}</strong> randevusu var.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors"
            >
              Yine de kaydet
            </button>
            <button
              onClick={() => setConflict(null)}
              className="border border-amber-300 text-amber-800 font-semibold px-4 py-1.5 rounded-lg text-sm hover:bg-amber-100 transition-colors"
            >
              Saati değiştir
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 justify-end">
        <button
          onClick={() => handleSave()}
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
