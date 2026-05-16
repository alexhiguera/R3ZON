"use client";

import { Calendar, CalendarPlus, Clock, Loader2, MapPin, Search, User2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  estado: "confirmada" | "tentativa" | "cancelada";
  ubicacion: string | null;
  cliente_id: string | null;
  clientes: { id: string; nombre: string } | null;
};

type Filtro = "proximas" | "hoy" | "semana" | "pasadas" | "todas";

const ESTADO_STYLE: Record<string, string> = {
  tentativa: "border-warn/30 bg-warn/10 text-warn",
  confirmada: "border-cyan/30 bg-cyan/10 text-cyan",
  cancelada: "border-danger/30 bg-danger/10 text-danger",
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function CitasLista() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("proximas");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("agenda_eventos")
        .select(
          "id,title,description,start_time,end_time,estado,ubicacion,cliente_id,clientes(id,nombre)",
        )
        .neq("estado", "cancelada")
        .order("start_time", { ascending: false })
        .limit(500);
      setRows((data ?? []) as unknown as Row[]);
      setLoading(false);
    })();
  }, []);

  const filtradas = useMemo(() => {
    const now = new Date();
    const hoy0 = startOfDay(now);
    const finHoy = new Date(hoy0.getTime() + 24 * 60 * 60 * 1000);
    const finSemana = new Date(hoy0.getTime() + 7 * 24 * 60 * 60 * 1000);
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      const start = new Date(r.start_time);
      if (filtro === "proximas" && start < now) return false;
      if (filtro === "hoy" && (start < hoy0 || start >= finHoy)) return false;
      if (filtro === "semana" && (start < hoy0 || start >= finSemana)) return false;
      if (filtro === "pasadas" && start >= now) return false;
      if (term) {
        const hay =
          r.title.toLowerCase().includes(term) ||
          (r.ubicacion ?? "").toLowerCase().includes(term) ||
          (r.clientes?.nombre ?? "").toLowerCase().includes(term);
        if (!hay) return false;
      }
      return true;
    });
  }, [rows, filtro, search]);

  const ordenadas = useMemo(() => {
    return [...filtradas].sort((a, b) =>
      filtro === "pasadas"
        ? new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        : new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );
  }, [filtradas, filtro]);

  return (
    <div className="card-glass overflow-hidden">
      <div className="rainbow-bar" />
      <div className="flex flex-wrap items-center gap-3 border-b border-indigo-400/15 px-5 py-4">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 py-2">
          <Search size={14} className="text-text-mid" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, cliente o ubicación…"
            className="w-full bg-transparent text-sm text-text-hi placeholder:text-text-ghost focus:outline-none"
          />
        </div>
        <div
          role="tablist"
          className="flex flex-wrap gap-1 rounded-xl border border-indigo-400/20 bg-indigo-900/20 p-1"
        >
          {(
            [
              ["proximas", "Próximas"],
              ["hoy", "Hoy"],
              ["semana", "7 días"],
              ["pasadas", "Pasadas"],
              ["todas", "Todas"],
            ] as [Filtro, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltro(id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filtro === id
                  ? "bg-gradient-to-r from-cyan to-fuchsia text-bg"
                  : "text-text-mid hover:text-text-hi"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 p-6 text-sm text-text-mid">
          <Loader2 className="animate-spin" size={14} /> Cargando citas…
        </div>
      ) : ordenadas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center">
          <Calendar size={28} className="text-indigo-400/30" />
          <div className="text-sm font-medium text-text-hi">Sin citas en esta vista</div>
          <p className="max-w-sm text-xs text-text-mid">
            Cambia de filtro o crea una nueva cita desde el calendario.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-indigo-400/10">
          {ordenadas.map((c) => {
            const inicio = new Date(c.start_time);
            const fin = new Date(c.end_time);
            const durMin = Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / 60000));
            return (
              <li key={c.id} className="flex items-start gap-3 px-5 py-3">
                <div className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-indigo-400/15 bg-indigo-900/40 py-1.5 text-center">
                  <span className="text-[0.6rem] font-medium uppercase text-text-lo">
                    {inicio.toLocaleString("es-ES", { month: "short" })}
                  </span>
                  <span className="font-display text-xl font-bold leading-tight text-text-hi">
                    {inicio.getDate()}
                  </span>
                  <span className="text-[10px] text-text-lo">
                    {inicio.toLocaleString("es-ES", { weekday: "short" })}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-text-hi">{c.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-lo">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {inicio.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      {" – "}
                      {fin.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      {durMin} min
                    </span>
                    {c.clientes && (
                      <Link
                        href={`/clientes/${c.clientes.id}`}
                        className="flex items-center gap-1 text-cyan hover:underline"
                      >
                        <User2 size={11} /> {c.clientes.nombre}
                      </Link>
                    )}
                    {c.ubicacion && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {c.ubicacion}
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

      <div className="border-t border-indigo-400/10 px-5 py-3 text-right">
        <Link
          href="/citas"
          className="inline-flex items-center gap-1 text-[11px] text-text-lo hover:text-cyan"
        >
          <CalendarPlus size={12} /> Crear desde el calendario
        </Link>
      </div>
    </div>
  );
}
