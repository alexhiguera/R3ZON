"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  LogOut,
  Smartphone,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase-errors";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type Device = {
  id: string;
  device_name: string | null;
  user_agent: string | null;
  ip: string | null;
  pais: string | null;
  primer_login: string;
  ultimo_login: string;
};

type MfaState = "loading" | "off" | "on";
type Toast = { kind: "ok" | "err"; msg: string } | null;

export function SeguridadTab() {
  const supabase = createClient();
  const [mfa, setMfa]           = useState<MfaState>("loading");
  const [devices, setDevices]   = useState<Device[]>([]);
  const [loadingD, setLoadingD] = useState(true);
  const [logoutAll, setLogoutAll] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const { confirm: confirmDialog, dialog: confirmDialogNode } = useConfirmDialog();

  const flash = (t: Toast) => {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = (data?.totp ?? []).some((f) => f.status === "verified");
      setMfa(verified ? "on" : "off");
    })();
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("dispositivos_conocidos")
        .select("id, device_name, user_agent, ip, pais, primer_login, ultimo_login")
        .order("ultimo_login", { ascending: false });
      if (!error) setDevices((data as Device[]) ?? []);
      setLoadingD(false);
    })();
  }, [supabase]);

  const cerrarTodas = async () => {
    const ok = await confirmDialog({
      title: "Cerrar todas las sesiones",
      message: "Esto cerrará tu sesión en todos los dispositivos, incluido este. Tendrás que volver a iniciar sesión.",
      confirmLabel: "Cerrar todas",
      tone: "danger",
    });
    if (!ok) return;
    setLogoutAll(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    setLogoutAll(false);
    if (error) { flash({ kind: "err", msg: formatSupabaseError(error) }); return; }
    window.location.href = "/login";
  };

  const olvidarDispositivo = async (id: string) => {
    const ok = await confirmDialog({
      title: "Olvidar dispositivo",
      message: "Si vuelve a iniciar sesión en este dispositivo, recibirás un aviso de nuevo dispositivo.",
      confirmLabel: "Olvidar",
      tone: "warning",
    });
    if (!ok) return;
    const { error } = await supabase.from("dispositivos_conocidos").delete().eq("id", id);
    if (error) { flash({ kind: "err", msg: formatSupabaseError(error) }); return; }
    setDevices((d) => d.filter((x) => x.id !== id));
    flash({ kind: "ok", msg: "Dispositivo olvidado." });
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            toast.kind === "ok"
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-400/30 bg-rose-500/10 text-rose-200"
          }`}
        >
          {toast.kind === "ok" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* MFA */}
      <div className="card-glass p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
              mfa === "on"
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                : "border-amber-400/40 bg-amber-500/10 text-amber-200"
            }`}>
              {mfa === "on" ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-text-hi">
                Autenticación en dos pasos (2FA)
              </h3>
              <p className="mt-0.5 text-xs text-text-mid">
                {mfa === "loading" && "Comprobando estado…"}
                {mfa === "off" && "Recomendado. Añade una app TOTP (Google Authenticator, 1Password, Authy…)."}
                {mfa === "on" && "Activado. Te pediremos el código TOTP en cada inicio de sesión sensible."}
              </p>
            </div>
          </div>
          <Link
            href="/2fa/configurar"
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${
              mfa === "on"
                ? "border border-indigo-400/25 bg-indigo-900/40 text-text-hi hover:border-cyan/40"
                : "bg-gradient-to-r from-cyan to-fuchsia text-bg"
            }`}
          >
            {mfa === "on" ? "Gestionar" : "Activar 2FA"} <ExternalLink size={11} />
          </Link>
        </div>
      </div>

      {/* Cerrar todas las sesiones */}
      <div className="card-glass p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/10 text-rose-200">
              <LogOut size={20} />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-text-hi">Cerrar sesión en todos los dispositivos</h3>
              <p className="mt-0.5 max-w-md text-xs text-text-mid">
                Útil si has perdido un dispositivo o sospechas un acceso no autorizado.
                Invalida todos los tokens de sesión en cualquier navegador o app.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={cerrarTodas}
            disabled={logoutAll}
            className="flex items-center gap-1.5 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200 hover:border-rose-400/70 disabled:opacity-50"
          >
            {logoutAll ? <Loader2 className="animate-spin" size={13} /> : <LogOut size={13} />}
            Cerrar todas
          </button>
        </div>
      </div>

      {/* Dispositivos conocidos */}
      <div className="card-glass overflow-hidden">
        <div className="flex items-center justify-between border-b border-indigo-400/20 p-5">
          <div>
            <div className="section-label mb-1">Dispositivos conocidos</div>
            <p className="text-xs text-text-mid">
              Te avisamos por email cuando alguien inicia sesión desde un dispositivo nuevo.
            </p>
          </div>
        </div>

        {loadingD ? (
          <div className="flex items-center gap-2 p-6 text-sm text-text-mid">
            <Loader2 className="animate-spin" size={14} /> Cargando dispositivos…
          </div>
        ) : devices.length === 0 ? (
          <div className="p-6 text-sm italic text-text-lo">
            Aún no hay dispositivos registrados.
          </div>
        ) : (
          <ul className="divide-y divide-indigo-400/10">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex items-center gap-3">
                  <Smartphone size={15} className="text-text-mid" />
                  <div>
                    <div className="text-sm text-text-hi">
                      {d.device_name ?? "Dispositivo desconocido"}
                    </div>
                    <div className="text-[11px] text-text-lo">
                      {d.ip ?? "IP oculta"}
                      {d.pais ? ` · ${d.pais}` : ""}
                      {" · último login "}
                      {new Date(d.ultimo_login).toLocaleString("es-ES")}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => olvidarDispositivo(d.id)}
                  className="inline-flex items-center gap-1 text-[11px] text-rose-300 hover:text-rose-200"
                >
                  <Trash2 size={11} /> Olvidar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {confirmDialogNode}
    </div>
  );
}
