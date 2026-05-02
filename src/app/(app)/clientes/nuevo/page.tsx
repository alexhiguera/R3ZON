"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Building2, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useNegocioId } from "@/lib/useNegocioId";
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
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoId>("prospecto");
  const [etiquetas, setEtiquetas] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showAvanzado, setShowAvanzado] = useState(false);

  // negocio_id explícito: red de seguridad por si el trigger `tg_fill_negocio_id`
  // aún no está aplicado en la BD (sin él, la RLS rechazaría el insert).
  const negocioId = useNegocioId();

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t && !etiquetas.includes(t)) setEtiquetas((p) => [...p, t]);
    setTagInput("");
  };
  const removeTag = (tag: string) =>
    setEtiquetas((p) => p.filter((t) => t !== tag));

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!negocioId) {
      setError("No se encontró el perfil del negocio. Recarga la página.");
      return;
    }

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

    const { data, error } = await supabase
      .from("clientes")
      .insert({
        negocio_id:        negocioId,
        nombre:            get("nombre")!,
        sector:            get("sector"),
        email:             get("email"),
        telefono:          get("telefono"),
        cif:               get("cif"),
        sitio_web:         get("sitio_web"),
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
        description="Sólo el nombre es obligatorio. Puedes guardarlo ya y completar el resto cuando lo tengas."
      />

      <form onSubmit={submit} className="card-glass flex flex-col gap-6 p-5 sm:p-7">
        {/* ─── Datos esenciales ─────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <Field
            name="nombre"
            label="Nombre o razón social *"
            required
            placeholder="Acme Soluciones SL"
            tooltip="Es el único campo obligatorio. Puedes usar el nombre comercial."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="email"
              label="Email"
              type="email"
              placeholder="hola@acme.com"
            />
            <Field
              name="telefono"
              label="Teléfono"
              placeholder="+34 612 345 678"
              tooltip="Con prefijo internacional para que los botones de WhatsApp funcionen."
            />
          </div>

          {/* Estado comercial — visual rápido, no requiere texto */}
          <div>
            <span className="mb-1.5 block text-xs font-medium text-text-mid">
              Estado comercial
            </span>
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
          </div>
        </div>

        {/* ─── Datos adicionales (colapsable) ──────────────────────── */}
        <div className="rounded-2xl border border-indigo-400/15 bg-indigo-900/15">
          <button
            type="button"
            onClick={() => setShowAvanzado((v) => !v)}
            aria-expanded={showAvanzado}
            className="flex w-full items-center justify-between gap-2 p-4 text-left"
          >
            <div>
              <div className="font-display text-sm font-bold text-text-hi">
                Datos adicionales
              </div>
              <p className="mt-0.5 text-xs text-text-mid">
                CIF, dirección fiscal, sector, datos B2B y notas. Todo opcional.
              </p>
            </div>
            {showAvanzado
              ? <ChevronUp size={18} className="shrink-0 text-text-mid" />
              : <ChevronDown size={18} className="shrink-0 text-text-mid" />}
          </button>

          {showAvanzado && (
            <div className="flex flex-col gap-5 border-t border-indigo-400/15 p-4 sm:p-5">
              {/* Identidad fiscal */}
              <Section title="Identidad fiscal">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="cif"       label="CIF / NIF"   placeholder="B12345678" />
                  <Field name="sector"    label="Sector"      placeholder="Tecnología" />
                  <Field name="sitio_web" label="Sitio web"   type="url" placeholder="acme.com" />
                </div>
              </Section>

              {/* Dirección */}
              <Section title="Dirección fiscal">
                <Field name="direccion" label="Calle y número" placeholder="Calle Mayor 1" />
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <Field name="ciudad"        label="Ciudad" />
                  <Field name="codigo_postal" label="Código postal" />
                  <Field name="pais"          label="País" placeholder="España" />
                </div>
              </Section>

              {/* B2B */}
              <Section title="Datos B2B" help="Útil para segmentar y reportes.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="num_empleados"     label="Nº de empleados"     type="number" />
                  <Field name="facturacion_anual" label="Facturación anual €" type="number" />
                </div>
              </Section>

              {/* Etiquetas */}
              <Section title="Etiquetas" help="Para agrupar y filtrar clientes.">
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
              <Section title="Notas internas" help="Sólo tú las verás.">
                <textarea
                  name="notas"
                  rows={3}
                  placeholder="Ej: Pago a 60 días, decisor es CEO, sensible al precio…"
                  className="w-full resize-none rounded-xl border border-indigo-400/20 bg-indigo-900/30 p-3 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
                />
              </Section>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !negocioId}
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
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  tooltip?: string;
  placeholder?: string;
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
        placeholder={placeholder}
        className="h-11 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
      />
    </label>
  );
}
