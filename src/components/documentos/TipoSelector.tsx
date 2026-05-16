import {
  ArrowLeft,
  BadgeCheck,
  ClipboardList,
  FileSignature,
  FileSpreadsheet,
  FileText,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  DESCRIPCION_TIPO,
  ETIQUETA_TIPO,
  TIPOS_DOCUMENTO,
  type TipoDocumento,
} from "@/lib/documentos";

const ICONO_TIPO: Record<TipoDocumento, typeof FileText> = {
  factura: FileText,
  ticket: Receipt,
  presupuesto: FileSpreadsheet,
  albaran: ClipboardList,
  proforma: FileSignature,
  recibo: BadgeCheck,
};

export function TipoSelector({ onElegir }: { onElegir: (tipo: TipoDocumento) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/documentos"
        className="inline-flex items-center gap-1.5 text-sm text-text-mid hover:text-text-hi"
      >
        <ArrowLeft size={14} /> Volver
      </Link>
      <PageHeader
        eyebrow="Nuevo documento"
        title="¿Qué quieres crear?"
        description="Elige el tipo de documento. Cada tipo tiene su propia numeración correlativa."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TIPOS_DOCUMENTO.map((t) => {
          const Icono = ICONO_TIPO[t];
          return (
            <button
              key={t}
              onClick={() => onElegir(t)}
              className="card-glass group flex flex-col items-start gap-3 p-5 text-left transition-all hover:-translate-y-1 hover:border-cyan/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan/30 bg-cyan/10 text-cyan group-hover:shadow-glow">
                <Icono size={20} />
              </span>
              <div>
                <div className="font-display text-lg font-bold text-text-hi">
                  {ETIQUETA_TIPO[t]}
                </div>
                <p className="mt-1 text-xs text-text-mid">{DESCRIPCION_TIPO[t]}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
