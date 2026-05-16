"use client";

import { Bug, Copy, LifeBuoy, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

const DESTINATARIO = "info@r3zon.com";

type Tipo = "bug" | "sugerencia" | "pregunta" | "otro";

const ETIQUETA_TIPO: Record<Tipo, string> = {
  bug: "Bug / error",
  sugerencia: "Sugerencia",
  pregunta: "Pregunta",
  otro: "Otro",
};

export function ReportesTab() {
  const toast = useToast();
  const [tipo, setTipo] = useState<Tipo>("bug");
  const [titulo, setTitulo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [incluirTecnico, setIncluirTecnico] = useState(true);

  const construirCuerpo = (): string => {
    const partes: string[] = [];
    partes.push(detalle.trim() || "(sin detalle)");
    if (incluirTecnico) {
      partes.push("");
      partes.push("— Información técnica —");
      if (typeof window !== "undefined") {
        partes.push(`URL: ${window.location.href}`);
        partes.push(`Viewport: ${window.innerWidth}×${window.innerHeight}`);
      }
      if (typeof navigator !== "undefined") {
        partes.push(`User-Agent: ${navigator.userAgent}`);
        partes.push(`Idioma: ${navigator.language}`);
        partes.push(
          `Plataforma: ${("userAgentData" in navigator && (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform) || "n/a"}`,
        );
      }
      partes.push(`Hora local: ${new Date().toLocaleString("es-ES")}`);
    }
    return partes.join("\n");
  };

  const construirAsunto = (): string => {
    const t = titulo.trim() || "sin título";
    return `[ANTARES · ${ETIQUETA_TIPO[tipo]}] ${t}`;
  };

  const enviar = () => {
    if (!titulo.trim() || !detalle.trim()) {
      toast.err("Rellena título y detalle antes de enviar.");
      return;
    }
    const asunto = encodeURIComponent(construirAsunto());
    const cuerpo = encodeURIComponent(construirCuerpo());
    const url = `mailto:${DESTINATARIO}?subject=${asunto}&body=${cuerpo}`;
    window.location.href = url;
  };

  const copiar = async () => {
    if (!titulo.trim() || !detalle.trim()) {
      toast.err("Rellena título y detalle antes de copiar.");
      return;
    }
    const texto = `Para: ${DESTINATARIO}\nAsunto: ${construirAsunto()}\n\n${construirCuerpo()}`;
    try {
      await navigator.clipboard.writeText(texto);
      toast.ok("Reporte copiado al portapapeles.");
    } catch {
      toast.err("No se pudo copiar al portapapeles.");
    }
  };

  return (
    <div className="card-glass overflow-hidden">
      <div className="rainbow-bar" />
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan">
            <LifeBuoy size={18} />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-text-hi">Reportar un problema</h2>
            <p className="mt-1 text-sm text-text-mid">
              ¿Algo no funciona como esperabas? ¿Tienes una sugerencia? Escríbenos a{" "}
              <a
                href={`mailto:${DESTINATARIO}`}
                className="font-semibold text-cyan underline decoration-cyan/50 underline-offset-2 hover:decoration-cyan"
              >
                {DESTINATARIO}
              </a>
              . Rellena el formulario y abriremos tu cliente de correo con el mensaje listo.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {(Object.keys(ETIQUETA_TIPO) as Tipo[]).map((t) => {
            const seleccionado = tipo === t;
            const Icono = t === "bug" ? Bug : MessageSquare;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  seleccionado
                    ? "border-cyan/50 bg-cyan/10 text-cyan"
                    : "border-indigo-400/20 bg-indigo-900/30 text-text-mid hover:border-indigo-400/40 hover:text-text-hi"
                }`}
              >
                <Icono size={14} />
                <span>{ETIQUETA_TIPO[t]}</span>
              </button>
            );
          })}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-text-lo">
            Título
          </span>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder='Ej: "El calendario no carga en Safari iOS"'
            maxLength={120}
            className="h-11 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-text-lo">
            Detalle
          </span>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            rows={6}
            placeholder="Qué esperabas, qué ha pasado, pasos para reproducirlo si es un bug."
            maxLength={4000}
            className="rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 py-2.5 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
          <span className="text-right text-[11px] text-text-lo">{detalle.length} / 4000</span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-indigo-400/15 bg-indigo-900/20 p-3">
          <input
            type="checkbox"
            checked={incluirTecnico}
            onChange={(e) => setIncluirTecnico(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-cyan"
          />
          <span>
            <span className="block text-sm font-semibold text-text-hi">
              Adjuntar información técnica
            </span>
            <span className="block text-xs text-text-mid">
              URL actual, navegador, tamaño de pantalla y hora local. Ayuda a reproducir el problema
              más rápido. Ningún dato personal de tu negocio se incluye.
            </span>
          </span>
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={copiar}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-4 text-sm font-semibold text-text-mid hover:border-indigo-400/40 hover:text-text-hi"
          >
            <Copy size={14} /> Copiar
          </button>
          <button
            type="button"
            onClick={enviar}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-5 text-sm font-bold text-bg shadow-glow"
          >
            <Send size={14} /> Enviar por email
          </button>
        </div>

        <p className="text-[11px] text-text-lo">
          Si el botón no abre tu cliente de correo, usa "Copiar" y pégalo manualmente en un mail a{" "}
          {DESTINATARIO}.
        </p>
      </div>
    </div>
  );
}
