"use client";

import { ArrowRight, CalendarDays, Clock, Loader2, MapPin, User2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  ubicacion: string | null;
  estado: "confirmada" | "tentativa" | "cancelada";
  clientes: { id: string; nombre: string } | null;
};

const ESTADO_STYLE: Record<string, string> = {
  tentativa: "border-warn/30 bg-warn/10 text-warn",
  confirmada: "border-cyan/30 bg-cyan/10 text-cyan",
  cancelada: "border-danger/30 bg-danger/10 text-danger",
};

export function MisCitas() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("agenda_eventos")
        .select("id,title,start_time,end_time,ubicacion,estado,clientes(id,nombre)")
        .neq("estado", "cancelada")
        .gte("start_time", now)
        .order("start_time", { ascending: true })
        .limit(8);
      setRows((data ?? []) as unknown as Row[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="card-glass space-y-3 p-5">
      <div className="flex items-center gap-2">
        <CalendarDays size={16} className="text-cyan" />
        <h2 className="font-display text-lg font-bold text-text-hi">Mis próximas citas</h2>
        <Link
          href="/citas"
          className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-cyan hover:underline"
        >
          Ver agenda <ArrowRight size={11} />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-text-mid">
          <Loader2 className="animate-spin" size={14} /> Cargando…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-indigo-400/15 bg-indigo-900/20 p-4 text-sm italic text-text-lo">
          No tienes citas programadas próximamente.
        </div>
      ) : (
        <ul className="divide-y divide-indigo-400/10 overflow-hidden rounded-2xl border border-indigo-400/15">
          {rows.map((c) => {
            const inicio = new Date(c.start_time);
            const fin = new Date(c.end_time);
            const durMin = Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / 60000));
            return (
              <li key={c.id} className="flex items-start gap-3 bg-indigo-900/15 p-3">
                <div className="flex w-12 shrink-0 flex-col items-center rounded-xl border border-indigo-400/15 bg-indigo-900/40 py-1.5 text-center">
                  <span className="text-[0.6rem] font-medium uppercase text-text-lo">
                    {inicio.toLocaleString("es-ES", { month: "short" })}
                  </span>
                  <span className="font-display text-xl font-bold leading-tight text-text-hi">
                    {inicio.getDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-text-hi">{c.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-lo">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {inicio.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      {durMin} min
                    </span>
                    {c.clientes && (
                      <Link
                        href={`/clientes/${c.clientes.id}`}
                        className="flex items-center gap-1 text-cyan hover:underline"
                      >
                        <User2 size={10} /> {c.clientes.nombre}
                      </Link>
                    )}
                    {c.ubicacion && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {c.ubicacion}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ESTADO_STYLE[c.estado] ?? ""}`}
                >
                  {c.estado}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
