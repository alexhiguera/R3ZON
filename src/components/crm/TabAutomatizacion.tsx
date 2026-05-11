"use client";

import { useState } from "react";
import {
  Zap, ExternalLink, Loader2, CheckCircle,
  AlertTriangle, ToggleLeft, ToggleRight, Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Help, Tooltip } from "@/components/ui/Tooltip";

type ClienteAutomatizacion = {
  webhook_url?: string | null;
  webhook_activo?: boolean | null;
  [k: string]: unknown;
};

type Props = {
  clienteId: string;
  cliente: ClienteAutomatizacion;
  onUpdate: (c: ClienteAutomatizacion) => void;
};

export function TabAutomatizacion({ clienteId, cliente, onUpdate }: Props) {
  const supabase = createClient();
  const [url, setUrl] = useState(cliente.webhook_url ?? "");
  const [activo, setActivo] = useState(cliente.webhook_activo ?? false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "error" | null>(null);
  const [saved, setSaved] = useState(false);

  const guardar = async () => {
    setSaving(true);
    setSaved(false);
    await supabase
      .from("clientes")
      .update({ webhook_url: url || null, webhook_activo: activo })
      .eq("id", clienteId);
    onUpdate({ ...cliente, webhook_url: url, webhook_activo: activo });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const probar = async () => {
    if (!url) return;
    setTesting(true);
    setTestResult(null);
    try {
      // Dispara el webhook con payload de prueba
      const payload = {
        evento: "test",
        cliente: {
          id: clienteId,
          nombre: cliente.nombre,
          apellidos: cliente.apellidos,
          email: cliente.email,
          telefono: cliente.telefono,
        },
        timestamp: new Date().toISOString(),
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setTestResult(res.ok ? "ok" : "error");
      // Registrar en comunicaciones
      const { data: perfil } = await supabase.from("perfiles_negocio").select("id").single();
      if (perfil) {
        await supabase.from("comunicaciones").insert({
          negocio_id: perfil.id,
          cliente_id: clienteId,
          tipo: "webhook_fire",
          asunto: "Prueba de webhook",
          contenido: `HTTP ${res.status} → ${url}`,
          metadata: { url, status: res.status, evento: "test" },
        });
      }
    } catch {
      setTestResult("error");
    }
    setTesting(false);
  };

  const toggleActivo = () => setActivo((v: boolean) => !v);

  return (
    <div className="flex flex-col gap-4">
      {/* Explicación */}
      <div className="card-glass overflow-hidden">
        <div className="rainbow-bar" />
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-fuchsia/30 bg-fuchsia/10 text-fuchsia">
              <Zap size={18} />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-text-hi">
                Automatización externa
              </h2>
              <p className="mt-1 text-sm text-text-mid">
                Conecta este cliente a una automatización de{" "}
                <a
                  href="https://n8n.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan hover:underline"
                >
                  n8n
                </a>{" "}
                o{" "}
                <a
                  href="https://make.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan hover:underline"
                >
                  Make
                </a>{" "}
                para enviarle mensajes automáticos, crear facturas, etc.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración del webhook */}
      <div className="card-glass p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-1.5">
          <div className="section-label">URL del Webhook</div>
          <Help
            text="Es la dirección que te da n8n o Make cuando creas un nodo 'Webhook'. Empieza por https://"
            side="right"
          />
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://tu-n8n.com/webhook/xxxxxxxx"
            className="h-12 w-full rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-4 font-mono text-sm text-text-hi placeholder:text-text-lo focus:border-fuchsia/50 focus:outline-none focus:ring-2 focus:ring-fuchsia/20"
          />

          {/* Toggle activo */}
          <div className="flex items-center justify-between rounded-xl border border-indigo-400/15 bg-indigo-900/20 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-text-hi">Automatización activa</div>
              <div className="text-xs text-text-lo">
                Cuando está activo, se dispara al crear o actualizar al cliente.
              </div>
            </div>
            <Tooltip
              text={activo ? "Haz clic para desactivar la automatización." : "Haz clic para activar la automatización."}
              side="left"
            >
              <button onClick={toggleActivo} className="text-indigo-300 hover:text-cyan">
                {activo ? (
                  <ToggleRight size={32} className="text-cyan" />
                ) : (
                  <ToggleLeft size={32} />
                )}
              </button>
            </Tooltip>
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <Tooltip
              text="Envía una prueba al webhook con los datos de este cliente para comprobar que funciona."
              side="top"
            >
              <button
                onClick={probar}
                disabled={!url || testing}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-400/25 bg-indigo-900/40 text-sm font-medium text-text-mid hover:border-fuchsia/40 hover:text-fuchsia disabled:opacity-40"
              >
                {testing ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                Probar webhook
              </button>
            </Tooltip>
            <button
              onClick={guardar}
              disabled={saving}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia text-sm font-bold text-bg disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="animate-spin" size={14} />
              ) : saved ? (
                <CheckCircle size={14} />
              ) : (
                <Zap size={14} />
              )}
              {saved ? "¡Guardado!" : "Guardar"}
            </button>
          </div>

          {/* Resultado del test */}
          {testResult === "ok" && (
            <div className="flex items-center gap-2 rounded-xl border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok">
              <CheckCircle size={14} />
              El webhook respondió correctamente.
            </div>
          )}
          {testResult === "error" && (
            <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertTriangle size={14} />
              No se pudo conectar. Revisa la URL o el estado de tu n8n.
            </div>
          )}
        </div>
      </div>

      {/* Guía rápida */}
      <div className="card-glass p-5">
        <div className="section-label mb-3">Cómo configurarlo en n8n</div>
        <ol className="flex flex-col gap-2 text-sm text-text-mid">
          {[
            'En n8n, crea un flujo y añade el nodo "Webhook".',
            'Cópialo como "POST" y copia la URL que aparece.',
            "Pégala aquí arriba y pulsa 'Guardar'.",
            "Haz clic en 'Probar webhook' para verificar que llega el dato.",
            "Añade los nodos que quieras: enviar email, SMS, crear tarea…",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-indigo-400/25 bg-indigo-900/40 font-display text-[0.65rem] font-bold text-indigo-300">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <a
          href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-cyan hover:underline"
        >
          Documentación de n8n <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
