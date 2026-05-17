"use client";

import { Eye, EyeOff, LayoutGrid, Lock } from "lucide-react";
import { MODULOS, planPermite, useModulosOcultos } from "@/lib/sidebarModulos";
import { type PlanNombre, usePlan } from "@/lib/usePlan";

const ETIQUETA_PLAN: Record<PlanNombre, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
};

export function ModulosTab() {
  const { plan, cargando } = usePlan();
  const { ocultos, alternar, montado } = useModulosOcultos();

  return (
    <div className="card-glass overflow-hidden">
      <div className="rainbow-bar" />
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan">
            <LayoutGrid size={18} />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-text-hi">Módulos del menú</h2>
            <p className="mt-1 text-sm text-text-mid">
              Activa o desactiva qué módulos aparecen en tu barra lateral. Los módulos de planes
              superiores al tuyo aparecen bloqueados — actualiza tu suscripción para usarlos.
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {MODULOS.map((m) => {
            const permitido = !cargando && planPermite(plan, m.minPlan);
            const obligatorio = !!m.obligatorio;
            const oculto = montado && ocultos.has(m.id);
            const activo = permitido && !oculto;
            const bloqueado = !permitido;
            const { Icon } = m;

            return (
              <li
                key={m.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                  bloqueado
                    ? "border-indigo-400/10 bg-indigo-900/10 opacity-70"
                    : "border-indigo-400/20 bg-indigo-900/30"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    activo
                      ? "border-cyan/40 bg-cyan/10 text-cyan"
                      : "border-indigo-400/20 bg-indigo-900/40 text-indigo-300"
                  }`}
                >
                  <Icon size={16} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-text-hi">{m.label}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        m.minPlan === "free"
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                          : m.minPlan === "pro"
                            ? "border-cyan/40 bg-cyan/10 text-cyan"
                            : "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-300"
                      }`}
                    >
                      {ETIQUETA_PLAN[m.minPlan]}
                    </span>
                    {obligatorio && (
                      <span className="rounded-full border border-indigo-400/30 bg-indigo-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-mid">
                        Esencial
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-text-mid">{m.descripcion}</p>
                  {bloqueado && !cargando && (
                    <p className="mt-1 text-[11px] text-text-lo">
                      Requiere plan {ETIQUETA_PLAN[m.minPlan]}. Tu plan actual es{" "}
                      {ETIQUETA_PLAN[plan]}.
                    </p>
                  )}
                </div>

                <Toggle
                  activo={activo}
                  deshabilitado={bloqueado || obligatorio}
                  bloqueado={bloqueado}
                  onClick={() => alternar(m.id)}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Toggle({
  activo,
  deshabilitado,
  bloqueado,
  onClick,
}: {
  activo: boolean;
  deshabilitado: boolean;
  bloqueado: boolean;
  onClick: () => void;
}) {
  const label = bloqueado
    ? "Bloqueado por tu plan"
    : activo
      ? "Ocultar del menú"
      : "Mostrar en el menú";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={label}
      title={label}
      disabled={deshabilitado}
      onClick={onClick}
      className={`relative flex h-7 w-12 shrink-0 items-center rounded-full border transition ${
        activo
          ? "border-cyan/50 bg-cyan/30"
          : bloqueado
            ? "cursor-not-allowed border-indigo-400/15 bg-indigo-900/40"
            : "border-indigo-400/25 bg-indigo-900/50"
      } ${deshabilitado && !bloqueado ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full bg-bg shadow transition-transform ${
          activo ? "translate-x-6" : "translate-x-1"
        }`}
      >
        {bloqueado ? (
          <Lock size={10} className="text-text-lo" />
        ) : activo ? (
          <Eye size={10} className="text-cyan" />
        ) : (
          <EyeOff size={10} className="text-text-mid" />
        )}
      </span>
    </button>
  );
}
