"use client";

import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { WizardProgress } from "./WizardProgress";

type Props = {
  total: number;
  current: number;
  labels?: string[];
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  onSkip?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  busy?: boolean;
  /** Si false, el botón "Atrás" no se renderiza (paso 0). */
  showBack?: boolean;
  /** Pie personalizado (sustituye la fila de botones por completo). */
  customFooter?: ReactNode;
};

export function WizardShell({
  total,
  current,
  labels,
  title,
  subtitle,
  children,
  onBack,
  onContinue,
  onSkip,
  continueLabel = "Continuar",
  continueDisabled = false,
  busy = false,
  showBack = true,
  customFooter,
}: Props) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* Header con progreso */}
      <header className="sticky top-0 z-10 border-b border-indigo-400/15 bg-bg/85 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <WizardProgress total={total} current={current} labels={labels} />
        </div>
      </header>

      {/* Contenido scrollable */}
      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto w-full max-w-2xl">
          <div className="card-glass overflow-hidden">
            <div className="rainbow-bar" />
            <div className="p-5 sm:p-8">
              <h1 className="font-display text-2xl font-bold text-text-hi sm:text-3xl">{title}</h1>
              {subtitle && (
                <>
                  <div className="accent-bar mt-3" />
                  <p className="mt-3 text-sm text-text-mid">{subtitle}</p>
                </>
              )}
              <div className="mt-6">{children}</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer fijo con acciones */}
      <footer
        className="sticky bottom-0 z-10 border-t border-indigo-400/15 bg-bg/85 px-4 py-3 backdrop-blur-md sm:px-6"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2">
          {customFooter ?? (
            <>
              {showBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  disabled={busy}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-4 text-sm font-medium text-text-hi hover:border-cyan/40 disabled:opacity-50"
                >
                  <ArrowLeft size={14} /> <span className="hidden sm:inline">Atrás</span>
                </button>
              ) : (
                <span className="w-0" />
              )}

              {onSkip && (
                <button
                  type="button"
                  onClick={onSkip}
                  disabled={busy}
                  className="ml-auto text-xs font-medium text-text-mid underline-offset-4 hover:text-text-hi hover:underline disabled:opacity-50"
                >
                  Rellenar más tarde
                </button>
              )}

              <button
                type="button"
                onClick={onContinue}
                disabled={continueDisabled || busy}
                className={`${onSkip ? "" : "ml-auto"} flex h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-5 text-sm font-bold text-bg disabled:opacity-50`}
              >
                {busy ? <Loader2 className="animate-spin" size={14} /> : <ArrowRight size={14} />}
                {continueLabel}
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
