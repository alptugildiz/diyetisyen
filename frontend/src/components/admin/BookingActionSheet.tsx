"use client";

import { useEffect, useState } from "react";
import { adminCompleteBooking, adminGetPatientPackages } from "@/lib/api";
import { CANCEL_REASON, CANCEL_REASON_OPTIONS } from "@/lib/bookingCancelReason";
import { PAYMENT_METHOD, PAYMENT_METHOD_OPTIONS } from "@/lib/paymentMethod";
import { SelectInput } from "@/components/admin/DateTimeInput";
import { Button, Field, INPUT_CLS, Modal } from "@/components/admin/ui";
import type {
  Booking,
  BookingCancelReason,
  PatientPackage,
  PaymentMethod,
} from "@/types";

type Outcome = "geldi" | "gelmedi" | "iptal";

const OUTCOMES: { key: Outcome; label: string }[] = [
  { key: "geldi", label: "Geldi" },
  { key: "gelmedi", label: "Gelmedi" },
  { key: "iptal", label: "İptal" },
];

export default function BookingActionSheet({
  booking,
  token,
  onClose,
  onSaved,
}: {
  booking: Booking | null;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [outcome, setOutcome] = useState<Outcome>("geldi");
  const [packages, setPackages] = useState<PatientPackage[]>([]);
  const [usePackage, setUsePackage] = useState(false);
  const [packageId, setPackageId] = useState("");
  const [fee, setFee] = useState(0);
  const [collectNow, setCollectNow] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>("nakit");
  const [documentNumber, setDocumentNumber] = useState("");
  const [reason, setReason] = useState<BookingCancelReason>("belirtilmedi");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Danışanın kullanılabilir paketi varsa "paketten düş" öne çıksın.
  useEffect(() => {
    if (!booking || !token) return;
    setOutcome("geldi");
    setFee(0);
    setCollectNow(true);
    setMethod("nakit");
    setDocumentNumber("");
    setReason("belirtilmedi");
    setError("");

    adminGetPatientPackages(token, { patient: booking.patient._id })
      .then((all) => {
        const usable = all.filter(
          (p) => p.status === "aktif" && p.remainingSessions > 0,
        );
        setPackages(usable);
        setUsePackage(usable.length > 0);
        setPackageId(usable[0]?._id ?? "");
      })
      .catch(() => {
        setPackages([]);
        setUsePackage(false);
      });
  }, [booking, token]);

  if (!booking) return null;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (outcome === "geldi") {
        await adminCompleteBooking(
          booking._id,
          usePackage
            ? { status: "geldi", patientPackage: packageId }
            : {
                status: "geldi",
                fee,
                // Tahsilat girilmezse ücret alacak olarak kalır.
                payment: collectNow
                  ? { amount: fee, method, documentNumber }
                  : undefined,
              },
          token,
        );
      } else {
        await adminCompleteBooking(
          booking._id,
          { status: outcome, cancelReason: reason },
          token,
        );
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const title = `${booking.time || ""} ${booking.patient.firstName} ${booking.patient.lastName}`.trim();

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={handleSave} loading={saving}>
            Kaydet
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Ne oldu?</p>
          <div className="grid grid-cols-3 gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o.key}
                onClick={() => setOutcome(o.key)}
                className={`py-3 rounded-xl text-sm font-medium border transition-colors ${
                  outcome === o.key
                    ? "bg-brand-500 border-brand-500 text-white"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {outcome === "geldi" ? (
          <>
            {packages.length > 0 && (
              <div className="space-y-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="feeSource"
                    checked={usePackage}
                    onChange={() => setUsePackage(true)}
                  />
                  Paketten düş
                </label>
                {usePackage && (
                  <SelectInput
                    value={packageId}
                    onChange={setPackageId}
                    inputClassName={INPUT_CLS}
                    options={packages.map((p) => ({
                      value: p._id,
                      label: `${p.name} · ${p.usedSessions}/${p.sessionCount}`,
                    }))}
                  />
                )}
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="feeSource"
                    checked={!usePackage}
                    onChange={() => setUsePackage(false)}
                  />
                  Tek seans
                </label>
              </div>
            )}

            {!usePackage && (
              <>
                <Field label="Ücret (₺)">
                  <input
                    type="number"
                    min={0}
                    value={fee === 0 ? "" : fee}
                    placeholder="0"
                    onChange={(e) => setFee(Number(e.target.value))}
                    className={INPUT_CLS}
                  />
                </Field>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Tahsilat
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCollectNow(true)}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                        collectNow
                          ? "bg-brand-500 border-brand-500 text-white"
                          : "border-gray-300 text-gray-600"
                      }`}
                    >
                      Tahsil edildi
                    </button>
                    <button
                      onClick={() => setCollectNow(false)}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                        !collectNow
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "border-gray-300 text-gray-600"
                      }`}
                    >
                      Sonra
                    </button>
                  </div>
                  {!collectNow && fee > 0 && (
                    <p className="text-xs text-amber-600 mt-2">
                      Bu tutar alacak olarak takip edilecek.
                    </p>
                  )}
                </div>

                {collectNow && (
                  <>
                    <Field label="Ödeme Yöntemi">
                      <SelectInput
                        value={method}
                        onChange={(v) => setMethod(v as PaymentMethod)}
                        inputClassName={INPUT_CLS}
                        options={PAYMENT_METHOD_OPTIONS.map((m) => ({
                          value: m,
                          label: PAYMENT_METHOD[m].label,
                        }))}
                      />
                    </Field>
                    <Field label="Belge / Fatura No" hint="Opsiyonel">
                      <input
                        value={documentNumber}
                        onChange={(e) => setDocumentNumber(e.target.value)}
                        className={INPUT_CLS}
                      />
                    </Field>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <Field label="Neden">
            <SelectInput
              value={reason}
              onChange={(v) => setReason(v as BookingCancelReason)}
              inputClassName={INPUT_CLS}
              options={CANCEL_REASON_OPTIONS.map((r) => ({
                value: r,
                label: CANCEL_REASON[r].label,
              }))}
            />
          </Field>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </Modal>
  );
}
