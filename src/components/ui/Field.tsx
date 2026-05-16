"use client";

import { Children, cloneElement, isValidElement, useId } from "react";
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
  /** Si se especifica, fuerza el `htmlFor` del label (en lugar del id autogenerado). */
  htmlFor?: string;
  className?: string;
};

/**
 * Etiqueta + slot de control con asociación accesible automática:
 *  - genera un id si el hijo no tiene uno
 *  - vincula `<label htmlFor>` ↔ `<input id>` para lectores de pantalla
 *  - propaga `aria-invalid` y `aria-describedby` al control cuando hay error/hint
 *
 * Acepta cualquier hijo, pero solo clona props si es un único elemento React.
 * Para layouts compuestos (icono + input), envolver el grupo con un id explícito.
 */
export function Field({ label, children, full, hint, error, htmlFor, className }: FieldProps) {
  const autoId = useId();
  const child = Children.only(
    isValidElement(children) ? children : <span>{children}</span>,
  ) as React.ReactElement<{
    id?: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }>;

  const controlId = htmlFor ?? child.props.id ?? `field-${autoId}`;
  const hintId = hint || error ? `${controlId}-msg` : undefined;

  const enhanced = isValidElement(children)
    ? cloneElement(child, {
        id: controlId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": hintId,
      })
    : child;

  return (
    <div className={cn("flex flex-col gap-1", full && "col-span-2", className)}>
      <label
        htmlFor={controlId}
        className="text-[0.65rem] font-semibold uppercase tracking-wider text-text-lo"
      >
        {label}
      </label>
      {enhanced}
      {error ? (
        <span id={hintId} role="alert" className="text-[0.7rem] text-danger">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="text-[0.7rem] text-text-lo">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
