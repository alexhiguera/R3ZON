"use client";

import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  children: React.ReactNode;
  /** Ocupa el ancho completo de un grid de 2 columnas. */
  full?: boolean;
  /** Texto auxiliar bajo el control. */
  hint?: string;
  /** Mensaje de error (sustituye al hint y aplica estilo de error). */
  error?: string;
  className?: string;
};

/** Etiqueta + slot de control. Sustituye los `Field` locales por página. */
export function Field({ label, children, full, hint, error, className }: FieldProps) {
  return (
    <label className={cn("flex flex-col gap-1", full && "col-span-2", className)}>
      <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-text-lo">
        {label}
      </span>
      {children}
      {error ? (
        <span className="text-[0.7rem] text-danger">{error}</span>
      ) : hint ? (
        <span className="text-[0.7rem] text-text-lo">{hint}</span>
      ) : null}
    </label>
  );
}
