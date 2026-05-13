"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** Cabecera con título; opcional. */
  title?: React.ReactNode;
  /** Si false, no se cierra al pulsar el backdrop o ESC (uso: durante una operación). */
  dismissable?: boolean;
  /** Tamaño máximo. `full` rellena la pantalla (preview a tamaño completo). */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  children: React.ReactNode;
};

const SIZE_CLS: Record<NonNullable<ModalProps["size"]>, string> = {
  sm:   "max-w-md",
  md:   "max-w-lg",
  lg:   "max-w-2xl",
  xl:   "max-w-4xl",
  full: "max-w-none m-0 h-screen rounded-none",
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** Modal con backdrop blur, ESC, click-outside, focus trap y focus return. */
export function Modal({
  open,
  onClose,
  title,
  dismissable = true,
  size = "lg",
  className,
  children,
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Escape para cerrar (solo si es dismissable).
  useEffect(() => {
    if (!open || !dismissable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissable, onClose]);

  // Bloquea scroll del body cuando está abierto.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [open]);

  // Focus management: guardar foco previo al abrir, restaurar al cerrar,
  // mover foco al primer focusable interno o al propio dialog.
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = (document.activeElement as HTMLElement) ?? null;
    // Espera al siguiente tick para que el contenido esté montado.
    const t = setTimeout(() => {
      const root = dialogRef.current;
      if (!root) return;
      const first = root.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? root).focus({ preventScroll: true });
    }, 0);
    return () => {
      clearTimeout(t);
      // Restauramos el foco al cerrar.
      const prev = previouslyFocusedRef.current;
      if (prev && typeof prev.focus === "function") {
        prev.focus({ preventScroll: true });
      }
    };
  }, [open]);

  // Focus trap: Tab y Shift+Tab quedan confinados al diálogo.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const hasStringTitle = typeof title === "string";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={dismissable ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={hasStringTitle ? titleId : undefined}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "card-glass w-full overflow-y-auto p-5",
          "max-h-[90vh]",
          SIZE_CLS[size],
          className,
        )}
      >
        {(title || dismissable) && (
          <div className="mb-4 flex items-center justify-between gap-3">
            {hasStringTitle ? (
              <h2 id={titleId} className="font-display text-lg font-bold text-text-hi">
                {title}
              </h2>
            ) : (
              <div className="min-w-0 flex-1">{title}</div>
            )}
            {dismissable && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-mid hover:text-text-hi"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
