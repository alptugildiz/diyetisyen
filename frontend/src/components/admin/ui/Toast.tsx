"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastTone = "success" | "error";
type ToastItem = { id: number; tone: ToastTone; message: string };

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Kayıt geri bildirimi. Panelde bir şeyi kaydettikten sonra ekran sessizce
 * kapanıyordu; kullanıcı işlemin gerçekten olup olmadığını anlayamıyordu.
 *
 * Desen ConfirmProvider ile aynı — aynı projede iki farklı context deseni
 * olmasın.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, tone, message }]);
    // Hata mesajları daha uzun kalsın; kullanıcı okuyup karar verecek.
    const ttl = tone === "error" ? 6000 : 3000;
    window.setTimeout(
      () => setItems((prev) => prev.filter((t) => t.id !== id)),
      ttl,
    );
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m: string) => push("success", m),
      error: (m: string) => push("error", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Mobilde alt sekme çubuğunun üstünde kalmalı. */}
      <div
        className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto z-50 flex flex-col gap-2 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto md:ml-auto md:max-w-sm rounded-xl px-4 py-3 text-sm font-medium shadow-lg border ${
              t.tone === "success"
                ? "bg-emerald-600 border-emerald-700 text-white"
                : "bg-red-600 border-red-700 text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast, ToastProvider içinde kullanılmalı.");
  return ctx;
}
