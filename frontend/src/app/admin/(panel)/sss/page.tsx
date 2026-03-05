"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  adminGetFaqs,
  adminCreateFaq,
  adminUpdateFaq,
  adminDeleteFaq,
} from "@/lib/api";
import type { Faq } from "@/types";

export default function AdminSSSPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);

  // New/edit form state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [order, setOrder] = useState(0);
  const [showForm, setShowForm] = useState(false);

  const fetchFaqs = async () => {
    if (!token) return;
    try {
      const data = await adminGetFaqs(token);
      setFaqs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const resetForm = () => {
    setQuestion("");
    setAnswer("");
    setOrder(0);
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (faq: Faq) => {
    setEditId(faq._id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setOrder(faq.order);
    setShowForm(true);
  };

  const handleSave = async () => {
    const data = { question, answer, order };
    if (editId) {
      const updated = await adminUpdateFaq(editId, data, token);
      setFaqs((prev) => prev.map((f) => (f._id === editId ? updated : f)));
    } else {
      const created = await adminCreateFaq(data, token);
      setFaqs((prev) => [...prev, created]);
    }
    resetForm();
  };

  const handleDelete = async (id: string, q: string) => {
    if (!confirm(`"${q}" silinsin mi?`)) return;
    await adminDeleteFaq(id, token);
    setFaqs((prev) => prev.filter((f) => f._id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Sıkça Sorulan Sorular
        </h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          + Yeni Soru
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 space-y-4">
          <h2 className="font-semibold text-gray-900">
            {editId ? "Düzenle" : "Yeni Soru"}
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Soru
            </label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cevap
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sıralama
            </label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className="w-24 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleSave}
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors"
            >
              Kaydet
            </button>
            <button
              onClick={resetForm}
              className="border border-gray-300 text-gray-600 font-semibold px-5 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">Yükleniyor…</p>
      ) : faqs.length === 0 ? (
        <p className="text-gray-400">Henüz soru yok.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">
                  Soru
                </th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600">
                  Sıra
                </th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {faqs.map((faq) => (
                <tr key={faq._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{faq.question}</td>
                  <td className="px-6 py-4 text-gray-400">{faq.order}</td>
                  <td className="px-6 py-4 flex gap-3 justify-end">
                    <button
                      onClick={() => handleEdit(faq)}
                      className="text-brand-600 hover:underline font-medium"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(faq._id, faq.question)}
                      className="text-red-400 hover:underline font-medium"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
