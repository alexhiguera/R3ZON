"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Loader2,
  Receipt,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tooltip } from "@/components/ui/Tooltip";

type Documento = {
  id: string;
  tipo: string;
  referencia: string;
  fecha_emision: string;
  total: number;
  estado: string;
  pdf_url: string | null;
};

const ESTADO_DOC: Record<string, string> = {
  borrador:    "border-text-lo/30 bg-text-lo/10 text-text-lo",
  generado:    "border-indigo-400/30 bg-indigo-500/10 text-indigo-200",
  enviado:     "border-cyan/30 bg-cyan/10 text-cyan",
  pagado:      "border-ok/30 bg-ok/10 text-ok",
  anulado:     "border-danger/30 bg-danger/10 text-danger",
};

export function TabDocumentos({
  clienteId,
  clienteNombre,
}: {
  clienteId: string;
  clienteNombre: string;
}) {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("documentos")
        .select("id,tipo,referencia,fecha_emision,total,estado,pdf_url")
        .eq("cliente_id", clienteId)
        .order("fecha_emision", { ascending: false });
      setDocs((data ?? []) as Documento[]);
      setCargando(false);
    })();
  }, [clienteId]);

  if (cargando) {
    return (
      <div className="card-glass flex items-center gap-2 p-6 text-sm text-text-mid">
        <Loader2 className="animate-spin" size={14} /> Cargando documentos…
      </div>
    );
  }

  return (
    <div className="card-glass p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="section-label mb-0.5">Documentos comerciales</div>
          <p className="text-xs text-text-mid">
            Facturas, presupuestos y albaranes emitidos a {clienteNombre}.
          </p>
        </div>
        <Tooltip text="Crear nuevo documento para este cliente." side="left">
          <Link
            href={`/documentos/nuevo?cliente=${clienteId}`}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-3 py-2 text-xs font-medium text-text-mid hover:border-cyan/40 hover:text-text-hi"
          >
            <Plus size={13} /> Nuevo
          </Link>
        </Tooltip>
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <FileText size={28} className="text-indigo-400/30" />
          <div className="text-sm font-medium text-text-hi">
            Sin documentos emitidos
          </div>
          <p className="text-xs text-text-mid">
            Crea una factura o presupuesto desde el botón.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-indigo-400/10 overflow-hidden rounded-2xl border border-indigo-400/15">
          {docs.map((d) => (
            <li key={d.id} className="flex items-start gap-3 bg-indigo-900/15 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan">
                <Receipt size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/documentos/${d.id}`}
                  className="truncate text-sm font-semibold text-text-hi hover:text-cyan"
                >
                  {d.referencia}
                </Link>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-lo">
                  <span className="capitalize">{d.tipo}</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(d.fecha_emision).toLocaleDateString("es-ES")}
                  </span>
                  {d.pdf_url && (
                    <a
                      href={d.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-cyan hover:underline"
                    >
                      <ExternalLink size={10} /> PDF
                    </a>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-bold text-text-hi">
                  {d.total.toFixed(2)} €
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${ESTADO_DOC[d.estado] ?? ""}`}
                >
                  {d.estado}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
