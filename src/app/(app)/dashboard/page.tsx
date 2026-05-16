"use client";

import { Activity, AlertTriangle, Building2, Calendar, RefreshCcw, Wallet } from "lucide-react";
import dynamic from "next/dynamic";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { PendingTasks } from "@/components/dashboard/PendingTasks";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { RecentClients } from "@/components/dashboard/RecentClients";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";
import { PageHeader } from "@/components/ui/PageHeader";
import { eur } from "@/lib/finanzas";
import { useDashboardData } from "@/lib/useDashboardData";

// Recharts (~95 KB gz) se difiere para que no entre en el initial JS de la home.
const FinanceSummary = dynamic(
  () => import("@/components/dashboard/FinanceSummary").then((m) => m.FinanceSummary),
  {
    ssr: false,
    loading: () => (
      <section className="card-glass flex h-72 items-center justify-center text-text-lo">
        Cargando estado financiero…
      </section>
    ),
  },
);

function saludo() {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buenos días";
  if (h < 21) return "Buenas tardes";
  return "Buenas noches";
}

function deltaIngresos(actual: number, anterior: number) {
  if (anterior === 0) {
    if (actual === 0) return { text: "Sin datos previos", tone: "neutral" as const };
    return { text: "Primer mes con ingresos", tone: "up" as const };
  }
  const pct = Math.round(((actual - anterior) / anterior) * 100);
  if (pct === 0) return { text: "Igual que el mes pasado", tone: "neutral" as const };
  return {
    text: `${pct > 0 ? "+" : ""}${pct}% vs mes anterior`,
    tone: pct > 0 ? ("up" as const) : ("down" as const),
  };
}

export default function Dashboard() {
  const { loading, error, kpis, finanzasAnio, citas, tareas, clientes, actividad } =
    useDashboardData();

  const proximaCitaHora = kpis.proximaCita
    ? new Date(kpis.proximaCita.start_time).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Panel principal"
        title={`${saludo()} 👋`}
        description="Resumen de todos tus módulos: clientes, agenda, tareas y finanzas en un solo vistazo."
      />

      {error && (
        <div className="card-glass flex flex-col gap-3 border border-rose-400/30 bg-rose-400/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-rose-300" />
            <div>
              <div className="font-display text-sm font-bold text-rose-100">
                No hemos podido contactar con la base de datos
              </div>
              <p className="mt-0.5 text-xs text-rose-200/80">
                Mostramos los datos en caché que tenemos. Detalle técnico: {error}
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-400/20 sm:self-auto"
          >
            <RefreshCcw size={13} /> Reintentar
          </button>
        </div>
      )}

      {/* Fila 1: KPIs principales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Clientes"
          value={kpis.clientesTotal}
          delta={
            kpis.clientesNuevosMes > 0
              ? { text: `+${kpis.clientesNuevosMes} este mes`, tone: "up" }
              : undefined
          }
          hint={kpis.clientesNuevosMes === 0 ? "sin altas este mes" : undefined}
          Icon={Building2}
          accent="cyan"
          loading={loading}
        />
        <KpiCard
          label="Citas hoy"
          value={kpis.citasHoy}
          delta={
            proximaCitaHora && kpis.proximaCita
              ? {
                  text: `Próxima ${proximaCitaHora} · ${kpis.proximaCita.title}`,
                  tone: "neutral",
                }
              : undefined
          }
          hint={!kpis.proximaCita ? "sin próximas citas" : undefined}
          Icon={Calendar}
          accent="fuchsia"
          loading={loading}
        />
        <KpiCard
          label="Ingresos del mes"
          value={eur(kpis.ingresosMes)}
          delta={deltaIngresos(kpis.ingresosMes, kpis.ingresosMesAnterior)}
          Icon={Wallet}
          accent="cyan"
          loading={loading}
        />
        <KpiCard
          label="Tareas pendientes"
          value={kpis.tareasPendientes}
          delta={
            kpis.tareasVencidas > 0
              ? { text: `${kpis.tareasVencidas} vencidas`, tone: "down" }
              : kpis.tareasPendientes === 0
                ? { text: "Todo al día", tone: "up" }
                : undefined
          }
          Icon={Activity}
          accent="fuchsia"
          loading={loading}
        />
      </div>

      {/* Fila 2: Estado financiero */}
      <FinanceSummary filas={finanzasAnio} loading={loading} />

      {/* Fila 3: Próximas citas + Tareas pendientes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UpcomingAppointments events={citas} loading={loading} />
        <PendingTasks tasks={tareas} loading={loading} />
      </div>

      {/* Fila 4: Últimos clientes + Actividad reciente */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentClients clientes={clientes} loading={loading} />
        <RecentActivity items={actividad} loading={loading} />
      </div>
    </div>
  );
}
