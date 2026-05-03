"use client";

import Link from "next/link";
import { Calendar, ArrowRight, MapPin } from "lucide-react";
import type { AgendaEventoRow } from "@/lib/agenda";

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function formatDiaCorto(iso: string) {
  const d = new Date(iso);
  const hoy = new Date();
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, hoy))    return "Hoy";
  if (sameDay(d, manana)) return "Mañana";
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

export function UpcomingAppointments({
  events,
  loading,
}: {
  events: AgendaEventoRow[];
  loading?: boolean;
}) {
  return (
    <section className="card-glass p-5">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10 text-cyan">
            <Calendar size={15} />
          </span>
          <h3 className="font-display text-base font-bold text-text-hi">Próximas citas</h3>
        </div>
        <Link
          href="/citas"
          className="flex items-center gap-1 text-xs text-text-mid hover:text-cyan"
        >
          Ver agenda <ArrowRight size={12} />
        </Link>
      </header>

      {loading ? (
        <SkeletonList />
      ) : events.length === 0 ? (
        <Empty text="No hay citas en los próximos 7 días" />
      ) : (
        <ul className="flex flex-col gap-2">
          {events.slice(0, 5).map((ev) => (
            <li
              key={ev.id}
              className="flex items-start gap-3 rounded-xl border border-indigo-400/15 bg-indigo-900/20 p-3"
            >
              <div className="flex min-w-[64px] flex-col items-center rounded-lg border border-cyan/30 bg-cyan/10 px-2 py-1.5 text-center">
                <span className="text-[0.65rem] uppercase tracking-wide text-cyan">
                  {formatDiaCorto(ev.start_time)}
                </span>
                <span className="font-display text-sm font-bold text-text-hi">
                  {formatHora(ev.start_time)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium text-text-hi">{ev.title}</div>
                {ev.ubicacion && (
                  <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-text-mid">
                    <MapPin size={11} />
                    <span className="truncate">{ev.ubicacion}</span>
                  </div>
                )}
              </div>
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
