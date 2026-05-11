"use client";

import { useEffect } from "react";
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

/** Modal con backdrop blur, ESC para cerrar y click-outside. */
export function Modal({
  open,
  onClose,
  title,
  dismissable = true,
  size = "lg",
  className,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open || !dismissable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissable, onClose]);

  // Bloquea scroll del body cuando está abierto
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={dismissable ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
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
            {typeof title === "string" ? (
              <h2 className="font-display text-lg font-bold text-text-hi">{title}</h2>
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
