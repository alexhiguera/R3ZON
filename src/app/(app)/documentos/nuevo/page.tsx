"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  Download,
  Send,
  Save,
  Loader2,
  Wallet,
  FileText,
  Receipt,
  FileSpreadsheet,
  ClipboardList,
  FileSignature,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useNegocioId } from "@/lib/useNegocioId";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlantillaDocumento } from "@/components/documentos/PlantillaDocumento";
import {
  DESCRIPCION_TIPO,
  ETIQUETA_TIPO,
  TIPOS_DOCUMENTO,
  REQUIERE_CLIENTE_FISCAL,
  calcularTotales,
  eur,
  lineaVacia,
  validarParaGenerar,
  type ClienteSnapshot,
  type EmisorSnapshot,
  type LineaDocumento,
  type TipoDocumento,
} from "@/lib/documentos";

type ClienteFila = {
  id: string;
  nombre: string;
  cif: string | null;
  direccion: string | null;
  email: string | null;
};

type DocumentoGenerado = {
  id: string;
  referencia: string;
  numero: number;
  pdf_url: string | null;
};

const ICONO_TIPO: Record<TipoDocumento, typeof FileText> = {
  factura:     FileText,
  ticket:      Receipt,
  presupuesto: FileSpreadsheet,
  albaran:     ClipboardList,
  proforma:    FileSignature,
};

