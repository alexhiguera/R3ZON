"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

/**
 * Error boundary global de App Router. Se monta cuando un Server o Client
 * Component lanza durante renderizado/efectos. Loguea a console (en cliente)
 * y muestra UI alineada al design system R3ZON.
 */
export default function GlobalAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("app_error_boundary", error);
    }
  }, [error]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-6 py-16">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-fuchsia/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-1/3 h-80 w-80 rounded-full bg-cyan/15 blur-3xl" />

      <div className="card-glass relative w-full max-w-lg overflow-hidden text-center">
        <div className="rainbow-bar" />
        <div className="p-8 sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-fuchsia/30 bg-gradient-to-br from-fuchsia/15 to-cyan/15 text-fuchsia">
            <AlertTriangle size={28} />
          </div>

          <h1 className="mt-6 font-display text-2xl font-bold text-text-hi sm:text-3xl">
            Algo no ha salido bien
          </h1>
          <div className="accent-bar mx-auto mt-3 w-12" />
          <p className="mx-auto mt-4 max-w-sm text-sm text-text-mid">
            Ha ocurrido un error inesperado mientras cargábamos esta página. Puedes
            intentarlo de nuevo o volver al panel principal.
          </p>
          {error?.digest && (
            <p className="mt-3 text-[0.7rem] font-mono text-text-lo">
              ref: {error.digest}
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 py-2.5 text-sm font-bold text-bg"
            >
              <RefreshCw size={14} /> Reintentar
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-4 py-2.5 text-sm font-medium text-text-hi hover:border-cyan/40"
            >
              <Home size={14} /> Ir al panel
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
