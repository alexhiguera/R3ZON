"use client";

import { AlertCircle } from "lucide-react";
import type { EmpresaFormValues } from "../schemas";

type Props = {
  values: Record<keyof EmpresaFormValues, string>;
  errors: Partial<Record<keyof EmpresaFormValues, string>>;
  onChange: (k: keyof EmpresaFormValues, v: string) => void;
};

const SECTORES = [
  "",
  "Consultoría",
  "Hostelería",
  "Comercio minorista",
  "Servicios profesionales",
  "Construcción / Reformas",
  "Salud / Bienestar",
  "Educación / Formación",
  "Tecnología / Software",
  "Logística / Transporte",
  "Industria / Manufactura",
  "Otro",
];

export function Step2Empresa({ values, errors, onChange }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Text
        label="Nombre del negocio *"
        placeholder="Acme Soluciones SL"
        full
        value={values.nombre_negocio ?? ""}
        error={errors.nombre_negocio}
        onChange={(v) => onChange("nombre_negocio", v)}
      />
      <Text
        label="CIF / NIF"
        placeholder="B12345678"
        value={values.cif_nif ?? ""}
        error={errors.cif_nif}
        onChange={(v) => onChange("cif_nif", v)}
      />
      <Text
        label="Teléfono"
        type="tel"
        placeholder="+34 600 000 000"
        value={values.telefono ?? ""}
        error={errors.telefono}
        onChange={(v) => onChange("telefono", v)}
      />
      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="text-xs font-medium text-text-mid">Sector</span>
        <select
          value={values.sector ?? ""}
          onChange={(e) => onChange("sector", e.target.value)}
          className="h-11 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
        >
          {SECTORES.map((s) => (
            <option key={s} value={s} className="bg-bg">
              {s || "Selecciona un sector…"}
            </option>
          ))}
        </select>
      </label>
      <p className="sm:col-span-2 text-xs text-text-lo">
        El nombre del negocio es obligatorio para continuar. El resto puedes completarlo después
        desde Ajustes → Negocio.
      </p>
    </div>
  );
}

function Text({
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
