"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Send, AlertCircle } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  email:  z.string().trim().toLowerCase().email("Email inválido"),
  nombre: z.string().trim().max(120).optional(),
  rol:    z.enum(["admin", "editor", "lector"]),
});

type Form = z.input<typeof schema>;

const ROLES: { value: Form["rol"]; label: string; desc: string }[] = [
  { value: "admin",  label: "Admin",  desc: "Acceso total. Puede invitar, configurar e integrar." },
  { value: "editor", label: "Editor", desc: "Puede crear y editar clientes, citas, tareas y finanzas." },
  { value: "lector", label: "Lector", desc: "Sólo lectura. No puede modificar datos." },
];

export function InvitarMiembroModal({
  open,
  onClose,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [form, setForm]       = useState<Form>({ email: "", nombre: "", rol: "lector" });
  const [acepta, setAcepta]   = useState(false);
  const [errors, setErrors]   = useState<Partial<Record<keyof Form, string>>>({});
  const [busy, setBusy]       = useState(false);
  const [apiError, setApiErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({ email: "", nombre: "", rol: "lector" });
    setAcepta(false);
    setErrors({});
    setApiErr(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const enviar = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const e: Partial<Record<keyof Form, string>> = {};
      for (const i of parsed.error.issues) e[i.path[0] as keyof Form] = i.message;
      setErrors(e);
      return;
    }
    if (!acepta) {
      setApiErr("Debes confirmar el aviso legal antes de invitar.");
      return;
    }

    setBusy(true);
    setApiErr(null);
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...parsed.data, acepta_politicas: true }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setApiErr(json.error ?? `Error ${res.status}`);
      return;
    }
    onInvited();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-bg/70 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
        className="card-glass relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden"
      >
        <header className="flex items-start justify-between border-b border-indigo-400/20 p-5">
          <div>
            <div className="section-label mb-1">Equipo</div>
            <h2 id="invite-title" className="font-display text-lg font-bold text-text-hi">
              Invitar miembro
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg border border-indigo-400/25 bg-indigo-900/40 p-1.5 text-text-mid hover:text-text-hi"
          >
            <X size={15} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <Field label="Email del miembro" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="trabajador@empresa.com"
              className={inputCls(!!errors.email)}
              autoFocus
            />
          </Field>

          <Field label="Nombre (opcional)" error={errors.nombre}>
            <input
              type="text"
              value={form.nombre ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Marta López"
              className={inputCls(!!errors.nombre)}
            />
          </Field>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-text-mid">Rol</span>
            <div className="space-y-2">
              {ROLES.map((r) => {
                const sel = form.rol === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, rol: r.value }))}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      sel
                        ? "border-cyan/50 bg-cyan/10"
                        : "border-indigo-400/20 bg-indigo-900/30 hover:border-indigo-400/40"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${sel ? "text-cyan" : "text-text-hi"}`}>
                      {r.label}
                    </div>
                    <div className="mt-0.5 text-xs text-text-mid">{r.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cumplimiento legal */}
          <label className="flex items-start gap-2.5 rounded-xl border border-indigo-400/20 bg-indigo-900/20 p-3">
            <input
              type="checkbox"
              checked={acepta}
              onChange={(e) => setAcepta(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-cyan"
            />
            <span className="text-xs text-text-mid">
              Confirmo que el miembro <strong className="text-text-hi">aceptará</strong> nuestra{" "}
              <a href="/legal/privacidad" target="_blank" className="text-cyan hover:underline">
                política de privacidad
              </a>{" "}
              y los{" "}
              <a href="/legal/terminos" target="_blank" className="text-cyan hover:underline">
                términos de uso
              </a>{" "}
              al activar su cuenta. La aceptación quedará registrada con timestamp y versión.
            </span>
          </label>

          {apiError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              <AlertCircle size={13} /> {apiError}
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-indigo-400/20 bg-indigo-900/20 p-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-3 py-2 text-xs text-text-mid hover:text-text-hi"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={busy || !acepta || !form.email}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 py-2 text-xs font-bold text-bg disabled:opacity-50 sm:w-auto"
          >
            {busy ? <Loader2 className="animate-spin" size={13} /> : <Send size={13} />}
            Enviar invitación
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-mid">{label}</span>
      {children}
      {error && (
        <span className="flex items-center gap-1 text-[11px] text-rose-300">
          <AlertCircle size={11} /> {error}
        </span>
      )}
    </label>
  );
}

function inputCls(err: boolean) {
  return `h-11 rounded-xl border bg-indigo-900/30 px-3 text-sm text-text-hi focus:outline-none focus:ring-2 ${
    err
      ? "border-rose-400/50 focus:border-rose-400 focus:ring-rose-400/20"
      : "border-indigo-400/20 focus:border-cyan/50 focus:ring-cyan/20"
  }`;
}
