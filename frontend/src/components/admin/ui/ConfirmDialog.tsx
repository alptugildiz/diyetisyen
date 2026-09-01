"use client";

import { createContext, useCallback, useContext, useState } from "react";
import Modal from "./Modal";
import Button from "./Button";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}

type Resolver = (ok: boolean) => void;

const ConfirmContext = createContext<
  ((opts: ConfirmOptions) => Promise<boolean>) | null
>(null);

// Native confirm() yerine: tasarımla uyumlu ve mobilde kullanılabilir.
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    opts: ConfirmOptions;
    resolve: Resolver;
  } | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setState({ opts, resolve })),
    [],
  );

  const close = (ok: boolean) => {
    state?.resolve(ok);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={state !== null}
        onClose={() => close(false)}
        title={state?.opts.title ?? ""}
        footer={
          <>
            <Button
              variant={state?.opts.danger ? "danger" : "primary"}
              onClick={() => close(true)}
            >
              {state?.opts.confirmLabel ?? "Onayla"}
            </Button>
            <Button variant="secondary" onClick={() => close(false)}>
              Vazgeç
            </Button>
          </>
        }
      >
        {state?.opts.message && (
          <p className="text-sm text-gray-600">{state.opts.message}</p>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx;
}
