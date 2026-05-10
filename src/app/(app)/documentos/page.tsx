"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Receipt,
  FileSpreadsheet,
  ClipboardList,
  FileSignature,
  Plus,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import {
  ETIQUETA_TIPO,
  TIPOS_DOCUMENTO,
  eur,
  type Documento,
  type TipoDocumento,
} from "@/lib/documentos";

const ICONO_TIPO: Record<TipoDocumento, typeof FileText> = {
  factura:     FileText,
  ticket:      Receipt,
  presupuesto: FileSpreadsheet,
  albaran:     ClipboardList,
  proforma:    FileSignature,
};

const ESTADO_COLOR: Record<string, string> = {
  borrador: "border-text-lo/30 bg-text-lo/10 text-text-mid",
  generado: "border-cyan/30 bg-cyan/10 text-cyan",
  enviado:  "border-fuchsia/30 bg-fuchsia/10 text-fuchsia",
  pagado:   "border-ok/30 bg-ok/10 text-ok",
  anulado:  "border-danger/30 bg-danger/10 text-danger",
};

export default function DocumentosPage() {
  const supabase = createClient();
  const toast = useToast();

  const [docs, setDocs] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<TipoDocumento | "todos">("todos");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select(
          "id,tipo,serie,numero,anio,referencia,fecha_emision,cliente_snapshot,total,estado,pdf_url,created_at,updated_at",
        )
        .order("fecha_emision", { ascending: false })
        .order("numero", { ascending: false });

      if (error) {
        toast.err(`Error al cargar documentos: ${error.message}`);
        setCargando(false);
        return;
      }
      setDocs((data ?? []) as Documento[]);
      setCargando(false);
    })();
  }, [supabase, toast]);

  const visibles = useMemo(
    () => (filtro === "todos" ? docs : docs.filter((d) => d.tipo === filtro)),
    [docs, filtro],
  );

  const conteoPorTipo = useMemo(() => {
    const m = new Map<TipoDocumento, number>();
    for (const d of docs) m.set(d.tipo, (m.get(d.tipo) ?? 0) + 1);
    return m;
  }, [docs]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Documentos comerciales"
        title="Facturas, tickets y presupuestos"
        description="Crea, descarga, envía y archiva tus documentos comerciales. Las facturas se numeran de forma correlativa y son inmutables una vez generadas."
      />

      <div className="card-glass flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          <FiltroChip
            label={`Todos · ${docs.length}`}
            activo={filtro === "todos"}
            onClick={() => setFiltro("todos")}
          />
          {TIPOS_DOCUMENTO.map((t) => (
            <FiltroChip
              key={t}
              label={`${ETIQUETA_TIPO[t]} · ${conteoPorTipo.get(t) ?? 0}`}
              activo={filtro === t}
              onClick={() => setFiltro(t)}
            />
          ))}
        </div>
        <Link
          href="/documentos/nuevo"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-glow transition-transform hover:-translate-y-0.5"
        >
          <Plus size={16} /> Nuevo documento
        </Link>
      </div>

      {cargando ? (
        <div className="card-glass flex h-48 items-center justify-center text-text-lo">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : visibles.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="card-glass overflow-hidden">
          <div className="grid grid-cols-1 divide-y divide-indigo-400/10 sm:grid-cols-1">
            {visibles.map((d) => (
              <FilaDocumento key={d.id} doc={d} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FiltroChip({
  label,
  activo,
  onClick,
}: {
  label: string;
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
        activo
          ? "border-cyan/50 bg-cyan/10 text-cyan"
          : "border-indigo-400/15 bg-indigo-900/20 text-text-mid hover:text-text-hi"
      }`}
    >
      {label}
    </button>
  );
}

function FilaDocumento({ doc }: { doc: Documento }) {
  const Icono = ICONO_TIPO[doc.tipo];
  const cliente = doc.cliente_snapshot?.nombre ?? "Sin cliente";
  return (
    <Link
      href={`/documentos/${doc.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-indigo-900/20"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-900/30 text-cyan">
        <Icono size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono text-text-hi">{doc.referencia}</span>
          <span
            className={`rounded-md border px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${
              ESTADO_COLOR[doc.estado] ?? ESTADO_COLOR.borrador
            }`}
          >
            {doc.estado}
          </span>
        </div>
        <div className="truncate text-xs text-text-mid">
          {ETIQUETA_TIPO[doc.tipo]} · {cliente} ·{" "}
          {new Date(doc.fecha_emision).toLocaleDateString("es-ES")}
        </div>
      </div>
      <div className="text-right">
        <div className="font-display text-base font-bold text-text-hi">
          {eur(Number(doc.total))}
        </div>
        <div className="flex items-center justify-end gap-1 text-[0.7rem] text-text-lo">
          Abrir <ExternalLink size={10} />
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="card-glass flex flex-col items-center gap-3 py-12 text-center text-text-mid">
      <FileText size={28} className="text-indigo-400/40" />
      <div className="font-display text-lg font-bold">Aún no hay documentos</div>
      <p className="max-w-xs text-sm">
        Crea tu primera factura, ticket o presupuesto y aparecerá aquí.
      </p>
      <Link
        href="/documentos/nuevo"
        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-bold text-white"
      >
        <Plus size={15} /> Crear documento
      </Link>
    </div>
  );
}
