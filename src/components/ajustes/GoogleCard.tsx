"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Plug, Unplug } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { HelpButton, HelpDrawer } from "./HelpDrawer";
import { GOOGLE_OAUTH_GUIDE } from "./integracionesGuides";

type Conn = { google_account_email: string | null; expires_at: string } | null;

export function GoogleCard() {
  const supabase = createClient();
  const [conn, setConn] = useState<Conn>(null);
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState(false);
  const [helpOpen, setHelpOpen]   = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error: e } = await supabase
        .from("google_connections")
        .select("google_account_email, expires_at")
        .maybeSingle();
      if (!alive) return;
      if (e && e.code !== "PGRST116") setError(e.message);
      setConn((data as Conn) ?? null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [supabase]);

  const conectar = () => {
    setBusy(true);
    // El endpoint construye la URL OAuth y redirige a accounts.google.com.
    window.location.href = "/api/integrations/google/connect";
  };

  const desconectar = async () => {
    if (!confirm("¿Desconectar Google? Tendrás que volver a autorizar para sincronizar la agenda.")) return;
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.from("google_connections").delete().not("id", "is", null);
    setBusy(false);
    if (e) { setError(e.message); return; }
    setConn(null);
  };

  const conectado = !!conn;

  return (
    <article className="card-glass p-5 sm:p-6">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-400/25 bg-white/95">
            {/* Logo Google (multi-color oficial) */}
            <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C41 35 44 30 44 24c0-1.2-.1-2.3-.4-3.5z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-text-hi">Google Workspace</h3>
            <p className="mt-0.5 text-xs text-text-mid">Sincroniza Calendar y sube archivos a Drive.</p>
          </div>
        </div>
        <StatusBadge connected={conectado} loading={loading} />
      </header>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <div className="rounded-xl border border-indigo-400/15 bg-indigo-900/20 p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-medium text-text-mid">Cuenta conectada</span>
          <HelpButton label="Ayuda: cómo conectar Google" onClick={() => setHelpOpen(true)} />
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-text-lo">
            <Loader2 size={13} className="animate-spin" /> Cargando…
          </div>
        ) : conectado ? (
          <div className="flex items-center gap-2 text-sm text-text-hi">
            <CheckCircle2 size={14} className="text-emerald-300" />
            {conn?.google_account_email ?? "(cuenta sin email registrado)"}
          </div>
        ) : (
          <div className="text-sm italic text-text-lo">No hay cuenta conectada todavía.</div>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        {conectado ? (
          <button
            type="button"
            onClick={desconectar}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 hover:border-rose-400/50 disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={13} /> : <Unplug size={13} />}
            Desconectar
          </button>
        ) : (
          <button
            type="button"
            onClick={conectar}
            disabled={busy || loading}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 py-2 text-xs font-bold text-bg disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={13} /> : <Plug size={13} />}
            Conectar Google
          </button>
        )}
      </div>

      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} {...GOOGLE_OAUTH_GUIDE} />
    </article>
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
