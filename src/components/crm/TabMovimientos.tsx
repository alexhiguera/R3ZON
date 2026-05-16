"use client";

import { Calendar, Euro, Loader2, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { createClient } from "@/lib/supabase/client";

type Movimiento = {
  id: string;
  tipo: "ingreso" | "gasto";
  concepto: string;
  fecha: string;
  total: number;
  estado_pago: string;
  numero_factura: string | null;
};

const ESTADO_PAGO: Record<string, string> = {
  pagado: "border-ok/30 bg-ok/10 text-ok",
  pendiente: "border-warn/30 bg-warn/10 text-warn",
  vencido: "border-danger/30 bg-danger/10 text-danger",
};

export function TabMovimientos({
  clienteId,
  clienteNombre,
}: {
  clienteId: string;
  clienteNombre: string;
}) {
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("finanzas")
        .select("id,tipo,concepto,fecha,total,estado_pago,numero_factura")
        .eq("cliente_id", clienteId)
        .order("fecha", { ascending: false });
      setMovs((data ?? []) as Movimiento[]);
      setCargando(false);
    })();
  }, [clienteId]);

  if (cargando) {
    return (
      <div className="card-glass flex items-center gap-2 p-6 text-sm text-text-mid">
        <Loader2 className="animate-spin" size={14} /> Cargando movimientos…
      </div>
    );
  }

  return (
    <div className="card-glass p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="section-label mb-0.5">Movimientos financieros</div>
          <p className="text-xs text-text-mid">Ingresos y gastos asociados a {clienteNombre}.</p>
        </div>
        <Tooltip text="Registrar un nuevo movimiento para este cliente." side="left">
          <Link
            href={`/finanzas?cliente=${clienteId}`}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-3 py-2 text-xs font-medium text-text-mid hover:border-cyan/40 hover:text-text-hi"
          >
            <Plus size={13} /> Movimiento
          </Link>
        </Tooltip>
      </div>

      {movs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Wallet size={28} className="text-indigo-400/30" />
          <div className="text-sm font-medium text-text-hi">Sin movimientos</div>
          <p className="text-xs text-text-mid">
            Aún no has registrado ingresos ni gastos asociados.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-indigo-400/10 overflow-hidden rounded-2xl border border-indigo-400/15">
          {movs.map((m) => (
            <li key={m.id} className="flex items-start gap-3 bg-indigo-900/15 p-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                  m.tipo === "ingreso"
                    ? "border-ok/30 bg-ok/10 text-ok"
                    : "border-danger/30 bg-danger/10 text-danger"
                }`}
              >
                <Euro size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-text-hi">{m.concepto}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-lo">
                  <span className="capitalize">{m.tipo}</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(m.fecha).toLocaleDateString("es-ES")}
                  </span>
                  {m.numero_factura && <span className="font-mono">{m.numero_factura}</span>}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={`text-sm font-bold ${
                    m.tipo === "ingreso" ? "text-ok" : "text-danger"
                  }`}
                >
                  {m.tipo === "ingreso" ? "+" : "−"}
                  {m.total.toFixed(2)} €
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${ESTADO_PAGO[m.estado_pago] ?? ""}`}
                >
                  {m.estado_pago}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
