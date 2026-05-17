"use client";

import { Lock } from "lucide-react";
import { MODULOS, type ModuloId, planPermite } from "@/lib/sidebarModulos";

type Props = {
  /** Plan actual del usuario (free por defecto en onboarding). */
  plan: "free" | "pro" | "business";
  /** Conjunto de módulos ocultos (controlado por el padre). */
  ocultos: Set<ModuloId>;
  onToggle: (id: ModuloId) => void;
};

export function Step5Modulos({ plan, ocultos, onToggle }: Props) {
  return (
    <div>
      <p className="text-sm text-text-mid">
        Activa o desactiva los módulos que verás en el menú lateral. Podrás cambiarlos en cualquier
        momento desde <strong className="text-text-hi">Ajustes → Módulos</strong>.
      </p>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {MODULOS.map((m) => {
          const permitido = planPermite(plan, m.minPlan);
          const obligatorio = !!m.obligatorio;
          const activo = !ocultos.has(m.id);
          const disabled = !permitido || obligatorio;
          return (
            <li
              key={m.id}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                disabled
                  ? "border-indigo-400/15 bg-indigo-900/20 opacity-80"
                  : activo
                    ? "border-cyan/35 bg-cyan/5"
                    : "border-indigo-400/20 bg-indigo-900/30"
              }`}
            >
              <m.Icon size={18} className="mt-0.5 shrink-0 text-cyan" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-text-hi">{m.label}</span>
                  {obligatorio && (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-200">
                      Esencial
                    </span>
                  )}
                  {!permitido && (
                    <span className="inline-flex items-center gap-0.5 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-fuchsia-200">
                      <Lock size={8} /> Plan {m.minPlan}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-text-mid">{m.descripcion}</p>
              </div>
              <label
                className={`flex shrink-0 cursor-pointer items-center ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={activo}
                  disabled={disabled}
                  onChange={() => onToggle(m.id)}
                  aria-label={`Mostrar ${m.label}`}
                  className="h-5 w-5 cursor-pointer accent-cyan"
                />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
