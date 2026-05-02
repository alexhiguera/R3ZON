"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Tooltip } from "@/components/ui/Tooltip";

type Cita = {
  id: string;
  titulo: string;
  inicio: string;
  fin: string;
  estado: string;
  ubicacion: string | null;
  precio: number | null;
};

const ESTADO_STYLE: Record<string, string> = {
  pendiente:   "border-warn/30 bg-warn/10 text-warn",
  confirmada:  "border-cyan/30 bg-cyan/10 text-cyan",
  completada:  "border-ok/30 bg-ok/10 text-ok",
  cancelada:   "border-danger/30 bg-danger/10 text-danger",
};

export function TabHistorial({ clienteId, clienteNombre }: { clienteId: string; clienteNombre: string }) {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("citas")
        .select("id,titulo,inicio,fin,estado,ubicacion,precio")
        .eq("cliente_id", clienteId)
        .order("inicio", { ascending: false });
      setCitas((data ?? []) as Cita[]);
      setCargando(false);
    })();
  }, [clienteId]);

  return (
    <div className="card-glass p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="section-label mb-0.5">Historial de citas</div>
          <p className="text-xs text-text-mid">
            Todas las citas que has tenido con {clienteNombre}.
          </p>
        </div>
        <Tooltip text="Crea una nueva cita para este cliente en la Agenda." side="left">
          <Link
            href={`/citas/nueva?cliente=${clienteId}`}
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
          <p className="text-xs text-text-mid">Añade una desde el botón de arriba.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {citas.map((c) => {
          const inicio = new Date(c.inicio);
          const fin = new Date(c.fin);
          const durMin = Math.round((fin.getTime() - inicio.getTime()) / 60000);
          return (
            <div
              key={c.id}
              className="flex items-start gap-3 rounded-2xl border border-indigo-400/10 bg-indigo-900/20 p-3"
            >
              {/* Fecha */}
              <div className="flex w-12 shrink-0 flex-col items-center rounded-xl border border-indigo-400/15 bg-indigo-900/40 py-1.5 text-center">
                <span className="text-[0.6rem] font-medium uppercase text-text-lo">
                  {inicio.toLocaleString("es-ES", { month: "short" })}
                </span>
                <span className="font-display text-xl font-bold leading-tight text-text-hi">
                  {inicio.getDate()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-text-hi truncate">{c.titulo}</div>
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
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold ${ESTADO_STYLE[c.estado] ?? ""}`}>
                  {c.estado}
                </span>
                {c.precio != null && (
                  <span className="text-xs font-bold text-ok">
                    {c.precio.toFixed(2)} €
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
