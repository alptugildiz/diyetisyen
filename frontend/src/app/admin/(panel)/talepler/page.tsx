"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  adminGetRequests,
  adminConvertRequest,
  adminUpdateRequest,
} from "@/lib/api";
import { REQUEST_STATUS } from "@/lib/requestStatus";
import { formatPhone, isValidPhone } from "@/lib/phone";
import { DateInput, TimeInput } from "@/components/admin/DateTimeInput";
import PhoneInput from "@/components/admin/PhoneInput";
import {
  Button,
  EmptyState,
  Field,
  INPUT_CLS,
  Modal,
  useConfirm,
} from "@/components/admin/ui";
import type { AppointmentRequest } from "@/types";

// "Ali Vural" → { firstName: "Ali", lastName: "Vural" }
function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return {
    firstName: parts.slice(0, -1).join(" ") || parts[0] || "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
  };
}

export default function AdminTaleplerPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";
  const router = useRouter();
  const confirm = useConfirm();

  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<AppointmentRequest | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [withBooking, setWithBooking] = useState(true);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setRequests(await adminGetRequests(token));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const openConvert = (req: AppointmentRequest) => {
    const { firstName: f, lastName: l } = splitName(req.name);
    setConverting(req);
    setFirstName(f);
    setLastName(l);
    setPhone(formatPhone(req.phone));
    setWithBooking(true);
    setDate("");
    setTime("");
    setError("");
  };

  const save = async () => {
    if (!converting) return;
    if (!firstName || !lastName) {
      setError("Ad ve soyad zorunludur.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("Geçerli bir telefon girin: 0(5xx)xxx xx xx");
      return;
    }
    if (withBooking && !date) {
      setError("Randevu için tarih seçmelisin.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await adminConvertRequest(
        converting._id,
        {
          firstName,
          lastName,
          phone,
          source: "web_sitesi",
          booking: withBooking ? { date, time } : undefined,
        },
        token,
      );
      setConverting(null);
      router.push(`/admin/hastalar/${res.patient._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const ignore = async (req: AppointmentRequest) => {
    const ok = await confirm({
      title: "Talep yoksayılsın mı?",
      message: `${req.name} talebi listede kalır ama "yoksayıldı" olarak işaretlenir.`,
      confirmLabel: "Yoksay",
    });
    if (!ok) return;
    await adminUpdateRequest(req._id, "yoksayildi", token);
    await load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Randevu Talepleri
      </h1>
      <p className="text-gray-500 mb-6">
        Siteden gelen talepler burada toplanır.
      </p>

      {loading ? (
        <p className="text-gray-400">Yükleniyor…</p>
      ) : requests.length === 0 ? (
        <EmptyState
          title="Bekleyen talep yok"
          description="Sitedeki randevu formu doldurulduğunda burada görünür."
        />
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req._id}
              className="bg-white border border-gray-200 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-gray-900">
                      {req.name}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full ${REQUEST_STATUS[req.status].badge}`}
                    >
                      {REQUEST_STATUS[req.status].label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {req.phone} · {req.email}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(req.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
                {req.status === "yeni" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => openConvert(req)}>
                      Danışan Oluştur
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => ignore(req)}
                    >
                      Yoksay
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={converting !== null}
        onClose={() => setConverting(null)}
        title="Danışan Oluştur"
        footer={
          <>
            <Button onClick={save} loading={saving}>
              Kaydet
            </Button>
            <Button variant="secondary" onClick={() => setConverting(null)}>
              Vazgeç
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ad">
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={INPUT_CLS}
              />
            </Field>
            <Field label="Soyad">
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={INPUT_CLS}
              />
            </Field>
          </div>
          <Field
            label="Telefon"
            hint="Siteden gelen numara otomatik biçimlendirildi"
          >
            <PhoneInput
              value={phone}
              onChange={setPhone}
              inputClassName={INPUT_CLS}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={withBooking}
              onChange={(e) => setWithBooking(e.target.checked)}
            />
            Aynı anda randevu da ver
          </label>

          {withBooking && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tarih">
                <DateInput
                  value={date}
                  onChange={setDate}
                  inputClassName={INPUT_CLS}
                />
              </Field>
              <Field label="Saat">
                <TimeInput
                  value={time}
                  onChange={setTime}
                  inputClassName={INPUT_CLS}
                />
              </Field>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
