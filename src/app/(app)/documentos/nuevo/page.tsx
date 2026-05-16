"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EditorForm } from "@/components/documentos/EditorForm";
import { EditorPreview } from "@/components/documentos/EditorPreview";
import { TipoSelector } from "@/components/documentos/TipoSelector";
import { useDocumentoEditor } from "@/components/documentos/useDocumentoEditor";
import { PageHeader } from "@/components/ui/PageHeader";
import { DESCRIPCION_TIPO, ETIQUETA_TIPO, type TipoDocumento } from "@/lib/documentos";

export default function NuevoDocumentoPage() {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoDocumento | null>(null);
  const editor = useDocumentoEditor(tipo);

  // Paso 1 — elegir tipo de documento.
  if (!tipo) {
    return <TipoSelector onElegir={setTipo} />;
  }

  // Paso 2 — editor (form + preview).
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => (editor.generado ? router.push("/documentos") : setTipo(null))}
          className="inline-flex items-center gap-1.5 text-sm text-text-mid hover:text-text-hi"
        >
          <ArrowLeft size={14} /> {editor.generado ? "Ir al listado" : "Cambiar tipo"}
        </button>
        {editor.generado && (
          <span className="rounded-lg border border-ok/40 bg-ok/10 px-3 py-1 text-xs font-bold text-ok">
            Generado · {editor.generado.referencia}
          </span>
        )}
      </div>

      <PageHeader
        eyebrow={ETIQUETA_TIPO[tipo]}
        title={
          editor.generado
            ? `${ETIQUETA_TIPO[tipo]} ${editor.generado.referencia}`
            : `Nueva ${ETIQUETA_TIPO[tipo].toLowerCase()}`
        }
        description={DESCRIPCION_TIPO[tipo]}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <EditorForm tipo={tipo} editor={editor} />
        <EditorPreview tipo={tipo} editor={editor} />
      </div>
    </div>
  );
}
