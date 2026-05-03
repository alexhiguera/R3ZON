"use client";

import Link from "next/link";
import { ArrowRight, PiggyBank, Receipt, TrendingUp } from "lucide-react";
import { agregarPorMes, eur, totales, type MovimientoFila } from "@/lib/finanzas";
import { MonthlyBars } from "@/components/finanzas/Charts";
import { KpiCard } from "./KpiCard";

export function FinanceSummary({
  filas,
  loading,
}: {
  filas: MovimientoFila[];
  loading?: boolean;
}) {
  const t = totales(filas);
  const mensual = agregarPorMes(filas);

  const mesActual = new Date().getMonth();
  const filasMes = filas.filter((f) => new Date(f.fecha).getMonth() === mesActual);
  const tMes = totales(filasMes);

  const beneficioTone = t.beneficio >= 0 ? "ok" : "danger";
  const haciendaImporte = Math.max(0, t.ivaAPagar) + Math.max(0, t.irpfRetenido);

  return (
    <section className="card-glass p-5">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10 text-cyan">
            <PiggyBank size={15} />
          </span>
          <h3 className="font-display text-base font-bold text-text-hi">Estado financiero</h3>
          <span className="text-xs text-text-lo">· año en curso</span>
        </div>
        <Link
          href="/finanzas"
          className="flex items-center gap-1 text-xs text-text-mid hover:text-cyan"
        >
          Ver finanzas <ArrowRight size={12} />
        </Link>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Te queda (año)"
          value={loading ? "…" : eur(t.beneficio)}
          hint={`${eur(t.ganado)} − ${eur(t.gastado)}`}
          Icon={PiggyBank}
          accent={beneficioTone}
          loading={loading}
        />
        <KpiCard
          label="Apartar Hacienda"
          value={loading ? "…" : eur(haciendaImporte)}
          hint="IVA + IRPF previstos"
          Icon={Receipt}
          accent="warn"
          loading={loading}
        />
        <KpiCard
          label="Beneficio del mes"
          value={loading ? "…" : eur(tMes.beneficio)}
          hint={`${eur(tMes.ganado)} ingresos`}
          Icon={TrendingUp}
          accent={tMes.beneficio >= 0 ? "ok" : "danger"}
          loading={loading}
        />
      </div>

      {loading ? (
        <div className="h-[280px] animate-pulse rounded-xl border border-indigo-400/10 bg-indigo-900/20" />
      ) : filas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-indigo-400/20 p-8 text-center text-sm text-text-mid">
          Aún no has registrado movimientos este año.
        </div>
      ) : (
        <MonthlyBars data={mensual} />
      )}
    </section>
  );
}
