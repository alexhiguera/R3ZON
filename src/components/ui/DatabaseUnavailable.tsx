"use client";

import { DatabaseZap, RefreshCw } from "lucide-react";

export function DatabaseUnavailable() {
  const reintentar = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg px-4 py-12">
      <div className="card-glass relative w-full max-w-md overflow-hidden rounded-3xl border border-fuchsia-400/25 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-glass">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-cyan/10 via-transparent to-fuchsia-500/10" />
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200">
          <DatabaseZap size={28} />
        </div>
        <h1 className="font-display text-xl font-extrabold tracking-tight text-text-hi">
          No se puede conectar con la base de datos
        </h1>
        <p className="mt-3 text-sm text-text-mid">
          Comprueba tu conexión a internet. Si el problema persiste, prueba en
          unos minutos.
        </p>
        <button
          type="button"
          onClick={reintentar}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-cyan/40 bg-cyan/10 px-5 py-2.5 text-sm font-bold text-cyan transition hover:border-cyan/70 hover:bg-cyan/15"
        >
          <RefreshCw size={15} />
          Reintentar
        </button>
      </div>
    </div>
  );
}
