"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  Trash2,
  Workflow,
  Send,
} from "lucide-react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase-errors";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { HelpButton, HelpDrawer } from "./HelpDrawer";
import { N8N_API_KEY_GUIDE, N8N_WEBHOOK_GUIDE } from "./integracionesGuides";

const SERVICIO = "n8n";
const ALIAS_URL  = "webhook_url";
const ALIAS_KEY  = "api_key";

const webhookSchema = z
  .string()
  .trim()
  .url("Debe ser una URL válida (https://…)")
  .refine((u) => /^https:\/\//i.test(u), "Por seguridad, usa https://");

const apiKeySchema = z
  .string()
  .trim()
  .min(8, "La API Key parece demasiado corta")
  .max(512, "La API Key es excesivamente larga");

type Saved = { url: boolean; key: boolean };
type Toast = { kind: "ok" | "err"; msg: string } | null;
type WhichGuide = "url" | "key" | null;

export function N8nCard() {
  const supabase = createClient();
  const [saved, setSaved]       = useState<Saved>({ url: false, key: false });
  const [loading, setLoading]   = useState(true);
  const [savingUrl, setSavingUrl] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [testing, setTesting]   = useState(false);
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [errUrl, setErrUrl] = useState<string | null>(null);
  const [errKey, setErrKey] = useState<string | null>(null);
  const { confirm: confirmDialog, dialog: confirmDialogNode } = useConfirmDialog();
  const [toast, setToast] = useState<Toast>(null);
  const [helpOpen, setHelpOpen] = useState<WhichGuide>(null);

  const flash = (t: Toast) => {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("config_keys")
        .select("alias")
        .eq("servicio", SERVICIO);
      if (!alive) return;
      if (!error && data) {
        const aliases = new Set(data.map((r: { alias: string | null }) => r.alias));
        setSaved({ url: aliases.has(ALIAS_URL), key: aliases.has(ALIAS_KEY) });
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [supabase]);

  const guardarUrl = async () => {
    const parsed = webhookSchema.safeParse(url);
    if (!parsed.success) {
      setErrUrl(parsed.error.issues[0]?.message ?? "URL inválida");
      return;
    }
    setErrUrl(null);
    setSavingUrl(true);
    const { error } = await supabase.rpc("set_config_key", {
      p_servicio: SERVICIO,
      p_alias:    ALIAS_URL,
      p_valor:    parsed.data,
      p_metadata: { saved_at: new Date().toISOString() },
    });
    setSavingUrl(false);
    if (error) { flash({ kind: "err", msg: `No se pudo guardar: ${formatSupabaseError(error)}` }); return; }
    setSaved((s) => ({ ...s, url: true }));
    setUrl("");
    flash({ kind: "ok", msg: "URL del webhook guardada cifrada." });
  };

  const guardarKey = async () => {
    const parsed = apiKeySchema.safeParse(key);
    if (!parsed.success) {
      setErrKey(parsed.error.issues[0]?.message ?? "API Key inválida");
      return;
    }
    setErrKey(null);
    setSavingKey(true);
    const { error } = await supabase.rpc("set_config_key", {
      p_servicio: SERVICIO,
      p_alias:    ALIAS_KEY,
      p_valor:    parsed.data,
      p_metadata: { saved_at: new Date().toISOString() },
    });
    setSavingKey(false);
    if (error) { flash({ kind: "err", msg: `No se pudo guardar: ${formatSupabaseError(error)}` }); return; }
    setSaved((s) => ({ ...s, key: true }));
    setKey("");
    flash({ kind: "ok", msg: "API Key guardada cifrada." });
  };

  const eliminar = async (alias: string) => {
    const ok = await confirmDialog({
      title: "Eliminar valor guardado",
      message: "Se borrará el valor cifrado guardado en la base de datos. Podrás volver a configurarlo en cualquier momento.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    const { error } = await supabase
      .from("config_keys")
      .delete()
      .eq("servicio", SERVICIO)
      .eq("alias", alias);
    if (error) { flash({ kind: "err", msg: formatSupabaseError(error) }); return; }
    setSaved((s) => ({ ...s, [alias === ALIAS_URL ? "url" : "key"]: false }));
    flash({ kind: "ok", msg: "Valor eliminado." });
  };

  const probarWebhook = async () => {
    setTesting(true);
    const { data: webhookUrl, error: e1 } = await supabase.rpc("get_config_key", {
      p_servicio: SERVICIO, p_alias: ALIAS_URL,
    });
    if (e1 || !webhookUrl) {
      setTesting(false);
      flash({ kind: "err", msg: "No hay URL guardada para probar." });
      return;
    }
    const { data: apiKey } = await supabase.rpc("get_config_key", {
      p_servicio: SERVICIO, p_alias: ALIAS_KEY,
    });
    try {
      const res = await fetch(webhookUrl as string, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "X-N8N-API-KEY": apiKey as string } : {}),
        },
        body: JSON.stringify({ source: "r3zon-crm", event: "integration_test", at: new Date().toISOString() }),
      });
      flash(res.ok
        ? { kind: "ok", msg: `Webhook respondió ${res.status}. ¡Conexión OK!` }
        : { kind: "err", msg: `n8n respondió ${res.status}. Revisa que el flujo esté Active.` });
    } catch (err) {
      flash({ kind: "err", msg: `No se pudo contactar n8n: ${(err as Error).message}` });
    } finally {
      setTesting(false);
    }
  };

  const conectado = saved.url; // mínimo: URL guardada

  return (
    <article className="card-glass p-5 sm:p-6">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-900/40 text-cyan">
            <Workflow size={20} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-text-hi">n8n / Automatizaciones</h3>
            <p className="mt-0.5 text-xs text-text-mid">Dispara flujos cuando ocurren eventos en tu CRM.</p>
          </div>
        </div>
        <StatusBadge connected={conectado} loading={loading} />
      </header>

      {toast && (
        <div
          role="status"
          className={`mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
            toast.kind === "ok"
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-400/30 bg-rose-500/10 text-rose-200"
          }`}
        >
          {toast.kind === "ok" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          {toast.msg}
        </div>
      )}

      {/* Webhook URL */}
      <FieldBlock
        label="URL del Webhook"
        helpLabel="Ayuda: cómo obtener mi URL de n8n"
        onHelp={() => setHelpOpen("url")}
        savedFlag={saved.url}
        onDelete={() => eliminar(ALIAS_URL)}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); if (errUrl) setErrUrl(null); }}
            placeholder={saved.url ? "•••••••• (oculto, pega para reemplazar)" : "https://n8n.midominio.com/webhook/abc123"}
            aria-invalid={!!errUrl}
            className={`h-11 flex-1 rounded-xl border bg-indigo-900/30 px-3 text-sm text-text-hi focus:outline-none focus:ring-2 ${
              errUrl
                ? "border-rose-400/50 focus:border-rose-400 focus:ring-rose-400/20"
                : "border-indigo-400/20 focus:border-cyan/50 focus:ring-cyan/20"
            }`}
          />
          <button
            type="button"
            onClick={guardarUrl}
            disabled={savingUrl || !url}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-3 py-2 text-xs font-bold text-bg disabled:opacity-50 sm:w-auto"
          >
            {savingUrl ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
            Guardar
          </button>
        </div>
        {errUrl && (
          <span className="mt-1.5 flex items-center gap-1 text-[11px] text-rose-300">
            <AlertCircle size={11} /> {errUrl}
          </span>
        )}
      </FieldBlock>

      {/* API Key */}
      <FieldBlock
        label="API Key"
        helpLabel="Ayuda: cómo generar una API Key de n8n"
        onHelp={() => setHelpOpen("key")}
        savedFlag={saved.key}
        onDelete={() => eliminar(ALIAS_KEY)}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            value={key}
            onChange={(e) => { setKey(e.target.value); if (errKey) setErrKey(null); }}
            placeholder={saved.key ? "•••••••• (oculta, pega para reemplazar)" : "n8n_api_..."}
            aria-invalid={!!errKey}
            autoComplete="off"
            className={`h-11 flex-1 rounded-xl border bg-indigo-900/30 px-3 text-sm text-text-hi focus:outline-none focus:ring-2 ${
              errKey
                ? "border-rose-400/50 focus:border-rose-400 focus:ring-rose-400/20"
                : "border-indigo-400/20 focus:border-cyan/50 focus:ring-cyan/20"
            }`}
          />
          <button
            type="button"
            onClick={guardarKey}
            disabled={savingKey || !key}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-3 py-2 text-xs font-bold text-bg disabled:opacity-50 sm:w-auto"
          >
            {savingKey ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
            Guardar
          </button>
        </div>
        {errKey && (
          <span className="mt-1.5 flex items-center gap-1 text-[11px] text-rose-300">
            <AlertCircle size={11} /> {errKey}
          </span>
        )}
      </FieldBlock>

      {saved.url && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={probarWebhook}
            disabled={testing}
            className="flex items-center gap-1.5 rounded-xl border border-cyan/40 bg-cyan/10 px-3 py-2 text-xs font-semibold text-cyan hover:bg-cyan/15 disabled:opacity-50"
          >
            {testing ? <Loader2 className="animate-spin" size={12} /> : <Send size={12} />}
            Enviar prueba
          </button>
        </div>
      )}

      <HelpDrawer
        open={helpOpen === "url"}
        onClose={() => setHelpOpen(null)}
        {...N8N_WEBHOOK_GUIDE}
      />
      <HelpDrawer
        open={helpOpen === "key"}
        onClose={() => setHelpOpen(null)}
        {...N8N_API_KEY_GUIDE}
      />
      {confirmDialogNode}
    </article>
  );
}

function FieldBlock({
  label,
  helpLabel,
  onHelp,
  savedFlag,
  onDelete,
  children,
}: {
  label: string;
  helpLabel: string;
  onHelp: () => void;
  savedFlag: boolean;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-mid">{label}</span>
          <HelpButton label={helpLabel} onClick={onHelp} />
          {savedFlag && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
              <CheckCircle2 size={10} /> Guardado cifrado
            </span>
          )}
        </div>
        {savedFlag && (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1 text-[11px] text-rose-300 hover:text-rose-200"
          >
            <Trash2 size={11} /> Eliminar
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ connected, loading }: { connected: boolean; loading: boolean }) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/25 bg-indigo-900/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-mid">
        <Loader2 size={10} className="animate-spin" /> Cargando
      </span>
    );
  }
  return connected ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Conectado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/25 bg-indigo-900/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-mid">
      <span className="h-1.5 w-1.5 rounded-full bg-text-lo" /> Desconectado
    </span>
  );
}
