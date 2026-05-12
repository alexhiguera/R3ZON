"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, Plus, FileText } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Tooltip } from "@/components/ui/Tooltip";

type Evento = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  estado: "confirmada" | "tentativa" | "cancelada";
  ubicacion: string | null;
};

const ESTADO_STYLE: Record<string, string> = {
  tentativa:  "border-warn/30 bg-warn/10 text-warn",
  confirmada: "border-cyan/30 bg-cyan/10 text-cyan",
  cancelada:  "border-danger/30 bg-danger/10 text-danger",
};

export function TabHistorial({ clienteId, clienteNombre }: { clienteId: string; clienteNombre: string }) {
  const [citas, setCitas] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("agenda_eventos")
        .select("id,title,description,start_time,end_time,estado,ubicacion")
        .eq("cliente_id", clienteId)
        .order("start_time", { ascending: false });
      setCitas((data ?? []) as Evento[]);
      setCargando(false);
    })();
  }, [clienteId]);

  return (
    <div className="card-glass p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="section-label mb-0.5">Historial de citas</div>
          <p className="text-xs text-text-mid">
            Todas las citas asociadas a {clienteNombre} (sincronizadas con Google Calendar).
          </p>
        </div>
        <Tooltip text="Abre la agenda para crear una cita vinculada a este cliente." side="left">
          <Link
            href={`/citas?cliente=${clienteId}`}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-3 py-2 text-xs font-medium text-text-mid hover:border-cyan/40 hover:text-text-hi"
          >
            <Plus size={13} /> Nueva cita
          </Link>
        </Tooltip>
      </div>

      {cargando && <div className="py-8 text-center text-sm text-text-lo">Cargando…</div>}

      {!cargando && citas.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Calendar size={28} className="text-indigo-400/30" />
          <div className="text-sm font-medium text-text-hi">Sin citas todavía</div>
          <p className="text-xs text-text-mid">Vincula este cliente al crear una cita en la agenda.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {citas.map((c) => {
          const inicio = new Date(c.start_time);
          const fin = new Date(c.end_time);
          const durMin = Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / 60000));
          return (
            <div
              key={c.id}
              className="flex items-start gap-3 rounded-2xl border border-indigo-400/10 bg-indigo-900/20 p-3"
            >
              <div className="flex w-12 shrink-0 flex-col items-center rounded-xl border border-indigo-400/15 bg-indigo-900/40 py-1.5 text-center">
                <span className="text-[0.6rem] font-medium uppercase text-text-lo">
                  {inicio.toLocaleString("es-ES", { month: "short" })}
                </span>
                <span className="font-display text-xl font-bold leading-tight text-text-hi">
                  {inicio.getDate()}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-text-hi">{c.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.68rem] text-text-lo">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {inicio.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    {" · "}{durMin} min
                  </span>
                  {c.ubicacion && (
                    <span className="flex items-center gap-1">
                      <MapPin size={10} /> {c.ubicacion}
                    </span>
                  )}
                  {c.description && (
                    <span className="flex items-center gap-1 italic">
                      <FileText size={10} /> {c.description.slice(0, 40)}
                      {c.description.length > 40 ? "…" : ""}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className={`rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold ${ESTADO_STYLE[c.estado] ?? ""}`}>
                  {c.estado}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
