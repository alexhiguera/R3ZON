"use client";

import { AlertCircle, Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DireccionFormValues } from "../schemas";

const LOGO_BUCKET = "logos";
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

type Props = {
  perfilId: string;
  values: Record<keyof DireccionFormValues, string>;
  errors: Partial<Record<keyof DireccionFormValues, string>>;
  onChange: (k: keyof DireccionFormValues, v: string) => void;
  onError: (msg: string) => void;
};

export function Step3DireccionLogo({ perfilId, values, errors, onChange, onError }: Props) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const subir = async (file: File) => {
    if (!LOGO_ACCEPT.includes(file.type)) {
      onError("Formato no soportado (PNG, JPG, WebP o SVG).");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      onError("El logo supera 2 MB.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${perfilId}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (upErr) {
      setUploading(false);
      onError(`Subida fallida: ${upErr.message}`);
      return;
    }
    const { data: pub } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
    onChange("logo_url", pub.publicUrl);
    setUploading(false);
  };

  return (
    <div className="space-y-5">
      {/* Logo */}
      <div>
        <div className="text-xs font-medium text-text-mid mb-2">Logo del negocio</div>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-indigo-400/25 bg-indigo-900/40">
            {values.logo_url ? (
              <Image
                src={values.logo_url}
                alt="Logo"
                fill
                sizes="80px"
                className="object-contain"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] italic text-text-lo">
                Sin logo
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs text-text-mid">
              PNG, JPG, WebP o SVG. Máx. 2 MB. Aparecerá en tus facturas.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={LOGO_ACCEPT.join(",")}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) subir(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-3 py-2 text-xs font-medium text-text-hi hover:border-cyan/40 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="animate-spin" size={13} /> : <Upload size={13} />}
                {values.logo_url ? "Cambiar logo" : "Subir logo"}
              </button>
              {values.logo_url && (
                <button
                  type="button"
                  onClick={() => onChange("logo_url", "")}
                  disabled={uploading}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 hover:border-rose-400/50 disabled:opacity-50"
                >
                  <Trash2 size={13} /> Quitar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Datos */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Text
          label="Dirección fiscal"
          placeholder="Calle Mayor 1, 28013 Madrid"
          full
          value={values.direccion ?? ""}
          error={errors.direccion}
          onChange={(v) => onChange("direccion", v)}
        />
        <Text
          label="Email de contacto"
          type="email"
          placeholder="hola@acme.com"
          full
          value={values.email_contacto ?? ""}
          error={errors.email_contacto}
          onChange={(v) => onChange("email_contacto", v)}
        />
      </div>
    </div>
  );
}

function Text({
  label,
  placeholder,
  value,
  error,
  onChange,
  full,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  full?: boolean;
  type?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium text-text-mid">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={`h-11 rounded-xl border bg-indigo-900/30 px-3 text-sm text-text-hi focus:outline-none focus:ring-2 ${
          error
            ? "border-rose-400/50 focus:border-rose-400 focus:ring-rose-400/20"
            : "border-indigo-400/20 focus:border-cyan/50 focus:ring-cyan/20"
        }`}
      />
      {error && (
        <span className="flex items-center gap-1 text-[11px] text-rose-300">
          <AlertCircle size={11} /> {error}
        </span>
      )}
    </label>
  );
}
