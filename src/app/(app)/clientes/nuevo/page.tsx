"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { Help } from "@/components/ui/Tooltip";

const ETIQUETAS_SUGERIDAS = ["vip", "nuevo", "empresa", "inactivo"];

export default function NuevoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [etiquetas, setEtiquetas] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t && !etiquetas.includes(t)) setEtiquetas((p) => [...p, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    setEtiquetas((p) => p.filter((t) => t !== tag));

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string).trim() || null;

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("clientes")
      .insert({
        nombre: get("nombre")!,
        apellidos: get("apellidos"),
        email: get("email"),
        telefono: get("telefono"),
        nif: get("nif"),
        direccion: get("direccion"),
        notas: get("notas"),
        etiquetas,
      })
      .select("id")
      .single();

    setLoading(false);
    if (error) return setError(error.message);
    router.push(`/clientes/${data.id}`);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-text-mid hover:text-text-hi"
      >
        <ArrowLeft size={14} /> Volver a clientes
      </Link>

      <PageHeader
        eyebrow="Nuevo cliente"
        title="Añadir cliente"
        description="Solo nombre y apellidos son obligatorios. El resto lo puedes rellenar después."
      />

      <form onSubmit={submit} className="card-glass flex flex-col gap-6 p-5 sm:p-7">
        {/* Datos principales */}
        <Section title="Datos personales">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="nombre" label="Nombre *" required tooltip="Nombre de pila del cliente." />
            <Field name="apellidos" label="Apellidos" tooltip="Opcional pero ayuda a encontrarle más fácil." />
            <Field name="email" label="Email" type="email" tooltip="Úsalo para enviarle emails o facturas directamente desde aquí." />
            <Field
              name="telefono"
              label="Teléfono"
              tooltip="Con el prefijo del país (ej: +34 612 345 678) los botones de WhatsApp funcionarán automáticamente."
            />
            <Field name="nif" label="DNI / CIF" tooltip="Necesario si le vas a emitir facturas." />
          </div>
        </Section>

        {/* Dirección */}
        <Section title="Dirección">
          <Field name="direccion" label="Dirección completa" tooltip="Aparecerá en las facturas que le emitas." />
        </Section>

        {/* Etiquetas */}
        <Section
          title="Etiquetas"
          help="Etiquetas para agrupar y filtrar clientes. Ej: 'vip', 'empresa', 'mensual'."
        >
          <div className="flex flex-wrap gap-2">
            {etiquetas.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1.5 rounded-full border border-indigo-400/25 bg-indigo-900/40 px-2.5 py-1 text-xs font-medium text-text-mid"
              >
                {tag}
                <button type="button" onClick={() => removeTag(tag)}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
              placeholder="Escribe y pulsa Enter…"
              className="h-10 flex-1 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => addTag(tagInput)}
              className="rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-3 text-sm text-indigo-300 hover:border-cyan/40"
            >
              Añadir
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ETIQUETAS_SUGERIDAS.filter((t) => !etiquetas.includes(t)).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => addTag(t)}
                className="rounded-full border border-indigo-400/15 px-2 py-0.5 text-[0.65rem] text-text-lo hover:border-indigo-400/40 hover:text-text-mid"
              >
                + {t}
              </button>
            ))}
          </div>
        </Section>

        {/* Notas */}
        <Section title="Notas internas" help="Solo tú las verás. Útil para recordar detalles importantes.">
          <textarea
            name="notas"
            rows={3}
            placeholder="Ej: Le gusta que le llamen por las mañanas…"
            className="w-full resize-none rounded-xl border border-indigo-400/20 bg-indigo-900/30 p-3 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
        </Section>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia text-sm font-bold text-bg disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
          Guardar cliente
        </button>
      </form>
    </div>
  );
}

function Section({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5">
        <span className="section-label">{title}</span>
        {help && <Help text={help} />}
      </div>
      {children}
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  tooltip,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  tooltip?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-text-mid">
        {label}
        {tooltip && <Help text={tooltip} />}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="h-11 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
      />
    </label>
  );
}
