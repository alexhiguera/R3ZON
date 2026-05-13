"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

/**
 * Boundary específico del grupo (app). Mantiene la jerarquía del AppShell
 * y muestra un fallback glass; menos invasivo que el de la raíz.
 */
export default function AppGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("app_group_error", error);
    }
  }, [error]);

  return (
    <div className="px-4 py-10 sm:px-6">
      <div className="card-glass mx-auto max-w-xl overflow-hidden text-center">
        <div className="rainbow-bar" />
        <div className="p-6 sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-fuchsia/30 bg-gradient-to-br from-fuchsia/15 to-cyan/15 text-fuchsia">
            <AlertTriangle size={24} />
          </div>
          <h1 className="mt-5 font-display text-xl font-bold text-text-hi sm:text-2xl">
            Esta sección ha fallado al cargarse
          </h1>
          <div className="accent-bar mx-auto mt-3 w-12" />
          <p className="mx-auto mt-3 max-w-sm text-sm text-text-mid">
            Ha habido un problema mostrando este contenido. Puedes reintentar o
            volver al panel.
          </p>
          {error?.digest && (
            <p className="mt-2 text-[0.7rem] font-mono text-text-lo">ref: {error.digest}</p>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
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
    </div>
  );
}
