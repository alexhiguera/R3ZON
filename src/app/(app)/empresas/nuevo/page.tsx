"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Form = {
  nombre: string;
  cif: string;
  sector: string;
  sitio_web: string;
  email: string;
  telefono: string;
  ciudad: string;
  pais: string;
  estado: "activa" | "prospecto" | "inactiva";
};

const INITIAL: Form = {
  nombre: "", cif: "", sector: "", sitio_web: "", email: "",
  telefono: "", ciudad: "", pais: "España", estado: "prospecto",
};

export default function NuevaEmpresaPage() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setError("El nombre de la empresa es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data: perfil } = await supabase
      .from("perfiles_negocio")
      .select("id")
      .single();

    if (!perfil) {
      setError("No se pudo identificar tu negocio. Vuelve a iniciar sesión.");
      setSaving(false);
      return;
    }

    const { data, error: err } = await supabase
      .from("empresas")
      .insert({ ...form, negocio_id: perfil.id })
      .select("id")
      .single();

    setSaving(false);
    if (err) {
      setError("No se pudo crear la empresa. Inténtalo de nuevo.");
      return;
    }
    router.push(`/empresas/${data!.id}`);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/empresas"
        className="inline-flex items-center gap-1.5 text-sm text-text-mid hover:text-text-hi"
      >
        <ArrowLeft size={14} /> Empresas
      </Link>

      <div className="card-glass overflow-hidden">
        <div className="rainbow-bar" />
        <div className="flex items-center gap-4 p-5 sm:p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-900/40 text-indigo-300">
            <Building2 size={22} />
          </div>
          <div>
            <div className="section-label mb-1">Nuevo cliente B2B</div>
            <h1 className="font-display text-2xl font-bold">Crear empresa</h1>
            <div className="accent-bar mt-1.5" style={{ width: 48 }} />
          </div>
        </div>
      </div>

      <form onSubmit={guardar} className="card-glass flex flex-col gap-4 p-5 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre de la empresa *" value={form.nombre} onChange={(v) => set("nombre", v)} placeholder="Acme S.L." />
          <Field label="CIF / NIF" value={form.cif} onChange={(v) => set("cif", v)} placeholder="B12345678" />
          <Field label="Sector" value={form.sector} onChange={(v) => set("sector", v)} placeholder="Tecnología, Retail…" />
          <Field label="Sitio web" value={form.sitio_web} onChange={(v) => set("sitio_web", v)} placeholder="https://acme.com" />
          <Field label="Email corporativo" value={form.email} onChange={(v) => set("email", v)} type="email" placeholder="hola@acme.com" />
          <Field label="Teléfono" value={form.telefono} onChange={(v) => set("telefono", v)} placeholder="+34 600 000 000" />
          <Field label="Ciudad" value={form.ciudad} onChange={(v) => set("ciudad", v)} placeholder="Madrid" />
          <Field label="País" value={form.pais} onChange={(v) => set("pais", v)} />

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-text-mid">Estado</span>
            <div className="flex gap-2">
              {(["prospecto", "activa", "inactiva"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("estado", s)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-semibold capitalize transition-colors ${
                    form.estado === s
                      ? "border-cyan/50 bg-cyan/10 text-cyan"
                      : "border-indigo-400/20 bg-indigo-900/30 text-text-mid hover:border-indigo-400/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </label>
        </div>

        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Link
            href="/empresas"
            className="rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-4 py-2.5 text-sm text-text-mid hover:text-text-hi"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-5 py-2.5 text-sm font-bold text-bg disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            Crear empresa
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-mid">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
      />
    </label>
  );
}
