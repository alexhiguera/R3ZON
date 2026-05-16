import { ChevronDown, type Download, Pencil } from "lucide-react";
import type React from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { INPUT_CLS, Input } from "@/components/ui/Input";

export const inputCls = `h-10 ${INPUT_CLS}`;

export function Card({
  title,
  children,
  accion,
}: {
  title: string;
  children: React.ReactNode;
  accion?: React.ReactNode;
}) {
  return (
    <div className="card-glass p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="section-label">{title}</span>
        {accion}
      </div>
      {children}
    </div>
  );
}

export function ResumenColapsable({
  titulo,
  resumen,
  onModificar,
}: {
  titulo: string;
  resumen: string;
  onModificar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onModificar}
      className="card-glass group flex items-center gap-3 p-3 text-left transition-colors hover:border-cyan/30"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/30 text-text-mid group-hover:text-cyan">
        <ChevronDown size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-text-lo">
          {titulo}
        </div>
        <div className="truncate text-sm text-text-hi">{resumen}</div>
      </div>
      <span className="inline-flex items-center gap-1 rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-1.5 text-xs font-semibold text-cyan">
        <Pencil size={12} /> Modificar
      </span>
    </button>
  );
}

export function NumInput({
  label,
  value,
  onChange,
  cls,
  step = "1",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  cls?: string;
  step?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${cls ?? ""}`}>
      <span className="text-[0.6rem] font-medium uppercase tracking-wider text-text-lo">
        {label}
      </span>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </label>
  );
}

export function AccionBtn({
  onClick,
  Icono,
  label,
  tono,
  yaHecho,
}: {
  onClick: () => void;
  Icono: typeof Download;
  label: string;
  tono: "cyan" | "fuchsia" | "ok" | "warn";
  yaHecho?: boolean;
}) {
  return (
    <ActionButton
      Icono={Icono}
      label={label}
      tono={tono}
      yaHecho={yaHecho}
      onClick={onClick}
      disabled={yaHecho && tono !== "ok"}
    />
  );
}
