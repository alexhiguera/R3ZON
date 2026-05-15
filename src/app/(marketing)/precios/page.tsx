import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import { PLANS_PUBLIC } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Precios",
  description:
    "Planes simples y transparentes. Empieza gratis y escala cuando crezcas.",
};

export default function PreciosPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <div className="accent-bar mx-auto mb-4" style={{ width: 64 }} />
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-text-hi sm:text-5xl">
          Precios sin sorpresas.
        </h1>
        <p className="mt-4 text-base text-text-mid sm:text-lg">
          Sin permanencia, sin coste de implantación. Cancela cuando quieras.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {PLANS_PUBLIC.map((plan) => (
          <article
            key={plan.id}
            className={`card-glass flex flex-col p-7 ${
              plan.destacado ? "ring-1 ring-cyan/40" : ""
            }`}
          >
            {plan.destacado && (
              <div className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-gradient-to-r from-cyan to-fuchsia px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bg">
                <Sparkles size={10} /> Recomendado
              </div>
            )}
            <h2 className="font-display text-2xl font-bold text-text-hi">
              {plan.nombre}
            </h2>
            <p className="mt-1 text-sm text-text-mid">{plan.tagline}</p>

            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-display text-4xl font-extrabold text-text-hi">
                {plan.precio_eur_mes}€
              </span>
              <span className="text-sm text-text-mid">/mes</span>
            </div>

            <ul className="mt-6 flex-1 space-y-2.5 text-sm text-text-mid">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-cyan" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={`/registro?plan=${plan.id}`}
              className={`mt-7 inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                plan.destacado
                  ? "bg-cyan text-bg shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:brightness-110"
                  : "border border-indigo-400/30 bg-indigo-900/30 text-text-hi hover:border-indigo-400/60"
              }`}
            >
              Empezar con {plan.nombre}
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </article>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-text-lo">
        IVA no incluido · Pago mensual con Stripe · Sin permanencia
      </p>
    </div>
  );
}
