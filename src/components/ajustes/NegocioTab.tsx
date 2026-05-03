"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Save, Upload, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { negocioSchema, type NegocioFormValues } from "./negocioSchema";
import type { PerfilNegocio } from "./types";

const LOGO_BUCKET = "logos";
const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const LOGO_ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

const FIELDS: {
  key: keyof NegocioFormValues;
  label: string;
  type?: string;
  placeholder?: string;
  full?: boolean;
}[] = [
  { key: "nombre_negocio", label: "Nombre del negocio", placeholder: "Acme Soluciones SL", full: true },
  { key: "cif_nif",        label: "CIF / NIF",          placeholder: "B12345678" },
  { key: "telefono",       label: "Teléfono",           type: "tel",   placeholder: "+34 600 000 000" },
  { key: "email_contacto", label: "Email de contacto",  type: "email", placeholder: "hola@acme.com", full: true },
  { key: "direccion",      label: "Dirección fiscal",   placeholder: "Calle Mayor 1, 28013 Madrid", full: true },
];

type Errors = Partial<Record<keyof NegocioFormValues, string>>;
type Toast = { kind: "ok" | "err"; msg: string } | null;

export function NegocioTab({ perfil }: { perfil: PerfilNegocio }) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<NegocioFormValues>({
    nombre_negocio: perfil.nombre_negocio ?? "",
    cif_nif:        perfil.cif_nif ?? "",
    direccion:      perfil.direccion ?? "",
    email_contacto: perfil.email_contacto ?? "",
    telefono:       perfil.telefono ?? "",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(perfil.logo_url);
  const [errors, setErrors]   = useState<Errors>({});
  const [saving, setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const flash = (t: Toast) => {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 3500);
  };

  const onChange = (key: keyof NegocioFormValues, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const guardar = async () => {
    const parsed = negocioSchema.safeParse(form);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof NegocioFormValues;
        if (!next[k]) next[k] = issue.message;
      }
      setErrors(next);
      flash({ kind: "err", msg: "Revisa los campos marcados." });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("perfiles_negocio")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", perfil.id);
    setSaving(false);

    if (error) {
      flash({ kind: "err", msg: `No se pudo guardar: ${error.message}` });
      return;
    }
    flash({ kind: "ok", msg: "Cambios guardados." });
  };

  const subirLogo = async (file: File) => {
    if (!LOGO_ACCEPT.includes(file.type)) {
      flash({ kind: "err", msg: "Formato no soportado (PNG, JPG, WebP o SVG)." });
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      flash({ kind: "err", msg: "El logo supera 2 MB." });
      return;
    }

    setUploading(true);
    const ext  = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${perfil.id}/logo-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });

    if (upErr) {
      setUploading(false);
      flash({ kind: "err", msg: `Subida fallida: ${upErr.message}` });
      return;
    }

    const { data: pub } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
    const newUrl = pub.publicUrl;

    const { error: dbErr } = await supabase
      .from("perfiles_negocio")
      .update({ logo_url: newUrl, updated_at: new Date().toISOString() })
      .eq("id", perfil.id);

    setUploading(false);

    if (dbErr) {
      flash({ kind: "err", msg: `Logo subido pero no enlazado: ${dbErr.message}` });
      return;
    }
    setLogoUrl(newUrl);
    flash({ kind: "ok", msg: "Logo actualizado." });
  };

  const eliminarLogo = async () => {
    setUploading(true);
    const { error } = await supabase
      .from("perfiles_negocio")
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq("id", perfil.id);
    setUploading(false);
    if (error) {
      flash({ kind: "err", msg: `No se pudo eliminar: ${error.message}` });
      return;
    }
    setLogoUrl(null);
    flash({ kind: "ok", msg: "Logo eliminado." });
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

      {/* Logo */}
      <div className="card-glass p-5 sm:p-7">
        <div className="section-label mb-4">Identidad visual</div>
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-indigo-400/25 bg-indigo-900/40">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo del negocio"
                fill
                sizes="96px"
                className="object-contain"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs italic text-text-lo">
                Sin logo
              </div>
            )}
          </div>

          <div className="flex-1">
            <p className="text-sm text-text-mid">
              PNG, JPG, WebP o SVG. Máx. 2 MB. Se mostrará en facturas y comunicaciones.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={LOGO_ACCEPT.join(",")}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) subirLogo(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-label={logoUrl ? "Cambiar el logo del negocio" : "Subir un logo para el negocio"}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-3 py-2 text-xs font-medium text-text-hi hover:border-cyan/40 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="animate-spin" size={13} /> : <Upload size={13} />}
                {logoUrl ? "Cambiar logo" : "Subir logo"}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={eliminarLogo}
                  disabled={uploading}
                  aria-label="Eliminar el logo del negocio"
                  className="flex items-center gap-1.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 hover:border-rose-400/50 disabled:opacity-50"
                >
                  <Trash2 size={13} /> Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Datos del negocio */}
      <div className="card-glass p-5 sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <div className="section-label">Datos fiscales y de contacto</div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map(({ key, label, type, placeholder, full }) => {
            const err = errors[key];
            return (
              <label
                key={key}
                className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}
              >
                <span className="text-xs font-medium text-text-mid">{label}</span>
                <input
                  type={type ?? "text"}
                  value={form[key] ?? ""}
                  placeholder={placeholder}
                  onChange={(e) => onChange(key, e.target.value)}
                  aria-invalid={!!err}
                  className={`h-11 rounded-xl border bg-indigo-900/30 px-3 text-sm text-text-hi focus:outline-none focus:ring-2 ${
                    err
                      ? "border-rose-400/50 focus:border-rose-400 focus:ring-rose-400/20"
                      : "border-indigo-400/20 focus:border-cyan/50 focus:ring-cyan/20"
                  }`}
                />
                {err && (
                  <span className="flex items-center gap-1 text-[11px] text-rose-300">
                    <AlertCircle size={11} /> {err}
                  </span>
                )}
              </label>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={guardar}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 py-2.5 text-sm font-bold text-bg disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
