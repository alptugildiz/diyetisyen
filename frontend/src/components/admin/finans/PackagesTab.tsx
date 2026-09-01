"use client";

import { useEffect, useState } from "react";
import {
  adminGetPackages,
  adminCreatePackage,
  adminUpdatePackage,
  adminDeletePackage,
} from "@/lib/api";
import { formatTRY } from "@/lib/periods";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Field,
  INPUT_CLS,
  Modal,
  useConfirm,
  type Column,
} from "@/components/admin/ui";
import type { Package } from "@/types";

export default function PackagesTab({ token }: { token: string }) {
  const confirm = useConfirm();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Package | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sessionCount, setSessionCount] = useState(8);
  const [price, setPrice] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      setPackages(await adminGetPackages(token));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openNew = () => {
    setEditing(null);
    setName("");
    setSessionCount(8);
    setPrice(0);
    setError("");
    setOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditing(pkg);
    setName(pkg.name);
    setSessionCount(pkg.sessionCount);
    setPrice(pkg.price);
    setError("");
    setOpen(true);
  };

  const save = async () => {
    if (!name.trim()) {
      setError("Paket adı zorunludur.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = { name, sessionCount, price };
      if (editing) await adminUpdatePackage(editing._id, data, token);
      else await adminCreatePackage(data, token);
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (pkg: Package) => {
    await adminUpdatePackage(pkg._id, { isActive: !pkg.isActive }, token);
    await load();
  };

  const remove = async (pkg: Package) => {
    const ok = await confirm({
      title: "Paket silinsin mi?",
      message: `"${pkg.name}" katalogdan kalkacak. Bu paketten yapılmış satışlar etkilenmez.`,
      confirmLabel: "Sil",
      danger: true,
    });
    if (!ok) return;
    await adminDeletePackage(pkg._id, token);
    await load();
  };

  const columns: Column<Package>[] = [
    { key: "name", header: "Paket", render: (p) => p.name },
    {
      key: "sessions",
      header: "Seans",
      render: (p) => `${p.sessionCount} seans`,
    },
    {
      key: "price",
      header: "Fiyat",
      align: "right",
      render: (p) => (
        <span className="font-medium tabular-nums">{formatTRY(p.price)}</span>
      ),
    },
    {
      key: "status",
      header: "Durum",
      render: (p) => (
        <Badge tone={p.isActive ? "emerald" : "gray"}>
          {p.isActive ? "Aktif" : "Pasif"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => openEdit(p)}
            className="text-brand-600 hover:underline font-medium"
          >
            Düzenle
          </button>
          <button
            onClick={() => toggleActive(p)}
            className="text-gray-500 hover:underline font-medium"
          >
            {p.isActive ? "Pasifleştir" : "Aktifleştir"}
          </button>
          <button
            onClick={() => remove(p)}
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
      <div className="flex justify-between items-center gap-3 mb-4">
        <p className="text-sm text-gray-500">
          Satışta seçilebilecek paket şablonları. Fiyat değişikliği geçmiş
          satışları etkilemez.
        </p>
        <Button onClick={openNew}>+ Yeni Paket</Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Yükleniyor…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={packages}
          keyOf={(p) => p._id}
          empty={
            <EmptyState
              title="Henüz paket tanımı yok"
              description="Satışta seçebilmek için önce bir paket tanımla."
              action={<Button onClick={openNew}>Paket ekle</Button>}
            />
          }
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Paketi Düzenle" : "Yeni Paket"}
        footer={
          <>
            <Button onClick={save} loading={saving}>
              Kaydet
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Paket Adı">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="8 Seans Kilo Yönetimi"
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Seans Sayısı">
            <input
              type="number"
              min={1}
              value={sessionCount}
              onChange={(e) => setSessionCount(Number(e.target.value))}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Fiyat (₺)">
            <input
              type="number"
              min={0}
              value={price === 0 ? "" : price}
              placeholder="0"
              onChange={(e) => setPrice(Number(e.target.value))}
              className={INPUT_CLS}
            />
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
