"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { submitAppointment } from "@/lib/api";

type Status = "idle" | "loading" | "success" | "error";

export default function AppointmentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const modalRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    // Reset after animation
    setTimeout(() => {
      setStatus("idle");
      setErrorMsg("");
      setForm({ name: "", email: "", phone: "" });
    }, 300);
  }, []);

  // Listen for custom event
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("open-appointment-modal", handler);
    return () => window.removeEventListener("open-appointment-modal", handler);
  }, []);

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      await submitAppointment({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      setStatus("success");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Bir hata oluştu, lütfen tekrar deneyin.",
      );
      setStatus("error");
    }
  };

  if (!isOpen) return null;

  const inputCls =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md rounded-2xl bg-white border border-brand-100 shadow-xl p-7 animate-modal-in"
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Kapat"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {status === "success" ? (
          /* ── Success State ── */
          <div className="text-center py-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-5">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3 className="font-oswald text-xl font-bold text-gray-900 mb-2">
              Talebiniz Alındı
            </h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              En kısa zamanda sizlere geri dönüş sağlayacağız.
            </p>
            <button
              onClick={close}
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-8 py-3 rounded-full transition-colors duration-200"
            >
              Kapat
            </button>
          </div>
        ) : (
          /* ── Form State ── */
          <>
            <div className="mb-6">
              <h3 className="font-oswald text-xl font-bold text-gray-900">
                Randevu Al
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Bilgilerinizi bırakın, en kısa zamanda sizlere ulaşalım.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="appt-name" className="block text-xs font-medium text-gray-600 mb-1.5">
                  Ad Soyad
                </label>
                <input
                  id="appt-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                  placeholder="Adınız ve soyadınız"
                  disabled={status === "loading"}
                />
              </div>

              <div>
                <label htmlFor="appt-email" className="block text-xs font-medium text-gray-600 mb-1.5">
                  E-posta
                </label>
                <input
                  id="appt-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls}
                  placeholder="ornek@email.com"
                  disabled={status === "loading"}
                />
              </div>

              <div>
                <label htmlFor="appt-phone" className="block text-xs font-medium text-gray-600 mb-1.5">
                  Telefon Numarası
                </label>
                <input
                  id="appt-phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputCls}
                  placeholder="05XX XXX XX XX"
                  disabled={status === "loading"}
                />
              </div>

              {status === "error" && (
                <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="mt-1 w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-full transition-colors duration-200 flex items-center justify-center gap-2"
              >
                {status === "loading" ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Gönderiliyor...
                  </>
                ) : (
                  "Randevu Al"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
