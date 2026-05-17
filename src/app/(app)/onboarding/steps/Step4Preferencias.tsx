"use client";

import type { PreferenciasFormValues } from "../schemas";

const MONEDAS = [
  { code: "EUR", label: "Euro (€)" },
  { code: "USD", label: "Dólar estadounidense ($)" },
  { code: "GBP", label: "Libra esterlina (£)" },
  { code: "MXN", label: "Peso mexicano (MX$)" },
  { code: "ARS", label: "Peso argentino (AR$)" },
  { code: "COP", label: "Peso colombiano (COL$)" },
  { code: "CLP", label: "Peso chileno (CLP$)" },
  { code: "PEN", label: "Sol peruano (S/.)" },
];

const ZONAS = [
  "Europe/Madrid",
  "Europe/London",
  "Europe/Lisbon",
  "Europe/Paris",
  "Europe/Berlin",
  "America/Mexico_City",
  "America/Buenos_Aires",
  "America/Bogota",
  "America/Santiago",
  "America/Lima",
  "America/New_York",
  "America/Los_Angeles",
];

type Props = {
  values: Record<keyof PreferenciasFormValues, string>;
  onChange: (k: keyof PreferenciasFormValues, v: string) => void;
};

export function Step4Preferencias({ values, onChange }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-text-mid">Moneda</span>
        <select
          value={values.moneda}
          onChange={(e) => onChange("moneda", e.target.value)}
          className="h-11 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
        >
          {MONEDAS.map((m) => (
            <option key={m.code} value={m.code} className="bg-bg">
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-text-mid">Zona horaria</span>
        <select
          value={values.zona_horaria}
          onChange={(e) => onChange("zona_horaria", e.target.value)}
          className="h-11 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
        >
          {ZONAS.map((z) => (
            <option key={z} value={z} className="bg-bg">
              {z}
            </option>
          ))}
        </select>
      </label>
      <p className="sm:col-span-2 text-xs text-text-lo">
        Estas preferencias se aplican a facturas, informes y al calendario de citas.
      </p>
    </div>
  );
}
