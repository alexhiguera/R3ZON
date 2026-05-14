"use client";

import { useEffect, useState } from "react";
import {
  Mail, MessageCircle, StickyNote, Send,
  Loader2, MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tooltip } from "@/components/ui/Tooltip";

type Com = {
  id: string;
  tipo: string;
  asunto: string | null;
  contenido: string | null;
  created_at: string;
};

const TIPO_META: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  nota:            { icon: StickyNote,     label: "Nota",          color: "text-indigo-300" },
  email_click:     { icon: Mail,           label: "Email enviado", color: "text-cyan" },
  whatsapp_click:  { icon: MessageCircle,  label: "WhatsApp",      color: "text-ok" },
};

export function TabComunicaciones({
  clienteId,
  clienteNombre,
  email,
  telefono,
}: {
  clienteId: string;
  clienteNombre: string;
  email?: string;
  telefono?: string;
}) {
  const supabase = createClient();
  const [coms, setComs] = useState<Com[]>([]);
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = async () => {
    const { data } = await supabase
      .from("comunicaciones")
      .select("id,tipo,asunto,contenido,created_at")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false })
      .limit(30);
    setComs((data ?? []) as Com[]);
  };

  useEffect(() => { cargar(); }, [clienteId]);

  const logAccion = async (tipo: string, asunto?: string, contenido?: string) => {
    const { data: perfil } = await supabase
      .from("perfiles_negocio")
      .select("id")
      .single();
    if (!perfil) return;
    await supabase.from("comunicaciones").insert({
      negocio_id: perfil.id,
      cliente_id: clienteId,
      tipo,
      asunto,
      contenido,
    });
    cargar();
  };

  const abrirWhatsApp = () => {
    if (!telefono) return;
    const num = telefono.replace(/\D/g, "");
    window.open(`https://wa.me/${num}`, "_blank");
    logAccion("whatsapp_click", `WhatsApp a ${clienteNombre}`);
  };

  const abrirEmail = () => {
    if (!email) return;
    window.open(`mailto:${email}`, "_blank");
    logAccion("email_click", `Email a ${clienteNombre}`);
  };

  const guardarNota = async () => {
    if (!nota.trim()) return;
    setEnviando(true);
    await logAccion("nota", "Nota interna", nota.trim());
    setNota("");
    setEnviando(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Botones de contacto */}
      <div className="card-glass p-4">
        <div className="section-label mb-3">Contactar ahora</div>
        <div className="flex flex-wrap gap-2">
          <Tooltip
            text={
              telefono
                ? "Abre WhatsApp con este número. Se registra automáticamente en el historial."
                : "Este cliente no tiene teléfono guardado."
            }
            side="bottom"
          >
            <button
              onClick={abrirWhatsApp}
              disabled={!telefono}
              className="flex h-11 items-center gap-2 rounded-xl border border-ok/30 bg-ok/10 px-4 text-sm font-semibold text-ok transition-all hover:bg-ok/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <MessageCircle size={15} /> WhatsApp
            </button>
          </Tooltip>
          <Tooltip
            text={
              email
                ? "Abre tu aplicación de email con esta dirección. Se registra en el historial."
                : "Este cliente no tiene email guardado."
            }
            side="bottom"
          >
            <button
              onClick={abrirEmail}
              disabled={!email}
              className="flex h-11 items-center gap-2 rounded-xl border border-cyan/30 bg-cyan/10 px-4 text-sm font-semibold text-cyan transition-all hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Mail size={15} /> Email
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Nueva nota */}
      <div className="card-glass p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-1.5">
          <div className="section-label">Añadir nota</div>
          <Tooltip
            text="Las notas quedan guardadas en el historial de este cliente. Solo las ves tú."
            side="right"
          >
            <span className="cursor-help text-[0.65rem] text-text-lo underline underline-offset-2">
              ¿Para qué sirve?
            </span>
          </Tooltip>
        </div>
        <div className="flex gap-2">
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            placeholder="Escribe una nota sobre esta comunicación…"
            className="flex-1 resize-none rounded-xl border border-indigo-400/20 bg-indigo-900/30 p-3 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
          <button
            onClick={guardarNota}
            disabled={enviando || !nota.trim()}
            className="flex h-full items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-3 text-indigo-300 hover:border-cyan/40 hover:text-cyan disabled:opacity-40"
          >
            {enviando ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          </button>
        </div>
      </div>

      {/* Historial */}
      <div className="card-glass p-4 sm:p-5">
        <div className="section-label mb-3">Historial de comunicaciones</div>

        {coms.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <MessageSquare size={24} className="text-indigo-400/30" />
            <div className="text-sm text-text-mid">Sin comunicaciones registradas.</div>
            <p className="text-xs text-text-lo">
              Los clicks en WhatsApp o Email se guardan aquí automáticamente.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {coms.map((c) => {
              const meta = TIPO_META[c.tipo] ?? TIPO_META.nota;
              const Icn = meta.icon;
              return (
                <div
                  key={c.id}
                  className="flex items-start gap-3 rounded-2xl border border-indigo-400/10 bg-indigo-900/20 p-3"
                >
                  <span className={`mt-0.5 shrink-0 ${meta.color}`}>
                    <Icn size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                      <span className="shrink-0 text-[0.65rem] text-text-lo">
                        {new Date(c.created_at).toLocaleString("es-ES", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {c.contenido && (
                      <p className="mt-0.5 text-xs text-text-mid">{c.contenido}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
