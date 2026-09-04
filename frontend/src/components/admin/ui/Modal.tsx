"use client";

import { useEffect, useRef } from "react";

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape ile kapat, açıkken arka planı kaydırma.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Açılışta odağı modala al, kapanışta çağıran öğeye geri ver — klavyeyle
  // gezen kullanıcı modal kapanınca sayfanın başına düşmesin.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const first = panelRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])',
    );
    (first ?? panelRef.current)?.focus();
    return () => previous?.focus?.();
  }, [open]);

  if (!open) return null;

  return (
    // Masaüstünde ortada bir kutu, telefonda alttan açılan sayfa (sheet):
    // tek elle erişilebilsin diye.
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 md:p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full md:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl p-6 shadow-xl"
      >
        <h2 className="font-semibold text-gray-900 mb-4">{title}</h2>
        {children}
        {footer && <div className="flex gap-3 justify-end mt-6">{footer}</div>}
      </div>
    </div>
  );
}
