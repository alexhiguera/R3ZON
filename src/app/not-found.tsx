import Link from "next/link";
import { Home, ArrowLeft, Compass } from "lucide-react";

export const metadata = {
  title: "Página no encontrada · r3zon",
};

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-6 py-16">
      {/* Glow decorativo */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-cyan/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-1/3 h-80 w-80 rounded-full bg-fuchsia/15 blur-3xl" />

      <div className="card-glass relative w-full max-w-xl overflow-hidden text-center">
        <div className="rainbow-bar" />
        <div className="p-8 sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan/30 bg-gradient-to-br from-cyan/15 to-fuchsia/15 text-cyan">
            <Compass size={28} />
          </div>

          <div className="mt-5 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-cyan">
            Error 404
          </div>

          <div className="mt-3 font-display text-7xl font-extrabold leading-none tracking-tight text-transparent sm:text-8xl"
               style={{ backgroundImage: "linear-gradient(90deg, var(--cyan, #22d3ee), var(--fuchsia, #e879f9))", WebkitBackgroundClip: "text", backgroundClip: "text" }}>
            404
          </div>

          <h1 className="mt-4 font-display text-2xl font-bold text-text-hi sm:text-3xl">
            Esta página se ha mudado o nunca existió
          </h1>
          <div className="accent-bar mx-auto mt-3 w-12" />
          <p className="mx-auto mt-4 max-w-sm text-sm text-text-mid">
            Comprueba la URL, vuelve al panel principal o avísanos si llegaste aquí desde un
            enlace de la app — algo se nos habrá despistado.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 py-2.5 text-sm font-bold text-bg"
            >
              <Home size={14} /> Ir al panel
            </Link>
            <Link
              href="/clientes"
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-4 py-2.5 text-sm font-medium text-text-hi hover:border-cyan/40"
            >
              <ArrowLeft size={14} /> Ver clientes
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
