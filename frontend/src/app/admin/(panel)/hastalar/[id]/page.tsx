"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  adminGetPatient,
  adminUpdatePatient,
  adminDeleteBooking,
  adminGetPatientPackages,
  adminGetPayments,
} from "@/lib/api";
import { STATUS } from "@/lib/bookingStatus";
import { VISIT_TYPE } from "@/lib/bookingVisitType";
import { CANCEL_REASON } from "@/lib/bookingCancelReason";
import { PAYMENT_METHOD } from "@/lib/paymentMethod";
import {
  PROCESS_STATUS,
  PROCESS_STATUS_OPTIONS,
} from "@/lib/patientProcessStatus";
import { formatTRY } from "@/lib/periods";
import { SelectInput } from "@/components/admin/DateTimeInput";
import BookingForm from "@/components/admin/BookingForm";
import SellPackageModal from "@/components/admin/SellPackageModal";
import AddPaymentModal from "@/components/admin/AddPaymentModal";
import {
  Button,
  EmptyState,
  Field,
  INPUT_CLS,
  Modal,
  StatTile,
  Tabs,
  useConfirm,
} from "@/components/admin/ui";
import type {
  Booking,
  Patient,
  PatientPackage,
  PatientProcessStatus,
  Payment,
} from "@/types";

