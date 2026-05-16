import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Maximize2,
  Save,
  Send,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PlantillaDocumento } from "@/components/documentos/PlantillaDocumento";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ETIQUETA_TIPO, FORMATO_TIPO, type TipoDocumento } from "@/lib/documentos";
import { useThemeEngine } from "@/lib/theme/ThemeProvider";
import { AccionBtn } from "./EditorUiBits";
import type { useDocumentoEditor } from "./useDocumentoEditor";

type Editor = ReturnType<typeof useDocumentoEditor>;

/**
 * Panel derecho del editor: previsualización + acciones post-generación.
 * Encapsula la apertura de la ventana de impresión, el modal fullscreen
 * y los CTA para PDF / email / finanzas.
 */
export function EditorPreview({ tipo, editor }: { tipo: TipoDocumento; editor: Editor }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();
  const { theme } = useThemeEngine();
  const [fullscreen, setFullscreen] = useState(false);

  const coloresDocumento = {
    primario: theme["doc.primario"] ?? "#4f46e5",
    texto: theme["doc.texto"] ?? "#0f172a",
    acento: theme["doc.acento"] ?? "#eef2ff",
    acentoSuave: theme["doc.acentoSuave"] ?? "#f8fafc",
  };

  function abrirVentanaImpresion(modo: "pdf" | "vista") {
    if (!previewRef.current) return;
    const html = previewRef.current.innerHTML;
    const titulo = editor.generado?.referencia ?? "documento";
    const formato = FORMATO_TIPO[tipo];
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) {
      toast.err("El navegador bloqueó la ventana.");
      return;
    }
    const autoPrint = modo === "pdf" ? "<script>window.onload=()=>window.print()</script>" : "";
    const cssA4 = `
      body{margin:0;background:#f1f5f9;padding:24px;font-family:system-ui,sans-serif}
      .doc-wrap{max-width:900px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.15)}
      @page{size:A4;margin:18mm}
      @media print{body{background:#fff;padding:0}.doc-wrap{box-shadow:none;max-width:none;border-radius:0}}
    `;
    const cssTicket = `
      body{margin:0;background:#f1f5f9;padding:12px;font-family:ui-monospace,Menlo,monospace}
      .doc-wrap{width:80mm;margin:0 auto;background:#fff;box-shadow:0 6px 24px rgba(0,0,0,.15)}
      @page{size:80mm auto;margin:0}
      @media print{body{background:#fff;padding:0}.doc-wrap{box-shadow:none}}
    `;
    const css = formato === "ticket" ? cssTicket : cssA4;
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${titulo}</title>` +
        `<style>${css}</style></head><body><div class="doc-wrap">${html}</div>${autoPrint}</body></html>`,
    );
    w.document.close();
  }

  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-4 lg:h-fit">
      <div className="flex items-center justify-between">
        <div className="section-label">Previsualización</div>
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-1.5 text-xs font-semibold text-cyan hover:bg-cyan/20"
        >
          <Maximize2 size={12} /> Ver en grande
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-indigo-400/20 bg-white shadow-2xl">
        <div ref={previewRef}>
          <PlantillaDocumento
            tipo={tipo}
            serie={editor.serie}
            numero={editor.generado?.numero ?? null}
            anio={new Date(editor.fechaEmision).getFullYear()}
            fecha_emision={editor.fechaEmision}
            fecha_vencimiento={editor.fechaVencimiento || null}
            emisor={editor.emisor}
            cliente={editor.cliente}
            lineas={editor.lineas}
            irpf_pct={editor.irpfPct}
            notas={editor.notas || null}
            condiciones_pago={editor.condicionesPago || null}
            metodo_pago={editor.metodoPago || null}
            colores={coloresDocumento}
          />
        </div>
      </div>

      {!editor.generado && (
        <>
          {editor.errores.length > 0 && (
            <div className="rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-warn">
              <div className="mb-1 flex items-center gap-1.5 font-bold">
                <AlertCircle size={13} /> Faltan datos para generar
              </div>
              <ul className="list-disc pl-4">
                {editor.errores.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="button"
            onClick={editor.generar}
            disabled={editor.generando || editor.errores.length > 0 || !editor.negocioId}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-base font-bold text-white shadow-glow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:from-text-lo disabled:to-text-lo disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {editor.generando ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CheckCircle2 size={18} />
            )}
            Generar {ETIQUETA_TIPO[tipo].toLowerCase()}
          </button>
        </>
      )}

      {editor.generado && (
        <div className="card-glass p-4">
          <div className="section-label mb-3">¿Qué quieres hacer ahora?</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <AccionBtn
              onClick={() => abrirVentanaImpresion("pdf")}
              Icono={Download}
              label="Descargar PDF"
              tono="cyan"
            />
            <AccionBtn
              onClick={editor.enviarPorEmail}
              Icono={Send}
              label="Enviar por email"
              tono="fuchsia"
            />
            <AccionBtn
              onClick={() => router.push("/documentos")}
              Icono={Save}
              label="Guardado en la app"
              tono="ok"
              yaHecho
            />
            <AccionBtn
              onClick={editor.añadirAFinanzas}
              Icono={Wallet}
              label={editor.enviadoFinanzas ? "Añadido a Finanzas" : "Añadir a Finanzas"}
              tono="warn"
              yaHecho={editor.enviadoFinanzas}
            />
          </div>
        </div>
      )}

      <Modal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        size="xl"
        title={
          <button
            type="button"
            onClick={() => abrirVentanaImpresion("vista")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-1.5 text-xs font-semibold text-cyan hover:bg-cyan/20"
          >
            <Download size={12} /> Abrir en pestaña
          </button>
        }
        className="bg-white p-0"
      >
        <PlantillaDocumento
          tipo={tipo}
          serie={editor.serie}
          numero={editor.generado?.numero ?? null}
          anio={new Date(editor.fechaEmision).getFullYear()}
          fecha_emision={editor.fechaEmision}
          fecha_vencimiento={editor.fechaVencimiento || null}
          emisor={editor.emisor}
          cliente={editor.cliente}
          lineas={editor.lineas}
          irpf_pct={editor.irpfPct}
          notas={editor.notas || null}
          condiciones_pago={editor.condicionesPago || null}
          metodo_pago={editor.metodoPago || null}
          colores={coloresDocumento}
        />
      </Modal>
    </div>
  );
}
