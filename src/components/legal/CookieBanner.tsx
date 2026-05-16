"use client";

import { Cookie, Settings2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CONSENT_EVENT, type Consent, readConsent, writeConsent } from "@/lib/consent";

type View = "banner" | "settings";

export function CookieBanner() {
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  const [view, setView] = useState<View>("banner");
  const [analyticsOpt, setAnalyticsOpt] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    const onChange = (e: Event) => setConsent((e as CustomEvent<Consent | null>).detail);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  // Aún cargando o ya hay decisión → no mostrar.
  if (consent === undefined || consent !== null) return null;

  const aceptarTodas = () => writeConsent(true);
  const soloNecesarias = () => writeConsent(false);
  const guardarPersonalizado = () => writeConsent(analyticsOpt);

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies y consentimiento"
      aria-modal="false"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:bottom-4 sm:left-1/2 sm:max-w-[640px] sm:-translate-x-1/2 sm:p-0"
    >
      <div className="card-glass overflow-hidden">
        <div className="rainbow-bar" />
        {view === "banner" ? (
          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan">
                <Cookie size={18} />
              </span>
              <div className="flex-1">
                <h2 className="font-display text-base font-bold text-text-hi">
                  Tu privacidad nos importa
                </h2>
                <p className="mt-1 text-sm text-text-mid">
                  Usamos almacenamiento técnico imprescindible para que la app funcione
                  (autenticación, preferencias). Solo si tú aceptas activaremos métricas de uso
                  anónimas (Vercel Analytics) para mejorar el producto. Puedes cambiarlo en
                  cualquier momento desde{" "}
                  <Link href="/ajustes" className="underline decoration-cyan/50 underline-offset-2">
                    Ajustes
                  </Link>
                  .
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <button
                type="button"
                onClick={() => setView("settings")}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-4 text-sm font-semibold text-text-mid hover:border-indigo-400/40 hover:text-text-hi"
              >
                <Settings2 size={14} /> Personalizar
              </button>
              <button
                type="button"
                onClick={soloNecesarias}
                className="h-11 rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-4 text-sm font-semibold text-text-mid hover:border-indigo-400/40 hover:text-text-hi"
              >
                Solo necesarias
              </button>
              <button
                type="button"
                onClick={aceptarTodas}
                className="h-11 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-5 text-sm font-bold text-bg shadow-glow"
              >
                Aceptar todas
              </button>
            </div>
            <p className="mt-3 text-[11px] text-text-lo">
              Más detalles en nuestra{" "}
              <Link
                href="/legal/cookies"
                className="underline decoration-text-lo underline-offset-2 hover:text-text-mid"
              >
                política de cookies
              </Link>{" "}
              y{" "}
              <Link
                href="/legal/privacidad"
                className="underline decoration-text-lo underline-offset-2 hover:text-text-mid"
              >
                política de privacidad
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-base font-bold text-text-hi">
                Preferencias de privacidad
              </h2>
              <button
                type="button"
                onClick={() => setView("banner")}
                aria-label="Volver"
                className="rounded-lg p-1 text-text-mid hover:text-text-hi"
              >
                <X size={16} />
              </button>
            </div>
            <ul className="mt-4 flex flex-col gap-3">
              <li className="rounded-xl border border-indigo-400/15 bg-indigo-900/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-text-hi">Necesarias</div>
                    <div className="text-xs text-text-mid">
                      Autenticación, sesión y preferencias guardadas en tu dispositivo. Sin esto la
                      app no funciona.
                    </div>
                  </div>
                  <span className="rounded-md border border-cyan/30 bg-cyan/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan">
                    Siempre activas
                  </span>
                </div>
              </li>
              <li className="rounded-xl border border-indigo-400/15 bg-indigo-900/30 p-3">
                <label className="flex cursor-pointer items-start justify-between gap-3">
                  <span className="flex-1">
                    <span className="block font-semibold text-text-hi">Métricas de uso</span>
                    <span className="block text-xs text-text-mid">
                      Vercel Analytics (anónimo, sin huella personal) para ver qué páginas se
                      visitan y mejorar el producto.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={analyticsOpt}
                    onChange={(e) => setAnalyticsOpt(e.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-cyan"
                  />
                </label>
              </li>
            </ul>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setView("banner")}
                className="h-11 rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-4 text-sm font-semibold text-text-mid hover:border-indigo-400/40 hover:text-text-hi"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarPersonalizado}
                className="h-11 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-5 text-sm font-bold text-bg"
              >
                Guardar elección
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