type Tab = "ozet" | "randevular" | "paketler" | "notlar";

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";
  const confirm = useConfirm();

  const [tab, setTab] = useState<Tab>("ozet");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packages, setPackages] = useState<PatientPackage[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [sellOpen, setSellOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [detail, pkgs, pays] = await Promise.all([
        adminGetPatient(id, token),
        adminGetPatientPackages(token, { patient: id }),
        adminGetPayments(token, { patient: id }),
      ]);
      setPatient(detail.patient);
      setBookings(detail.bookings);
      setNote(detail.patient.note ?? "");
      setPackages(pkgs);
      setPayments(pays.payments);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const saveNote = async () => {
    if (!patient) return;
    setSavingNote(true);
    setNoteSaved(false);
    try {
      const updated = await adminUpdatePatient(patient._id, { note }, token);
      setPatient(updated);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } finally {
      setSavingNote(false);
    }
  };

  const changeProcessStatus = async (status: PatientProcessStatus) => {
    if (!patient) return;
    setPatient(await adminUpdatePatient(patient._id, { processStatus: status }, token));
  };

  const handleDeleteBooking = async (b: Booking) => {
    const ok = await confirm({
      title: "Randevu silinsin mi?",
      message: "Bu randevuya bağlı tahsilat varsa o da silinecek.",
      confirmLabel: "Sil",
      danger: true,
    });
    if (!ok) return;
    await adminDeleteBooking(b._id, token);
    fetchDetail();
  };

  if (loading) return <p className="text-gray-400">Yükleniyor…</p>;
  if (notFound || !patient)
    return (
      <div>
        <p className="text-gray-400 mb-4">Danışan bulunamadı.</p>
        <Link href="/admin/hastalar" className="text-brand-600 hover:underline">
          ← Danışanlar
        </Link>
      </div>
    );

  // Türetilen değerler: tahakkuk − tahsilat.
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const packageDebt = packages.reduce((s, p) => s + p.remainingDebt, 0);
  const sessionAccrued = bookings
    .filter((b) => b.status === "geldi" && b.fee > 0 && !b.patientPackage)
    .reduce((s, b) => s + b.fee, 0);
  const sessionPaid = payments
    .filter((p) => p.source === "booking")
    .reduce((s, p) => s + p.amount, 0);
  const totalDebt = Math.max(packageDebt, 0) + Math.max(sessionAccrued - sessionPaid, 0);

  const activePackage = packages.find(
    (p) => p.status === "aktif" && p.remainingSessions > 0,
  );
  // bookings sunucudan date: -1 sırayla geliyor
  const completed = bookings.filter((b) => b.status === "geldi");
  const lastVisit = completed[0];
  const firstVisit = completed[completed.length - 1];

  return (
    <div>
      <Link
        href="/admin/hastalar"
        className="text-sm text-gray-500 hover:text-brand-600"
      >
        ← Danışanlar
      </Link>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-4 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-gray-500 mt-1">☎ {patient.phone}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-40">
              <SelectInput
                value={patient.processStatus}
                onChange={(v) => changeProcessStatus(v as PatientProcessStatus)}
                inputClassName="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
                options={PROCESS_STATUS_OPTIONS.map((s) => ({
                  value: s,
                  label: PROCESS_STATUS[s].label,
                }))}
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              + Randevu Ekle
            </Button>
          </div>
        </div>
      </div>

      <Tabs
        items={[
          { key: "ozet", label: "Özet" },
          { key: "randevular", label: "Randevular", badge: bookings.length },
          { key: "paketler", label: "Paketler & Ödemeler", badge: packages.length },
          { key: "notlar", label: "Notlar" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "ozet" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile label="Toplam Ödediği" value={formatTRY(totalPaid)} />
            <StatTile
              label="Kalan Borç"
              value={formatTRY(totalDebt)}
              accent={totalDebt > 0}
            />
            <StatTile
              label="Aktif Paket"
              value={activePackage ? `${activePackage.remainingSessions} seans` : "—"}
              hint={activePackage?.name}
            />
            <StatTile
              label="Tamamlanan Seans"
              value={String(completed.length)}
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-4 grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">İlk görüşme</p>
              <p className="text-gray-900 font-medium">
                {firstVisit
                  ? new Date(firstVisit.date).toLocaleDateString("tr-TR")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Son görüşme</p>
              <p className="text-gray-900 font-medium">
                {lastVisit
                  ? new Date(lastVisit.date).toLocaleDateString("tr-TR")
                  : "—"}
              </p>
            </div>
          </div>
        </>
      )}

      {tab === "randevular" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          {bookings.length === 0 ? (
            <p className="text-gray-400 text-sm">Bu danışana ait randevu yok.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {bookings.map((b) => (
                <div
                  key={b._id}
                  className="flex items-center gap-3 py-3 flex-wrap"
                >
                  <div className="w-28 shrink-0">
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
                    {b.cancelReason && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Neden: {CANCEL_REASON[b.cancelReason].label}
                      </p>
                    )}
                  </div>
                  {b.status === "geldi" && (
                    <span className="text-sm text-gray-500 tabular-nums">
                      {b.patientPackage ? "Paketten" : formatTRY(b.fee)}
                    </span>
                  )}
                  {b.visitType && (
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${VISIT_TYPE[b.visitType].badge}`}
                    >
                      {VISIT_TYPE[b.visitType].label}
                    </span>
                  )}
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
      )}

      {tab === "paketler" && (
        <div className="space-y-6">
          <div className="flex gap-3 justify-end">
            <Button size="sm" onClick={() => setSellOpen(true)}>
              + Paket Sat
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setPayOpen(true)}>
              + Tahsilat Ekle
            </Button>
          </div>

          {packages.length === 0 ? (
            <EmptyState
              title="Satılmış paket yok"
              description="Katalogdan bir paket seçip satabilirsin."
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {packages.map((p) => (
                <div
                  key={p._id}
                  className="bg-white border border-gray-200 rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(p.soldAt).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Kalan seans</p>
                      <p className="font-semibold text-gray-900 tabular-nums">
                        {p.remainingSessions} / {p.sessionCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Kalan borç</p>
                      <p
                        className={`font-semibold tabular-nums ${p.remainingDebt > 0 ? "text-amber-600" : "text-emerald-600"}`}
                      >
                        {formatTRY(p.remainingDebt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="font-semibold text-gray-900 mb-3">
              Tahsilat Geçmişi
            </h2>
            {payments.length === 0 ? (
              <p className="text-gray-400 text-sm">Henüz tahsilat yok.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center gap-3 py-2.5 flex-wrap"
                  >
                    <span className="text-sm text-gray-500 w-24 shrink-0">
                      {new Date(p.date).toLocaleDateString("tr-TR")}
                    </span>
                    <span className="flex-1 min-w-0 text-sm text-gray-600 truncate">
                      {p.source === "package"
                        ? `Paket · ${p.patientPackage?.name ?? "—"}`
                        : "Randevu"}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full ${PAYMENT_METHOD[p.method].badge}`}
                    >
                      {PAYMENT_METHOD[p.method].label}
                    </span>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">
                      {formatTRY(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "notlar" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <Field
            label="Genel Not"
            hint="Alerji, hedef, tercihler — kalıcı bilgiler"
          >
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={6}
              className={`${INPUT_CLS} resize-none`}
            />
          </Field>
          <div className="flex items-center gap-3 mt-3">
            <Button
              onClick={saveNote}
              loading={savingNote}
              disabled={note === patient.note}
            >
              Notu Kaydet
            </Button>
            {noteSaved && (
              <span className="text-sm text-emerald-600">Kaydedildi ✓</span>
            )}
          </div>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
        title={editing ? "Randevu Düzenle" : "Yeni Randevu"}
      >
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
      </Modal>

      <SellPackageModal
        open={sellOpen}
        token={token}
        patientId={patient._id}
        onClose={() => setSellOpen(false)}
        onSaved={() => {
          setSellOpen(false);
          fetchDetail();
        }}
      />

      <AddPaymentModal
        open={payOpen}
        token={token}
        patientId={patient._id}
        packages={packages}
        onClose={() => setPayOpen(false)}
        onSaved={() => {
          setPayOpen(false);
          fetchDetail();
        }}
      />
    </div>
  );
}
