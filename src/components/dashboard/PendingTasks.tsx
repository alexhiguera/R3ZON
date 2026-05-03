"use client";

import Link from "next/link";
import { ArrowRight, Kanban, Clock, AlertCircle } from "lucide-react";

export type DashboardTask = {
  id: string;
  titulo: string;
  prioridad: "alta" | "media" | "baja" | string | null;
  fecha_limite: string | null;
  completada: boolean;
};

const PRIO: Record<string, { label: string; className: string }> = {
  alta:  { label: "Alta",  className: "border-rose-400/40 bg-rose-400/10 text-rose-300" },
  media: { label: "Media", className: "border-amber-400/40 bg-amber-400/10 text-amber-300" },
  baja:  { label: "Baja",  className: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" },
};

function dueInfo(fecha: string | null) {
  if (!fecha) return { text: "Sin fecha", tone: "text-text-lo", icon: Clock };
  const d = new Date(fecha);
  const now = new Date();
  const diffDays = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)  return { text: `Vencida hace ${Math.abs(diffDays)}d`, tone: "text-rose-300", icon: AlertCircle };
  if (diffDays === 0) return { text: "Vence hoy", tone: "text-amber-300", icon: AlertCircle };
  if (diffDays <= 3)  return { text: `Vence en ${diffDays}d`, tone: "text-amber-300", icon: Clock };
  return { text: d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }), tone: "text-text-mid", icon: Clock };
}

export function PendingTasks({
  tasks,
  loading,
}: {
  tasks: DashboardTask[];
  loading?: boolean;
}) {
  return (
    <section className="card-glass p-5">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-fuchsia/30 bg-fuchsia/10 text-fuchsia">
            <Kanban size={15} />
          </span>
          <h3 className="font-display text-base font-bold text-text-hi">Tareas pendientes</h3>
        </div>
        <Link
          href="/tareas"
          className="flex items-center gap-1 text-xs text-text-mid hover:text-fuchsia"
        >
          Ver kanban <ArrowRight size={12} />
        </Link>
      </header>

      {loading ? (
        <SkeletonList />
      ) : tasks.length === 0 ? (
        <Empty text="No tienes tareas pendientes 🎉" />
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.slice(0, 5).map((t) => {
            const prio = PRIO[String(t.prioridad ?? "media").toLowerCase()] ?? PRIO.media;
            const due = dueInfo(t.fecha_limite);
            const DueIcon = due.icon;
            return (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded-xl border border-indigo-400/15 bg-indigo-900/20 p-3"
              >
                <span
                  className={`mt-0.5 inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[0.65rem] font-bold uppercase ${prio.className}`}
                >
                  {prio.label}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium text-text-hi">{t.titulo}</div>
                  <div className={`mt-0.5 flex items-center gap-1 text-xs ${due.tone}`}>
                    <DueIcon size={11} />
                    <span>{due.text}</span>
                  </div>
                </div>
              </li>
            );
          })}
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
