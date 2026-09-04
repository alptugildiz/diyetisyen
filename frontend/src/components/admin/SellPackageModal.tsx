"use client";

import { useEffect, useState } from "react";
import { adminGetPackages, adminCreatePatientPackage } from "@/lib/api";
import { formatTRY } from "@/lib/periods";
import { todayISO } from "@/lib/date";
import { DateInput, SelectInput } from "@/components/admin/DateTimeInput";
import {
  Button,
  Field,
  INPUT_CLS,
  Modal,
  useToast,
} from "@/components/admin/ui";
import type { Package } from "@/types";

// Katalogdan paket satar. Ad/seans/fiyat satış anında kopyalanır
// (snapshot) — katalog sonradan değişse de bu satışın bedeli sabit kalır.
export default function SellPackageModal({
  open,
  token,
  patientId,
  onClose,
  onSaved,
}: {
  open: boolean;
  token: string;
  patientId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [catalogue, setCatalogue] = useState<Package[]>([]);
  const [packageId, setPackageId] = useState("");
  const [soldAt, setSoldAt] = useState(todayISO());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  useEffect(() => {
    if (!open || !token) return;
    setPackageId("");
    setSoldAt(todayISO());
    setNote("");
    setError("");
    adminGetPackages(token, true)
      .then(setCatalogue)
      .catch(() => setCatalogue([]));
  }, [open, token]);

  const selected = catalogue.find((p) => p._id === packageId);

  const handleSave = async () => {
    if (!selected) {
      setError("Bir paket seçmelisin.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await adminCreatePatientPackage(
        {
          patient: patientId,
          package: selected._id,
          name: selected.name,
          sessionCount: selected.sessionCount,
          price: selected.price,
          soldAt,
          note,
        },
        token,
      );
      toast.success("Paket satıldı.");
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kayıt başarısız.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Paket Sat"
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
        {catalogue.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aktif paket tanımı yok. Finans → Paketler bölümünden ekleyebilirsin.
          </p>
        ) : (
          <>
            <Field label="Paket">
              <SelectInput
                value={packageId}
                onChange={setPackageId}
                inputClassName={INPUT_CLS}
                placeholder="Paket seçin"
                options={catalogue.map((p) => ({
                  value: p._id,
                  label: `${p.name} · ${p.sessionCount} seans · ${formatTRY(p.price)}`,
                }))}
              />
            </Field>

            {selected && (
              <p className="text-sm text-gray-500">
                Toplam bedel <strong>{formatTRY(selected.price)}</strong>. Tahsilat
                ayrı kaydedilir — taksitli ödenebilir.
              </p>
            )}

            <Field label="Satış Tarihi">
              <DateInput
                value={soldAt}
                onChange={setSoldAt}
                inputClassName={INPUT_CLS}
              />
            </Field>

            <Field label="Not" hint="Opsiyonel">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className={`${INPUT_CLS} resize-none`}
              />
            </Field>
          </>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </Modal>
  );
}
