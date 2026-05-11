"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tono = "cyan" | "fuchsia" | "ok" | "warn" | "danger" | "indigo";

const TONOS: Record<Tono, string> = {
  cyan:    "border-cyan/40 bg-cyan/10 text-cyan hover:bg-cyan/20",
  fuchsia: "border-fuchsia/40 bg-fuchsia/10 text-fuchsia hover:bg-fuchsia/20",
  ok:      "border-ok/40 bg-ok/10 text-ok hover:bg-ok/20",
  warn:    "border-warn/40 bg-warn/10 text-warn hover:bg-warn/20",
  danger:  "border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
  indigo:  "border-indigo-400/30 bg-indigo-900/30 text-text-hi hover:bg-indigo-900/50",
};

type Props = {
  Icono: LucideIcon;
  label: string;
  onClick?: () => void;
  tono?: Tono;
  disabled?: boolean;
  /** Marca el botón como "ya completado" (estilo opaco, mantiene clickable según `disabled`). */
  yaHecho?: boolean;
  type?: "button" | "submit";
  className?: string;
};

/** Botón con icono + etiqueta y tono semántico. Uso: paneles de acciones,
 *  botones de pago, modales de cobro, etc. */
export function ActionButton({
  Icono,
  label,
  onClick,
  tono = "cyan",
  disabled,
  yaHecho,
  type = "button",
  className,
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition-colors",
        TONOS[tono],
        yaHecho && "opacity-70",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <Icono size={15} /> {label}
    </button>
  );
}
