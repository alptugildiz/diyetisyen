"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  adminGetFaqs,
  adminCreateFaq,
  adminUpdateFaq,
  adminDeleteFaq,
} from "@/lib/api";
import {
  Button,
  DataTable,
  EmptyState,
  Field,
  INPUT_CLS,
  Modal,
  useConfirm,
  useToast,
  type Column,
} from "@/components/admin/ui";
import type { Faq } from "@/types";

export default function AdminSSSPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";
  const confirm = useConfirm();
  const toast = useToast();

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [order, setOrder] = useState(0);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFaqs = async () => {
      if (!token) return;
      try {
        setFaqs(await adminGetFaqs(token));
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, [token]);

  const resetForm = () => {
    setEditId(null);
    setQuestion("");
    setAnswer("");
    setOrder(0);
    setError("");
    setOpen(false);
  };

  const openNew = () => {
    resetForm();
    setOpen(true);
  };

  const handleEdit = (faq: Faq) => {
    setEditId(faq._id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setOrder(faq.order);
    setError("");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      setError("Soru ve cevap zorunludur.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = { question, answer, order };
      if (editId) {
        const updated = await adminUpdateFaq(editId, data, token);
        setFaqs((prev) => prev.map((f) => (f._id === editId ? updated : f)));
      } else {
        const created = await adminCreateFaq(data, token);
        setFaqs((prev) => [...prev, created]);
      }
      toast.success(editId ? "Soru güncellendi." : "Soru eklendi.");
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kayıt başarısız.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (faq: Faq) => {
    const ok = await confirm({
      title: "Soru silinsin mi?",
      message: `"${faq.question}" kalıcı olarak silinecek.`,
      confirmLabel: "Sil",
      danger: true,
    });
    if (!ok) return;
    await adminDeleteFaq(faq._id, token);
    setFaqs((prev) => prev.filter((f) => f._id !== faq._id));
  };

  const columns: Column<Faq>[] = [
    {
      key: "question",
      header: "Soru",
      render: (f) => <span className="text-gray-900">{f.question}</span>,
    },
    {
      key: "order",
      header: "Sıra",
      render: (f) => <span className="text-gray-400 tabular-nums">{f.order}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (f) => (
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => handleEdit(f)}
            className="text-brand-600 hover:underline font-medium"
          >
            Düzenle
          </button>
          <button
            onClick={() => handleDelete(f)}
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
        <h1 className="text-2xl font-bold text-gray-900">
          Sıkça Sorulan Sorular
        </h1>
        <Button onClick={openNew}>+ Yeni Soru</Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Yükleniyor…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={faqs}
          keyOf={(f) => f._id}
          empty={
            <EmptyState
              title="Henüz soru yok"
              description="Sitede görünecek ilk soruyu ekle."
              action={<Button onClick={openNew}>Soru ekle</Button>}
            />
          }
        />
      )}

      <Modal
        open={open}
        onClose={resetForm}
        title={editId ? "Soruyu Düzenle" : "Yeni Soru"}
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
          <Field label="Soru">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Cevap">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={5}
              className={`${INPUT_CLS} resize-none`}
            />
          </Field>
          <Field label="Sıralama" hint="Küçük sayı üstte görünür">
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className={`${INPUT_CLS} w-28`}
            />
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
