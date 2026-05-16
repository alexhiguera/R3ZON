"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";

type Tone = "danger" | "warning" | "info";

export type ConfirmDialogOptions = {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  /** Texto que el usuario debe escribir para habilitar Confirmar (acciones críticas). */
  requireTyping?: string;
};

type Resolver = (ok: boolean) => void;

const TONE_STYLES: Record<Tone, { border: string; bg: string; text: string; cta: string }> = {
  danger: {
    border: "border-rose-400/30",
    bg: "bg-rose-500/10",
    text: "text-rose-200",
    cta: "bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white",
  },
  warning: {
    border: "border-amber-400/30",
    bg: "bg-amber-500/10",
    text: "text-amber-200",
    cta: "bg-gradient-to-r from-amber-400 to-orange-500 text-bg",
  },
  info: {
    border: "border-cyan-400/30",
    bg: "bg-cyan-500/10",
    text: "text-cyan-200",
    cta: "bg-gradient-to-r from-cyan to-fuchsia text-bg",
  },
};

/**
 * Hook para mostrar un diálogo de confirmación coherente con el design system
 * R3ZON, sustituyendo `window.confirm()` (que rompe el visual y no es accesible).
 *
 * Uso:
 *   const { confirm, dialog } = useConfirmDialog();
 *   const ok = await confirm({ title: "¿Eliminar cliente?", message: "Esta acción es irreversible.", tone: "danger" });
 *   if (!ok) return;
 *   // ...continuar
 *
 *   // Recordar renderizar `{dialog}` en el JSX del componente.
 */
export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const resolverRef = useRef<Resolver | null>(null);

  const confirm = useCallback((opts: ConfirmDialogOptions): Promise<boolean> => {
    setOptions(opts);
    setTyped("");
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setOptions(null);
    setBusy(false);
    setTyped("");
  }, []);

  useEffect(
    () => () => {
      resolverRef.current?.(false);
    },
    [],
  );

  const tone = options?.tone ?? "danger";
  const styles = TONE_STYLES[tone];
  const typingOk = !options?.requireTyping || typed.trim() === options.requireTyping.trim();

  const dialog = options ? (
    <Modal
      open={true}
      onClose={() => !busy && close(false)}
      size="sm"
      title={
        <div className="flex items-center gap-3">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl border ${styles.border} ${styles.bg} ${styles.text}`}
          >
            <AlertTriangle size={16} />
          </span>
          <h2 className="font-display text-lg font-bold text-text-hi">{options.title}</h2>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="text-sm text-text-mid">{options.message}</div>

        {options.requireTyping && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-text-lo">
              Escribe <span className="font-mono text-text-hi">{options.requireTyping}</span> para
              confirmar
            </span>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              className="rounded-xl border border-indigo-400/25 bg-indigo-950/40 px-3 py-2 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
              placeholder={options.requireTyping}
            />
          </label>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => close(false)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-4 py-2 text-sm font-medium text-text-hi hover:border-cyan/40 disabled:opacity-50"
          >
            {options.cancelLabel ?? "Cancelar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setBusy(true);
              close(true);
            }}
            disabled={busy || !typingOk}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50 ${styles.cta}`}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {options.confirmLabel ?? "Confirmar"}
          </button>
        </div>
      </div>
    </Modal>
  ) : null;

  return { confirm, dialog };
}
