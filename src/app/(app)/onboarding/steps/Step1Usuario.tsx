"use client";

import { AlertCircle } from "lucide-react";
import type { UsuarioFormValues } from "../schemas";

type Props = {
  values: Record<keyof UsuarioFormValues, string>;
  errors: Partial<Record<keyof UsuarioFormValues, string>>;
  onChange: (k: keyof UsuarioFormValues, v: string) => void;
};

export function Step1Usuario({ values, errors, onChange }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Nombre completo"
        placeholder="Ej. Alex Higuera"
        full
        value={values.nombre_completo ?? ""}
        error={errors.nombre_completo}
        onChange={(v) => onChange("nombre_completo", v)}
      />
      <Field
        label="Cargo en la empresa"
        placeholder="Ej. Fundador, CEO, autónomo…"
        full
        value={values.cargo ?? ""}
        error={errors.cargo}
        onChange={(v) => onChange("cargo", v)}
      />
      <p className="sm:col-span-2 text-xs text-text-lo">
        El nombre y el cargo aparecerán en tus comunicaciones y firmas. Puedes editarlos en
        cualquier momento desde tu perfil.
      </p>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  error,
  onChange,
  full,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  full?: boolean;
  type?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium text-text-mid">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={`h-11 rounded-xl border bg-indigo-900/30 px-3 text-sm text-text-hi focus:outline-none focus:ring-2 ${
          error
            ? "border-rose-400/50 focus:border-rose-400 focus:ring-rose-400/20"
            : "border-indigo-400/20 focus:border-cyan/50 focus:ring-cyan/20"
        }`}
      />
      {error && (
        <span className="flex items-center gap-1 text-[11px] text-rose-300">
          <AlertCircle size={11} /> {error}
        </span>
      )}
    </label>
  );
}
