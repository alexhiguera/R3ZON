"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Building2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { Help } from "@/components/ui/Tooltip";

const ETIQUETAS_SUGERIDAS = ["vip", "nuevo", "empresa", "inactivo"];
const ESTADOS = [
  { id: "prospecto", label: "Prospecto" },
  { id: "activa",    label: "Activa" },
  { id: "inactiva",  label: "Inactiva" },
] as const;

type EstadoId = (typeof ESTADOS)[number]["id"];

export default function NuevoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoId>("prospecto");
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
    const get = (k: string) => {
      const v = (fd.get(k) as string | null)?.trim();
      return v ? v : null;
    };
    const getNum = (k: string) => {
      const v = get(k);
      if (!v) return null;
      const n = Number(v.replace(",", "."));
      return Number.isFinite(n) ? n : null;
    };

    setLoading(true);
    setError(null);
    const supabase = createClient();
    // No enviamos `negocio_id`: el trigger BEFORE INSERT lo rellena con
    // current_negocio_id() y la RLS pasa.
    const { data, error } = await supabase
      .from("clientes")
      .insert({
        nombre:            get("nombre")!,
        cif:               get("cif"),
        sector:            get("sector"),
        sitio_web:         get("sitio_web"),
        email:             get("email"),
        telefono:          get("telefono"),
        direccion:         get("direccion"),
        ciudad:            get("ciudad"),
        codigo_postal:     get("codigo_postal"),
        pais:              get("pais") ?? "España",
        num_empleados:     getNum("num_empleados"),
        facturacion_anual: getNum("facturacion_anual"),
        estado,
        notas:             get("notas"),
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
        description="Sólo la razón social es obligatoria. El resto puedes rellenarlo más tarde."
      />

      <form onSubmit={submit} className="card-glass flex flex-col gap-6 p-5 sm:p-7">
        {/* Identidad jurídica */}
        <Section title="Identidad jurídica">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="nombre" label="Razón social *" required tooltip="Nombre comercial o razón social registrada." />
            <Field name="cif"    label="CIF / NIF"      tooltip="Código fiscal de la empresa (B12345678, A12345678…)." />
            <Field name="sector" label="Sector"         tooltip="A qué se dedica la empresa (tecnología, hostelería, retail…)." />
            <Field name="sitio_web" label="Sitio web"   type="url" tooltip="URL completa o dominio. Ej: acme.com" />
          </div>
        </Section>

        {/* Estado */}
        <Section title="Estado comercial">
          <div className="flex gap-2">
            {ESTADOS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setEstado(s.id)}
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold capitalize ${
                  estado === s.id
                    ? "border-cyan/50 bg-cyan/10 text-cyan"
                    : "border-indigo-400/20 bg-indigo-900/30 text-text-mid hover:border-indigo-400/40"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Contacto */}
        <Section title="Contacto principal">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="email"    label="Email corporativo" type="email" tooltip="Email principal de la empresa." />
            <Field name="telefono" label="Teléfono"          tooltip="Con prefijo internacional (ej: +34 612 345 678) para que WhatsApp funcione." />
          </div>
        </Section>

        {/* Dirección */}
        <Section title="Dirección fiscal">
          <Field name="direccion" label="Calle y número" tooltip="Aparecerá en las facturas que emitas." />
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field name="ciudad"        label="Ciudad" />
            <Field name="codigo_postal" label="Código postal" />
            <Field name="pais"          label="País" tooltip="Por defecto España." />
          </div>
        </Section>

        {/* Datos B2B */}
        <Section title="Datos B2B" help="Opcional. Útil para segmentar clientes y reportes.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="num_empleados"     label="Nº de empleados"     type="number" />
            <Field name="facturacion_anual" label="Facturación anual €" type="number" />
          </div>
        </Section>

        {/* Etiquetas */}
        <Section title="Etiquetas" help="Para agrupar y filtrar. Ej: 'vip', 'empresa', 'mensual'.">
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
        <Section title="Notas internas" help="Sólo tú las verás. Útil para recordar detalles importantes.">
          <textarea
            name="notas"
            rows={3}
            placeholder="Ej: Pago a 60 días, decisor es CEO, sensible al precio…"
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
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Building2 size={16} />}
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
