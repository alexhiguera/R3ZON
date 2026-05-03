"use client";

import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";

export type DashboardCliente = {
  id: string;
  nombre: string;
  sector: string | null;
  created_at: string;
};

function relativo(iso: string) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 7)  return `hace ${dias}d`;
  if (dias < 30) return `hace ${Math.floor(dias / 7)}sem`;
  if (dias < 365) return `hace ${Math.floor(dias / 30)}mes`;
  return `hace ${Math.floor(dias / 365)}a`;
}

export function RecentClients({
  clientes,
  loading,
}: {
  clientes: DashboardCliente[];
  loading?: boolean;
}) {
  return (
    <section className="card-glass p-5">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10 text-cyan">
            <Building2 size={15} />
          </span>
          <h3 className="font-display text-base font-bold text-text-hi">Últimos clientes</h3>
        </div>
        <Link
          href="/clientes"
          className="flex items-center gap-1 text-xs text-text-mid hover:text-cyan"
        >
          Ver todos <ArrowRight size={12} />
        </Link>
      </header>

      {loading ? (
        <SkeletonList />
      ) : clientes.length === 0 ? (
        <Empty text="Aún no has añadido clientes" />
      ) : (
        <ul className="flex flex-col gap-2">
          {clientes.slice(0, 5).map((c) => (
            <li key={c.id}>
              <Link
                href={`/clientes/${c.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-indigo-400/15 bg-indigo-900/20 p-3 transition hover:border-cyan/30 hover:bg-cyan/5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-text-hi">{c.nombre}</div>
                  {c.sector && (
                    <div className="mt-0.5 truncate text-xs text-text-mid">{c.sector}</div>
                  )}
                </div>
                <span className="shrink-0 text-xs text-text-lo">{relativo(c.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SkeletonList() {
  return (
    <ul className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          className="h-14 animate-pulse rounded-xl border border-indigo-400/10 bg-indigo-900/20"
        />
      ))}
    </ul>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-indigo-400/20 p-6 text-center text-sm text-text-mid">
      {text}
    </div>
  );
}
