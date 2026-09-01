"use client";

import { useEffect, useState } from "react";
import { adminCreatePayment } from "@/lib/api";
import { formatTRY } from "@/lib/periods";
import { todayISO } from "@/lib/date";
import { PAYMENT_METHOD, PAYMENT_METHOD_OPTIONS } from "@/lib/paymentMethod";
import { DateInput, SelectInput } from "@/components/admin/DateTimeInput";
import { Button, Field, INPUT_CLS, Modal } from "@/components/admin/ui";
import type { PatientPackage, PaymentMethod } from "@/types";

// Paket taksiti kaydeder. Randevu tahsilatı "İşle" akışından girilir;
// buradan yalnızca pakete bağlı ödeme alınır.
export default function AddPaymentModal({
  open,
  token,
  patientId,
  packages,
  onClose,
  onSaved,
}: {
  open: boolean;
  token: string;
  patientId: string;
  packages: PatientPackage[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const openPackages = packages.filter((p) => p.remainingDebt > 0);

  const [packageId, setPackageId] = useState("");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("nakit");
  const [date, setDate] = useState(todayISO());
  const [documentNumber, setDocumentNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const first = openPackages[0];
    setPackageId(first?._id ?? "");
    // Kalan borcu varsayılan tutar yap: en sık girilen değer bu.
    setAmount(first?.remainingDebt ?? 0);
    setMethod("nakit");
    setDate(todayISO());
    setDocumentNumber("");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selected = openPackages.find((p) => p._id === packageId);

  const handleSave = async () => {
    if (!packageId) {
      setError("Bir paket seçmelisin.");
      return;
    }
    if (amount <= 0) {
      setError("Tutar sıfırdan büyük olmalı.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await adminCreatePayment(
        {
          patient: patientId,
          source: "package",
          patientPackage: packageId,
          amount,
          method,
          date,
          documentNumber,
        },
        token,
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tahsilat Ekle"
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
        {openPackages.length === 0 ? (
          <p className="text-sm text-gray-500">
            Borcu olan paket yok. Randevu ücretleri &ldquo;İşle&rdquo;
            akışından tahsil edilir.
          </p>
        ) : (
          <>
            <Field label="Paket">
              <SelectInput
                value={packageId}
                onChange={(v) => {
                  setPackageId(v);
                  const p = openPackages.find((x) => x._id === v);
                  setAmount(p?.remainingDebt ?? 0);
                }}
                inputClassName={INPUT_CLS}
                options={openPackages.map((p) => ({
                  value: p._id,
                  label: `${p.name} · kalan ${formatTRY(p.remainingDebt)}`,
                }))}
              />
            </Field>

            <Field
              label="Tutar (₺)"
              hint={
                selected
                  ? `Kalan borç ${formatTRY(selected.remainingDebt)} — daha azını girip taksit yapabilirsin.`
                  : undefined
              }
            >
              <input
                type="number"
                min={0}
                value={amount === 0 ? "" : amount}
                placeholder="0"
                onChange={(e) => setAmount(Number(e.target.value))}
                className={INPUT_CLS}
              />
            </Field>

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

            <Field label="Tahsilat Tarihi">
              <DateInput
                value={date}
                onChange={setDate}
                inputClassName={INPUT_CLS}
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
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </Modal>
  );
}
