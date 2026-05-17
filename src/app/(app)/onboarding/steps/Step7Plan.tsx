"use client";

import { CheckCircle2, CreditCard, Loader2, Sparkles } from "lucide-react";
import { PLANS_PUBLIC } from "@/lib/plans";

const FREE_LIMITS = [
  "Hasta 50 clientes",
  "Calendario básico",
  "Tareas (Kanban)",
  "1 usuario",
  "OCR de tickets (5/mes)",
  "Soporte por comunidad",
];

type Props = {
  onSelectFree: () => void;
  onSelectPaid: (plan: "pro" | "business") => void;
  busy: string | null;
};

export function Step7Plan({ onSelectFree, onSelectPaid, busy }: Props) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-text-mid">
        Tu cuenta empieza en el plan <strong className="text-text-hi">Free</strong>. Puedes seguir
        así para siempre o mejorar a un plan superior cuando lo necesites.
      </p>

      {/* Plan Free — destacado como el actual */}
      <article className="card-glass p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="section-label mb-1">Tu plan actual</div>
            <h3 className="font-display text-xl font-bold text-text-hi">Free</h3>
            <p className="mt-0.5 text-xs text-text-mid">
              Perfecto para empezar a probar ANTARES sin compromiso.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
            <CheckCircle2 size={10} /> Activo
          </span>
        </div>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {FREE_LIMITS.map((l) => (
            <li key={l} className="flex items-start gap-2 text-xs text-text-mid">
              <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-cyan" /> {l}
            </li>
          ))}
        </ul>
      </article>

      <div className="text-center text-[11px] uppercase tracking-wider text-text-lo">
        ¿Necesitas más? Mejora a un plan superior
      </div>

      {/* Planes de pago */}
      <div className="grid gap-4 md:grid-cols-2">
        {PLANS_PUBLIC.map((p) => (
          <article
            key={p.id}
            className={`card-glass flex flex-col p-5 ${p.destacado ? "ring-1 ring-cyan/40" : ""}`}
          >
            {p.destacado && (
              <div className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-gradient-to-r from-cyan to-fuchsia px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bg">
                <Sparkles size={10} /> Recomendado
              </div>
            )}
            <h3 className="font-display text-xl font-bold text-text-hi">{p.nombre}</h3>
            <p className="mt-0.5 text-[11px] text-text-mid">{p.tagline}</p>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold text-text-hi">
                {p.precio_eur_mes}€
              </span>
              <span className="text-xs text-text-mid">/mes</span>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-text-mid">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-1.5">
                  <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-cyan" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onSelectPaid(p.id)}
              disabled={!!busy}
              className={`mt-5 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 ${
                p.destacado
                  ? "bg-gradient-to-r from-cyan to-fuchsia text-bg"
                  : "border border-indigo-400/30 bg-indigo-900/40 text-text-hi hover:border-cyan/40"
              }`}
            >
              {busy === `checkout-${p.id}` ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <CreditCard size={14} />
              )}
              Elegir {p.nombre}
            </button>
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={onSelectFree}
        disabled={!!busy}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-4 py-3 text-sm font-semibold text-text-hi hover:border-cyan/40 disabled:opacity-50"
      >
        {busy === "free" ? (
          <Loader2 className="animate-spin" size={14} />
        ) : (
          <CheckCircle2 size={14} />
        )}
        Continuar con Free y entrar a ANTARES
      </button>
    </div>
  );
}