export default function NuevoDocumentoPage() {
  const supabase = createClient();
  const router = useRouter();
  const negocioId = useNegocioId();
  const toast = useToast();
  const previewRef = useRef<HTMLDivElement>(null);

  const [tipo, setTipo] = useState<TipoDocumento | null>(null);

  // Datos del emisor (perfiles_negocio) — se cargan al inicio
  const [emisor, setEmisor] = useState<EmisorSnapshot>({
    nombre: "", cif: null, direccion: null, email: null, telefono: null,
  });

  // Cliente
  const [clientes, setClientes] = useState<ClienteFila[]>([]);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [cliente, setCliente] = useState<ClienteSnapshot>({
    nombre: "", cif: null, direccion: null, email: null,
  });

  // Cabecera
  const [serie, setSerie] = useState("A");
  const [fechaEmision, setFechaEmision] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [fechaVencimiento, setFechaVencimiento] = useState("");

  // Líneas y configuración fiscal
  const [lineas, setLineas] = useState<LineaDocumento[]>([lineaVacia()]);
  const [irpfPct, setIrpfPct] = useState<number>(0);

  // Pago / notas
  const [metodoPago, setMetodoPago] = useState("transferencia");
  const [condicionesPago, setCondicionesPago] = useState("");
  const [notas, setNotas] = useState("");

  // Estado de generación
  const [generando, setGenerando] = useState(false);
  const [generado, setGenerado] = useState<DocumentoGenerado | null>(null);
  const [enviadoFinanzas, setEnviadoFinanzas] = useState(false);

  // Carga inicial: emisor + clientes
  useEffect(() => {
    (async () => {
      const [{ data: perfil }, { data: cls }] = await Promise.all([
        supabase
          .from("perfiles_negocio")
          .select("nombre_negocio,cif_nif,direccion,email_contacto,telefono")
          .single(),
        supabase
          .from("clientes")
          .select("id,nombre,cif,direccion,email")
          .order("nombre"),
      ]);

      if (perfil) {
        setEmisor({
          nombre:    perfil.nombre_negocio ?? "",
          cif:       perfil.cif_nif ?? null,
          direccion: perfil.direccion ?? null,
          email:     perfil.email_contacto ?? null,
          telefono:  perfil.telefono ?? null,
        });
      }
      setClientes((cls ?? []) as ClienteFila[]);
    })();
  }, [supabase]);

  const totales = useMemo(() => calcularTotales(lineas, irpfPct), [lineas, irpfPct]);
  const errores = validarParaGenerar({
    tipo: tipo ?? "ticket",
    emisor_snapshot: emisor,
    cliente_snapshot: cliente,
    lineas,
  });

  // ── Handlers líneas ────────────────────────────────────────────────────
  const actualizarLinea = (i: number, patch: Partial<LineaDocumento>) =>
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const eliminarLinea = (i: number) =>
    setLineas((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  // ── Selección de cliente ───────────────────────────────────────────────
  const seleccionarCliente = (id: string) => {
    setClienteId(id);
    const c = clientes.find((x) => x.id === id);
    if (c) {
      setCliente({
        nombre:    c.nombre,
        cif:       c.cif,
        direccion: c.direccion,
        email:     c.email,
      });
    } else {
      setCliente({ nombre: "", cif: null, direccion: null, email: null });
    }
  };

  // ── Generación ─────────────────────────────────────────────────────────
  async function generar() {
    if (!tipo || !negocioId) return;
    if (errores.length > 0) {
      toast.err(errores[0]);
      return;
    }
    setGenerando(true);

    const anio = new Date(fechaEmision).getFullYear();

    // 1. Reservar número correlativo (atómico vía advisory lock)
    const { data: numero, error: errNum } = await supabase.rpc(
      "siguiente_numero_documento",
      { p_tipo: tipo, p_serie: serie, p_anio: anio },
    );

    if (errNum || typeof numero !== "number") {
      setGenerando(false);
      toast.err(`No se pudo reservar el número: ${errNum?.message ?? "desconocido"}`);
      return;
    }

    // 2. Insertar el documento ya con estado "generado" (inmutable a partir de ahí)
    const { data, error } = await supabase
      .from("documentos")
      .insert({
        negocio_id: negocioId,
        cliente_id: clienteId,
        tipo,
        serie,
        numero,
        anio,
        fecha_emision: fechaEmision,
        fecha_vencimiento: fechaVencimiento || null,
        emisor_snapshot: emisor,
        cliente_snapshot: cliente,
        lineas,
        subtotal:        totales.subtotal,
        descuento_total: totales.descuento_total,
        base_imponible:  totales.base_imponible,
        iva_total:       totales.iva_total,
        irpf_pct:        irpfPct,
        irpf_total:      totales.irpf_total,
        total:           totales.total,
        estado:          "generado",
        notas:           notas || null,
        condiciones_pago: condicionesPago || null,
        metodo_pago:     metodoPago || null,
      })
      .select("id,referencia,numero,pdf_url")
      .single();

    setGenerando(false);

    if (error || !data) {
      toast.err(`Error al guardar: ${error?.message ?? "desconocido"}`);
      return;
    }

    setGenerado(data as DocumentoGenerado);
    toast.ok(`${ETIQUETA_TIPO[tipo]} ${data.referencia} generada.`);
  }

  // ── Acciones post-generación ───────────────────────────────────────────
  function descargarPDF() {
    if (!previewRef.current) return;
    const html = previewRef.current.innerHTML;
    const titulo = generado?.referencia ?? "documento";
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) {
      toast.err("El navegador bloqueó la ventana de impresión.");
      return;
    }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${titulo}</title>
      <style>
        body{margin:0;background:#f1f5f9;padding:24px;font-family:system-ui,sans-serif}
        @page{size:A4;margin:18mm}
        @media print{body{background:#fff;padding:0}}
      </style></head><body>${html}<script>window.onload=()=>{window.print();}</script></body></html>`);
    w.document.close();
  }

  function enviarPorEmail() {
    if (!generado) return;
    const destinatario = cliente.email ?? "";
    const asunto = encodeURIComponent(
      `${ETIQUETA_TIPO[tipo!]} ${generado.referencia} — ${emisor.nombre}`,
    );
    const cuerpo = encodeURIComponent(
      `Hola${cliente.nombre ? ` ${cliente.nombre}` : ""},\n\n` +
        `Adjunto te envío la ${ETIQUETA_TIPO[tipo!].toLowerCase()} ${generado.referencia} ` +
        `por importe de ${eur(totales.total)}.\n\n` +
        `Un saludo,\n${emisor.nombre}`,
    );
    window.location.href = `mailto:${destinatario}?subject=${asunto}&body=${cuerpo}`;
    toast.info("Recuerda adjuntar el PDF descargado al correo.");
  }

  async function añadirAFinanzas() {
    if (!generado || !negocioId || enviadoFinanzas) return;

    // Una factura emitida es un ingreso. Promediamos el IVA por simplicidad
    // (el documento puede tener varios tipos; aquí guardamos la base global).
    const ivaPctMedio =
      totales.base_imponible > 0
        ? (totales.iva_total / totales.base_imponible) * 100
        : 21;

    const { data, error } = await supabase
      .from("finanzas")
      .insert({
        negocio_id: negocioId,
        cliente_id: clienteId,
        tipo: "ingreso",
        concepto: `${ETIQUETA_TIPO[tipo!]} ${generado.referencia}`,
        fecha: fechaEmision,
        base_imponible: totales.base_imponible,
        iva_porcentaje: Math.round(ivaPctMedio * 100) / 100,
        irpf_porcentaje: irpfPct,
        numero_factura: generado.referencia,
        metodo_pago: metodoPago,
        estado_pago: "pendiente",
      })
      .select("id")
      .single();

    if (error || !data) {
      toast.err(`No se pudo añadir a finanzas: ${error?.message ?? "desconocido"}`);
      return;
    }

    await supabase
      .from("documentos")
      .update({ finanza_id: data.id })
      .eq("id", generado.id);

    setEnviadoFinanzas(true);
    toast.ok("Movimiento añadido a Finanzas como ingreso pendiente.");
  }

  // ──────────────────────────────────────────────────────────────────────
  if (!tipo) {
    return (
      <div className="flex flex-col gap-5">
        <Link
          href="/documentos"
          className="inline-flex items-center gap-1.5 text-sm text-text-mid hover:text-text-hi"
        >
          <ArrowLeft size={14} /> Volver
        </Link>
        <PageHeader
          eyebrow="Nuevo documento"
          title="¿Qué quieres crear?"
          description="Elige el tipo de documento. Cada tipo tiene su propia numeración correlativa."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TIPOS_DOCUMENTO.map((t) => {
            const Icono = ICONO_TIPO[t];
            return (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className="card-glass group flex flex-col items-start gap-3 p-5 text-left transition-all hover:-translate-y-1 hover:border-cyan/40"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan/30 bg-cyan/10 text-cyan group-hover:shadow-glow">
                  <Icono size={20} />
                </span>
                <div>
                  <div className="font-display text-lg font-bold text-text-hi">
                    {ETIQUETA_TIPO[t]}
                  </div>
                  <p className="mt-1 text-xs text-text-mid">{DESCRIPCION_TIPO[t]}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // Editor con form a la izquierda y previsualización a la derecha
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => (generado ? router.push("/documentos") : setTipo(null))}
          className="inline-flex items-center gap-1.5 text-sm text-text-mid hover:text-text-hi"
        >
          <ArrowLeft size={14} /> {generado ? "Ir al listado" : "Cambiar tipo"}
        </button>
        {generado && (
          <span className="rounded-lg border border-ok/40 bg-ok/10 px-3 py-1 text-xs font-bold text-ok">
            Generado · {generado.referencia}
          </span>
        )}
      </div>

      <PageHeader
        eyebrow={ETIQUETA_TIPO[tipo]}
        title={generado ? `${ETIQUETA_TIPO[tipo]} ${generado.referencia}` : `Nueva ${ETIQUETA_TIPO[tipo].toLowerCase()}`}
        description={DESCRIPCION_TIPO[tipo]}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr),minmax(0,1.1fr)]">
        {/* ─── FORMULARIO ─────────────────────────────────────────── */}
        <fieldset
          disabled={generado !== null}
          className="flex flex-col gap-4 disabled:opacity-60"
        >
          <Card title="Cabecera">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Serie">
                <input
                  type="text"
                  value={serie}
                  onChange={(e) => setSerie(e.target.value.toUpperCase().slice(0, 4))}
                  className={inputCls}
                />
              </Field>
              <Field label="Fecha de emisión">
                <input
                  type="date"
                  value={fechaEmision}
                  onChange={(e) => setFechaEmision(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label={tipo === "presupuesto" ? "Válido hasta" : "Vencimiento"}>
                <input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="IRPF %">
                <input
                  type="number"
                  value={irpfPct}
                  step="0.01"
                  min={0}
                  onChange={(e) => setIrpfPct(parseFloat(e.target.value) || 0)}
                  className={inputCls}
                />
              </Field>
            </div>
          </Card>

          <Card
            title={
              REQUIERE_CLIENTE_FISCAL.includes(tipo)
                ? "Cliente (obligatorio con CIF)"
                : "Cliente (opcional)"
            }
          >
            <Field label="Selecciona un cliente existente">
              <select
                value={clienteId ?? ""}
                onChange={(e) => seleccionarCliente(e.target.value)}
                className={inputCls}
              >
                <option value="">— Manual / sin cliente —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Nombre">
                <input
                  type="text"
                  value={cliente.nombre}
                  onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="CIF/NIF">
                <input
                  type="text"
                  value={cliente.cif ?? ""}
                  onChange={(e) => setCliente({ ...cliente, cif: e.target.value || null })}
                  className={inputCls}
                />
              </Field>
              <Field label="Dirección" full>
                <input
                  type="text"
                  value={cliente.direccion ?? ""}
                  onChange={(e) =>
                    setCliente({ ...cliente, direccion: e.target.value || null })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Email" full>
                <input
                  type="email"
                  value={cliente.email ?? ""}
                  onChange={(e) =>
                    setCliente({ ...cliente, email: e.target.value || null })
                  }
                  className={inputCls}
                />
              </Field>
            </div>
          </Card>

          <Card title="Líneas">
            <div className="flex flex-col gap-3">
              {lineas.map((l, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-indigo-400/15 bg-indigo-900/20 p-3"
                >
                  <div className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      placeholder="Descripción"
                      value={l.descripcion}
                      onChange={(e) =>
                        actualizarLinea(i, { descripcion: e.target.value })
                      }
                      className={`${inputCls} col-span-12`}
                    />
                    <NumInput
                      label="Cant."
                      value={l.cantidad}
                      onChange={(v) => actualizarLinea(i, { cantidad: v })}
                      cls="col-span-3"
                    />
                    <NumInput
                      label="Precio"
                      value={l.precio_unit}
                      onChange={(v) => actualizarLinea(i, { precio_unit: v })}
                      cls="col-span-3"
                      step="0.01"
                    />
                    <NumInput
                      label="Dto%"
                      value={l.descuento_pct}
                      onChange={(v) => actualizarLinea(i, { descuento_pct: v })}
                      cls="col-span-2"
                    />
                    <NumInput
                      label="IVA%"
                      value={l.iva_pct}
                      onChange={(v) => actualizarLinea(i, { iva_pct: v })}
                      cls="col-span-2"
                    />
                    <button
                      type="button"
                      onClick={() => eliminarLinea(i)}
                      className="col-span-2 mt-5 inline-flex items-center justify-center rounded-lg border border-danger/30 bg-danger/5 text-danger hover:bg-danger/15 disabled:opacity-30"
                      disabled={lineas.length === 1}
                      aria-label="Eliminar línea"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLineas((prev) => [...prev, lineaVacia()])}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-cyan/40 bg-cyan/5 py-3 text-sm font-semibold text-cyan hover:bg-cyan/10"
              >
                <Plus size={14} /> Añadir línea
              </button>
            </div>
          </Card>

          <Card title="Pago y notas">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Método de pago">
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className={inputCls}
                >
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="bizum">Bizum</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="domiciliacion">Domiciliación</option>
                  <option value="otros">Otros</option>
                </select>
              </Field>
              <Field label="Condiciones de pago">
                <input
                  type="text"
                  value={condicionesPago}
                  onChange={(e) => setCondicionesPago(e.target.value)}
                  placeholder="Ej: 30 días"
                  className={inputCls}
                />
              </Field>
              <Field label="Notas internas" full>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  className={`${inputCls} h-auto resize-none py-2`}
                />
              </Field>
            </div>
          </Card>

          {!generado && (
            <>
              {errores.length > 0 && (
                <div className="rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-warn">
                  <div className="mb-1 flex items-center gap-1.5 font-bold">
                    <AlertCircle size={13} /> Faltan datos para generar
                  </div>
                  <ul className="list-disc pl-4">
                    {errores.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
              <button
                type="button"
                onClick={generar}
                disabled={generando || errores.length > 0 || !negocioId}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-base font-bold text-white shadow-glow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:from-text-lo disabled:to-text-lo disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {generando ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                Generar {ETIQUETA_TIPO[tipo].toLowerCase()}
              </button>
              <p className="text-center text-[0.7rem] text-text-lo">
                Una vez generada, el documento queda guardado de forma inmutable
                con su número correlativo.
              </p>
            </>
          )}
        </fieldset>

        {/* ─── PREVISUALIZACIÓN ──────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="section-label">Previsualización</div>
          <div className="overflow-hidden rounded-2xl border border-indigo-400/20 bg-white shadow-2xl">
            <div ref={previewRef}>
              <PlantillaDocumento
                tipo={tipo}
                serie={serie}
                numero={generado?.numero ?? null}
                anio={new Date(fechaEmision).getFullYear()}
                fecha_emision={fechaEmision}
                fecha_vencimiento={fechaVencimiento || null}
                emisor={emisor}
                cliente={cliente}
                lineas={lineas}
                irpf_pct={irpfPct}
                notas={notas || null}
                condiciones_pago={condicionesPago || null}
                metodo_pago={metodoPago || null}
              />
            </div>
          </div>

          {generado && (
            <div className="card-glass p-4">
              <div className="section-label mb-3">¿Qué quieres hacer ahora?</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <AccionBtn onClick={descargarPDF} Icono={Download} label="Descargar PDF" tono="cyan" />
                <AccionBtn
                  onClick={enviarPorEmail}
                  Icono={Send}
                  label="Enviar por email"
                  tono="fuchsia"
                />
                <AccionBtn
                  onClick={() => router.push("/documentos")}
                  Icono={Save}
                  label="Guardado en la app"
                  tono="ok"
                  yaHecho
                />
                <AccionBtn
                  onClick={añadirAFinanzas}
                  Icono={Wallet}
                  label={enviadoFinanzas ? "Añadido a Finanzas" : "Añadir a Finanzas"}
                  tono="warn"
                  yaHecho={enviadoFinanzas}
                />
              </div>
              <p className="mt-3 text-[0.7rem] text-text-lo">
                Añadir a Finanzas crea un ingreso pendiente vinculado a este documento.
                Hazlo solo si el cliente quiere registrar el pago en tu contabilidad.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

const inputCls =
  "h-10 w-full rounded-lg border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-glass p-4">
      <div className="section-label mb-3">{title}</div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "col-span-2" : ""}`}>
      <span className="text-[0.65rem] font-medium uppercase tracking-wider text-text-lo">
        {label}
      </span>
      {children}
    </label>
  );
}

function NumInput({
  label,
  value,
  onChange,
  cls,
  step = "1",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  cls?: string;
  step?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${cls ?? ""}`}>
      <span className="text-[0.6rem] font-medium uppercase tracking-wider text-text-lo">
        {label}
      </span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={inputCls}
      />
    </label>
  );
}

function AccionBtn({
  onClick,
  Icono,
  label,
  tono,
  yaHecho,
}: {
  onClick: () => void;
  Icono: typeof Download;
  label: string;
  tono: "cyan" | "fuchsia" | "ok" | "warn";
  yaHecho?: boolean;
}) {
  const map = {
    cyan:    "border-cyan/40 bg-cyan/10 text-cyan hover:bg-cyan/20",
    fuchsia: "border-fuchsia/40 bg-fuchsia/10 text-fuchsia hover:bg-fuchsia/20",
    ok:      "border-ok/40 bg-ok/10 text-ok hover:bg-ok/20",
    warn:    "border-warn/40 bg-warn/10 text-warn hover:bg-warn/20",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={yaHecho && tono !== "ok"}
      className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition-colors ${map[tono]} ${yaHecho ? "opacity-70" : ""}`}
    >
      <Icono size={15} /> {label}
    </button>
  );
}
