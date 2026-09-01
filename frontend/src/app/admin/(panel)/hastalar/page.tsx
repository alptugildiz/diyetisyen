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
import {
  Button,
  DataTable,
  EmptyState,
  Field,
  INPUT_CLS,
  Modal,
  useConfirm,
  type Column,
} from "@/components/admin/ui";
import type { Patient, PatientSource } from "@/types";

export default function AdminHastalarPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";
  const confirm = useConfirm();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<PatientSource | "">("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Arama sunucuda yapılıyor; 300ms debounce ile her tuşta istek atmıyoruz.
  useEffect(() => {
    if (!token) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await adminGetPatients(token, {
          q: search.trim() || undefined,
          page,
        });
        setPatients(res.patients);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [token, search, page, reloadKey]);

  // Arama değişince ilk sayfaya dön
  useEffect(() => {
    setPage(1);
  }, [search]);

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
      await adminCreatePatient(
        { firstName, lastName, phone, source: source || null, note },
        token,
      );
      resetForm();
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Patient) => {
    const ok = await confirm({
      title: "Danışan silinsin mi?",
      message: `${p.firstName} ${p.lastName} ile birlikte tüm randevuları, paketleri ve tahsilatları silinecek.`,
      confirmLabel: "Sil",
      danger: true,
    });
    if (!ok) return;
    await adminDeletePatient(p._id, token);
    setReloadKey((k) => k + 1);
  };

  const columns: Column<Patient>[] = [
    {
      key: "name",
      header: "Ad Soyad",
      render: (p) => (
        <Link
          href={`/admin/hastalar/${p._id}`}
          className="text-gray-900 font-medium hover:text-brand-600"
        >
          {p.firstName} {p.lastName}
        </Link>
      ),
    },
    { key: "phone", header: "Telefon", render: (p) => p.phone },
    {
      key: "note",
      header: "Not",
      hideOnMobile: true,
      render: (p) => (
        <span className="text-gray-400 line-clamp-1">{p.note}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <div className="flex gap-3 justify-end">
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
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Danışanlar</h1>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Yeni Danışan
        </Button>
      </div>

      <input
        placeholder="Ad, soyad veya telefon ara…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`${INPUT_CLS} mb-6 max-w-md`}
      />

      {loading ? (
        <p className="text-gray-400">Yükleniyor…</p>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={patients}
            keyOf={(p) => p._id}
            empty={
              <EmptyState
                title={
                  search.trim() ? "Eşleşen danışan yok" : "Henüz danışan yok"
                }
                description={
                  search.trim()
                    ? "Farklı bir ad veya telefon dene."
                    : "İlk danışanı ekleyerek başla."
                }
              />
            }
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-400">{total} danışan</p>
              <div className="flex gap-2 items-center">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Önceki
                </Button>
                <span className="text-sm text-gray-500 tabular-nums">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sonraki
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        open={showForm}
        onClose={resetForm}
        title="Yeni Danışan"
        footer={
          <>
            <Button onClick={handleSave} loading={saving}>
              Kaydet
            </Button>
            <Button variant="secondary" onClick={resetForm}>
              İptal
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
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
            <Field label="Telefon">
              <PhoneInput
                value={phone}
                onChange={setPhone}
                inputClassName={INPUT_CLS}
              />
            </Field>
            <Field label="Kaynak" hint="Opsiyonel">
              <SelectInput
                value={source}
                onChange={(v) => setSource(v as PatientSource)}
                inputClassName={INPUT_CLS}
                placeholder="Nereden geldi?"
                options={PATIENT_SOURCE_OPTIONS.map((s) => ({
                  value: s,
                  label: PATIENT_SOURCE[s].label,
                }))}
              />
            </Field>
          </div>
          <Field label="Genel Not" hint="Opsiyonel">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className={`${INPUT_CLS} resize-none`}
            />
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
