"use client";

import { useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Send, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useSupabaseQuery } from "@/lib/useSupabaseQuery";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlantillaDocumento } from "@/components/documentos/PlantillaDocumento";
import {
  ETIQUETA_TIPO,
  FORMATO_TIPO,
  eur,
  type Documento,
} from "@/lib/documentos";

export default function DocumentoDetallePage() {
  const toast = useToast();
  const params = useParams<{ id: string }>();
  const previewRef = useRef<HTMLDivElement>(null);
  const id = params?.id;

  const { data: doc, loading: cargando } = useSupabaseQuery<Documento>(
    (sb) => sb.from("documentos").select("*").eq("id", id ?? "").single(),
    { context: "documento", deps: [id], enabled: !!id },
  );

  function descargarPDF() {
    if (!previewRef.current || !doc) return;
    const html = previewRef.current.innerHTML;
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) {
      toast.err("El navegador bloqueó la ventana de impresión.");
      return;
    }
    const esTicket = FORMATO_TIPO[doc.tipo] === "ticket";
    const css = esTicket
      ? "body{margin:0;background:#fff;padding:0;font-family:ui-monospace,Menlo,monospace}@page{size:80mm auto;margin:0}"
      : "body{margin:0;background:#f1f5f9;padding:24px;font-family:system-ui,sans-serif}@page{size:A4;margin:18mm}@media print{body{background:#fff;padding:0}}";
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${doc.referencia}</title>
      <style>${css}</style>
      </head><body>${html}<script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  }

  function enviarPorEmail() {
    if (!doc) return;
    const destinatario = doc.cliente_snapshot?.email ?? "";
    const asunto = encodeURIComponent(
      `${ETIQUETA_TIPO[doc.tipo]} ${doc.referencia} — ${doc.emisor_snapshot?.nombre ?? ""}`,
    );
    const cuerpo = encodeURIComponent(
      `Hola${doc.cliente_snapshot?.nombre ? ` ${doc.cliente_snapshot.nombre}` : ""},\n\n` +
        `Adjunto te envío la ${ETIQUETA_TIPO[doc.tipo].toLowerCase()} ${doc.referencia} ` +
        `por importe de ${eur(Number(doc.total))}.\n\nUn saludo.`,
    );
    window.location.href = `mailto:${destinatario}?subject=${asunto}&body=${cuerpo}`;
  }

  if (cargando) {
    return (
      <div className="card-glass flex h-48 items-center justify-center">
        <Loader2 className="animate-spin text-text-lo" size={20} />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex flex-col gap-3">
        <Link href="/documentos" className="inline-flex items-center gap-1.5 text-sm text-text-mid">
          <ArrowLeft size={14} /> Volver
        </Link>
        <div className="card-glass p-6 text-center text-text-mid">
          Documento no encontrado.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/documentos"
        className="inline-flex items-center gap-1.5 text-sm text-text-mid hover:text-text-hi"
      >
        <ArrowLeft size={14} /> Volver al listado
      </Link>

      <PageHeader
        eyebrow={ETIQUETA_TIPO[doc.tipo]}
        title={doc.referencia}
        description={`Emitido el ${new Date(doc.fecha_emision).toLocaleDateString("es-ES")} · Estado: ${doc.estado}`}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),320px]">
        <div className="overflow-hidden rounded-2xl border border-indigo-400/20 bg-white shadow-2xl">
          <div ref={previewRef}>
            <PlantillaDocumento
              tipo={doc.tipo}
              serie={doc.serie}
              numero={doc.numero}
              anio={doc.anio}
              fecha_emision={doc.fecha_emision}
              fecha_vencimiento={doc.fecha_vencimiento}
              emisor={doc.emisor_snapshot}
              cliente={doc.cliente_snapshot}
              lineas={doc.lineas}
              irpf_pct={Number(doc.irpf_pct)}
              notas={doc.notas}
              condiciones_pago={doc.condiciones_pago}
              metodo_pago={doc.metodo_pago}
            />
          </div>
        </div>

        <aside className="card-glass flex h-fit flex-col gap-3 p-4">
          <div className="section-label">Acciones</div>
          <button
            onClick={descargarPDF}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-cyan/40 bg-cyan/10 text-sm font-bold text-cyan hover:bg-cyan/20"
          >
            <Download size={15} /> Descargar PDF
          </button>
          <button
            onClick={enviarPorEmail}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-fuchsia/40 bg-fuchsia/10 text-sm font-bold text-fuchsia hover:bg-fuchsia/20"
          >
            <Send size={15} /> Enviar por email
          </button>

          <div className="mt-3 border-t border-indigo-400/15 pt-3 text-xs text-text-mid">
            <div className="section-label mb-2">Resumen</div>
            <Resumen label="Cliente" valor={doc.cliente_snapshot?.nombre ?? "—"} />
            <Resumen label="Total"   valor={eur(Number(doc.total))} />
            <Resumen label="Base"    valor={eur(Number(doc.base_imponible))} />
            <Resumen label="IVA"     valor={eur(Number(doc.iva_total))} />
            {Number(doc.irpf_total) > 0 && (
              <Resumen label="IRPF" valor={`− ${eur(Number(doc.irpf_total))}`} />
            )}
            {doc.finanza_id && (
              <div className="mt-2 rounded-lg border border-ok/30 bg-ok/10 px-2 py-1.5 text-[0.7rem] text-ok">
                Vinculado a Finanzas
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Resumen({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-text-lo">{label}</span>
      <span className="font-medium text-text-hi">{valor}</span>
    </div>
  );
}
