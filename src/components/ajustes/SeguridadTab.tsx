"use client";

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase-errors";

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
  const [mfa, setMfa] = useState<MfaState>("loading");
  const [devices, setDevices] = useState<Device[]>([]);
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
      message:
        "Esto cerrará tu sesión en todos los dispositivos, incluido este. Tendrás que volver a iniciar sesión.",
      confirmLabel: "Cerrar todas",
      tone: "danger",
    });
    if (!ok) return;
    setLogoutAll(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    setLogoutAll(false);
    if (error) {
      flash({ kind: "err", msg: formatSupabaseError(error) });
      return;
    }
    window.location.href = "/login";
  };

  const olvidarDispositivo = async (id: string) => {
    const ok = await confirmDialog({
      title: "Olvidar dispositivo",
      message:
        "Si vuelve a iniciar sesión en este dispositivo, recibirás un aviso de nuevo dispositivo.",
      confirmLabel: "Olvidar",
      tone: "warning",
    });
    if (!ok) return;
    const { error } = await supabase.from("dispositivos_conocidos").delete().eq("id", id);
    if (error) {
      flash({ kind: "err", msg: formatSupabaseError(error) });
      return;
    }
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

      <CambiarPasswordCard onResult={flash} />

      {/* MFA */}
      <div className="card-glass p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                mfa === "on"
                  ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                  : "border-amber-400/40 bg-amber-500/10 text-amber-200"
              }`}
            >
              {mfa === "on" ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-text-hi">
                Autenticación en dos pasos (2FA)
              </h3>
              <p className="mt-0.5 text-xs text-text-mid">
                {mfa === "loading" && "Comprobando estado…"}
                {mfa === "off" &&
                  "Recomendado. Añade una app TOTP (Google Authenticator, 1Password, Authy…)."}
                {mfa === "on" &&
                  "Activado. Te pediremos el código TOTP en cada inicio de sesión sensible."}
              </p>
            </div>
          </div>
          <Link
            href="/2fa/configurar"
            className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold sm:w-auto ${
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/10 text-rose-200">
              <LogOut size={20} />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-text-hi">
                Cerrar sesión en todos los dispositivos
              </h3>
              <p className="mt-0.5 text-xs text-text-mid sm:max-w-md">
                Útil si has perdido un dispositivo o sospechas un acceso no autorizado. Invalida
                todos los tokens de sesión en cualquier navegador o app.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={cerrarTodas}
            disabled={logoutAll}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200 hover:border-rose-400/70 disabled:opacity-50 sm:w-auto"
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
              <li
                key={d.id}
                className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
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

function CambiarPasswordCard({ onResult }: { onResult: (t: Toast) => void }) {
  const supabase = createClient();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirma, setConfirma] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<{ actual?: string; nueva?: string; confirma?: string }>(
    {},
  );

  const fuerza = (() => {
    if (!nueva) return 0;
    let s = 0;
    if (nueva.length >= 8) s++;
    if (nueva.length >= 12) s++;
    if (/[A-Z]/.test(nueva) && /[a-z]/.test(nueva)) s++;
    if (/\d/.test(nueva)) s++;
    if (/[^A-Za-z0-9]/.test(nueva)) s++;
    return s;
  })();
  const fuerzaLabel = ["—", "Muy débil", "Débil", "Aceptable", "Fuerte", "Muy fuerte"][fuerza];
  const fuerzaColor = [
    "bg-text-lo/30",
    "bg-rose-500",
    "bg-rose-400",
    "bg-amber-400",
    "bg-emerald-400",
    "bg-emerald-500",
  ][fuerza];

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errores = {};
    if (!actual) errs.actual = "Indica tu contraseña actual.";
    if (!nueva) errs.nueva = "Indica una contraseña nueva.";
    else if (nueva.length < 8) errs.nueva = "La nueva contraseña debe tener al menos 8 caracteres.";
    else if (nueva === actual) errs.nueva = "La nueva contraseña debe ser distinta de la actual.";
    if (confirma !== nueva) errs.confirma = "Las contraseñas no coinciden.";
    setErrores(errs);
    if (Object.keys(errs).length) return;

    setGuardando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      setGuardando(false);
      onResult({ kind: "err", msg: "No se ha podido identificar tu cuenta." });
      return;
    }

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: actual,
    });
    if (signErr) {
      setGuardando(false);
      setErrores({ actual: "La contraseña actual no es correcta." });
      return;
    }

    const { error: updErr } = await supabase.auth.updateUser({ password: nueva });
    setGuardando(false);
    if (updErr) {
      onResult({ kind: "err", msg: formatSupabaseError(updErr) });
      return;
    }

    setActual("");
    setNueva("");
    setConfirma("");
    setErrores({});
    onResult({ kind: "ok", msg: "Contraseña actualizada correctamente." });
  }

  return (
    <div className="card-glass p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-900/40 text-indigo-300">
          <KeyRound size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold text-text-hi">Cambiar contraseña</h3>
          <p className="mt-0.5 text-xs text-text-mid">
            Usa al menos 8 caracteres con mayúsculas, minúsculas, números y, si puedes, algún
            símbolo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMostrar((v) => !v)}
          aria-label={mostrar ? "Ocultar contraseñas" : "Mostrar contraseñas"}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/30 text-text-mid hover:text-text-hi"
        >
          {mostrar ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>

      <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-2" autoComplete="off">
        <Field label="Contraseña actual" full error={errores.actual}>
          <Input
            type={mostrar ? "text" : "password"}
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <Field label="Nueva contraseña" error={errores.nueva}>
          <Input
            type={mostrar ? "text" : "password"}
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirmar nueva contraseña" error={errores.confirma}>
          <Input
            type={mostrar ? "text" : "password"}
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
            autoComplete="new-password"
          />
        </Field>

        {nueva && (
          <div className="sm:col-span-2">
            <div className="mb-1 flex items-center justify-between text-[0.7rem] text-text-mid">
              <span>Seguridad</span>
              <span className="font-semibold text-text-hi">{fuerzaLabel}</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i <= fuerza ? fuerzaColor : "bg-indigo-900/40"}`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex sm:col-span-2 sm:justify-end">
          <button
            type="submit"
            disabled={guardando || !actual || !nueva || !confirma}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 py-2.5 text-sm font-bold text-bg disabled:opacity-50 sm:w-auto"
          >
            {guardando ? <Loader2 className="animate-spin" size={14} /> : <KeyRound size={14} />}
            Actualizar contraseña
          </button>
        </div>
      </form>
    </div>
  );
}
