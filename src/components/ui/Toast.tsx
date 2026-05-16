"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ToastKind = "ok" | "err" | "info";
export type Toast = { id: number; kind: ToastKind; msg: string };

type ToastContextValue = {
  push: (kind: ToastKind, msg: string) => void;
  ok: (msg: string) => void;
  err: (msg: string) => void;
  info: (msg: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICON: Record<ToastKind, typeof CheckCircle2> = {
  ok: CheckCircle2,
  err: AlertCircle,
  info: Info,
};

const TONE: Record<ToastKind, string> = {
  ok: "border-ok/40 bg-ok/10 text-ok",
  err: "border-danger/40 bg-danger/10 text-danger",
  info: "border-cyan/40 bg-cyan/10 text-cyan",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, msg: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, kind, msg }]);
      setTimeout(() => remove(id), 4500);
    },
    [remove],
  );

  const value: ToastContextValue = {
    push,
    ok: (msg) => push("ok", msg),
    err: (msg) => push("err", msg),
    info: (msg) => push("info", msg),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] mx-auto flex max-w-md flex-col items-center gap-2 px-3"
      >
        {toasts.map((t) => {
          const Icon = ICON[t.kind];
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-glass ${TONE[t.kind]}`}
            >
              <Icon size={15} className="mt-0.5 shrink-0" />
              <span className="flex-1 leading-snug">{t.msg}</span>
              <button
                onClick={() => remove(t.id)}
                aria-label="Cerrar aviso"
                className="shrink-0 rounded-md p-0.5 hover:bg-black/10"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: (_, msg) => console.warn("[toast no provider]", msg),
      ok: (msg) => console.warn("[toast no provider]", msg),
      err: (msg) => console.warn("[toast no provider]", msg),
      info: (msg) => console.warn("[toast no provider]", msg),
    };
  }
  return ctx;
}

/**
 * Detecta errores de red comunes (offline, fetch failed) para mostrar un toast
 * unificado. Devuelve true si la app debe mostrar el banner de red caída.
 */
export function useNetworkStatus(onOffline?: () => void, onOnline?: () => void) {
  useEffect(() => {
    const off = () => onOffline?.();
    const on = () => onOnline?.();
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    return () => {
      window.removeEventListener("offline", off);
      window.removeEventListener("online", on);
    };
  }, [onOffline, onOnline]);
}
