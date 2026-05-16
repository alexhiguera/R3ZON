"use client";

import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  FileSignature,
  FileSpreadsheet,
  FileText,
  Loader2,
  Maximize2,
  Package,
  Pencil,
  Plus,
  Receipt,
  Save,
  Send,
  Trash2,
  UserPlus,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PlantillaDocumento } from "@/components/documentos/PlantillaDocumento";
import { ActionButton } from "@/components/ui/ActionButton";
import { Field } from "@/components/ui/Field";
import { INPUT_CLS, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import {
  type ClienteSnapshot,
  calcularTotales,
  DESCRIPCION_TIPO,
  type EmisorSnapshot,
  ETIQUETA_TIPO,
  eur,
  FORMATO_TIPO,
  type LineaDocumento,
  lineaVacia,
  REQUIERE_CLIENTE_FISCAL,
  TIPOS_DOCUMENTO,
  type TipoDocumento,
  validarParaGenerar,
} from "@/lib/documentos";
import { formatearFechaCorta, hoyISO, hoyMas } from "@/lib/formato";
import { createClient } from "@/lib/supabase/client";
import { useThemeEngine } from "@/lib/theme/ThemeProvider";
import { useNegocioId } from "@/lib/useNegocioId";

type ClienteFila = {
  id: string;
  nombre: string;
  cif: string | null;
  direccion: string | null;
  email: string | null;
};

type ProductoFila = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_venta: number;
  iva_pct: number;
  tipo: string;
};

type MetodoPagoFila = {
  id: string;
  etiqueta: string;
  tipo: string;
  detalle: string | null;
  predeterminado: boolean;
};

type DocumentoGenerado = {
  id: string;
  referencia: string;
  numero: number;
  pdf_url: string | null;
};

const ICONO_TIPO: Record<TipoDocumento, typeof FileText> = {
  factura: FileText,
  ticket: Receipt,
  presupuesto: FileSpreadsheet,
  albaran: ClipboardList,
  proforma: FileSignature,
  recibo: BadgeCheck,
};

export default function NuevoDocumentoPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const negocioId = useNegocioId();
  const toast = useToast();
  const previewRef = useRef<HTMLDivElement>(null);
  const { theme } = useThemeEngine();

  const [tipo, setTipo] = useState<TipoDocumento | null>(null);

  // ── Datos del emisor ────────────────────────────────────────────────────
  const [emisor, setEmisor] = useState<EmisorSnapshot>({
    nombre: "",
    cif: null,
    direccion: null,
    email: null,
    telefono: null,
    logo_url: null,
  });

  // ── Cliente ─────────────────────────────────────────────────────────────
  const [clientes, setClientes] = useState<ClienteFila[]>([]);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [cliente, setCliente] = useState<ClienteSnapshot>({
    nombre: "",
    cif: null,
    direccion: null,
    email: null,
  });
  const [mostrarManual, setMostrarManual] = useState(false);
  const [guardarComoCliente, setGuardarComoCliente] = useState(true);

  // ── Productos / servicios guardados ─────────────────────────────────────
  const [productos, setProductos] = useState<ProductoFila[]>([]);

  // ── Cabecera (con valores por defecto) ──────────────────────────────────
  const [serie, setSerie] = useState("A");
  const [fechaEmision, setFechaEmision] = useState(hoyISO);
  const [fechaVencimiento, setFechaVencimiento] = useState(() => hoyMas(15));
  const [irpfPct, setIrpfPct] = useState<number>(0);
  const [cabeceraAbierta, setCabeceraAbierta] = useState(false);

  // ── Líneas ──────────────────────────────────────────────────────────────
  const [lineas, setLineas] = useState<LineaDocumento[]>([lineaVacia()]);

  // ── Métodos de pago ─────────────────────────────────────────────────────
  const [metodosGuardados, setMetodosGuardados] = useState<MetodoPagoFila[]>([]);
  const [metodoSeleccionadoId, setMetodoSeleccionadoId] = useState<string | "manual">("manual");
  const [metodoPago, setMetodoPago] = useState("transferencia");
  const [condicionesPago, setCondicionesPago] = useState("");
  const [pagoAbierto, setPagoAbierto] = useState(false);
  const [guardarMetodoNuevo, setGuardarMetodoNuevo] = useState(false);
  const [etiquetaMetodoNuevo, setEtiquetaMetodoNuevo] = useState("");

  // ── Notas ───────────────────────────────────────────────────────────────
  const [notas, setNotas] = useState("");

  // ── Estado de generación / fullscreen ───────────────────────────────────
  const [generando, setGenerando] = useState(false);
  const [generado, setGenerado] = useState<DocumentoGenerado | null>(null);
  const [enviadoFinanzas, setEnviadoFinanzas] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // ── Carga inicial ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [{ data: perfil }, { data: cls }, { data: mps }, { data: prods }] = await Promise.all([
        supabase
          .from("perfiles_negocio")
          .select("nombre_negocio,cif_nif,direccion,email_contacto,telefono,logo_url")
          .single(),
        supabase.from("clientes").select("id,nombre,cif,direccion,email").order("nombre"),
        supabase
          .from("metodos_pago")
          .select("id,etiqueta,tipo,detalle,predeterminado")
          .order("predeterminado", { ascending: false })
          .order("etiqueta"),
        supabase
          .from("productos")
          .select("id,nombre,descripcion,precio_venta,iva_pct,tipo")
          .eq("activo", true)
          .order("nombre"),
      ]);

      if (perfil) {
        setEmisor({
          nombre: perfil.nombre_negocio ?? "",
          cif: perfil.cif_nif ?? null,
          direccion: perfil.direccion ?? null,
          email: perfil.email_contacto ?? null,
          telefono: perfil.telefono ?? null,
          logo_url: perfil.logo_url ?? null,
        });
      }
      setClientes((cls ?? []) as ClienteFila[]);
      setProductos((prods ?? []) as ProductoFila[]);

      const ms = (mps ?? []) as MetodoPagoFila[];
      setMetodosGuardados(ms);
      const def = ms.find((m) => m.predeterminado) ?? ms[0];
      if (def) {
        setMetodoSeleccionadoId(def.id);
        setMetodoPago(def.etiqueta);
        setCondicionesPago(def.detalle ?? "");
      }
    })();
  }, [supabase]);

  // ── Selección de cliente desde dropdown ─────────────────────────────────
  function elegirClientePorId(id: string) {
    if (!id) {
      limpiarCliente();
      return;
    }
    const c = clientes.find((x) => x.id === id);
    if (!c) return;
    setClienteId(c.id);
    setCliente({
      nombre: c.nombre,
      cif: c.cif,
      direccion: c.direccion,
      email: c.email,
    });
    setMostrarManual(false);
  }

  function limpiarCliente() {
    setClienteId(null);
    setCliente({ nombre: "", cif: null, direccion: null, email: null });
  }

  // ── Selección de producto por línea ─────────────────────────────────────
  function aplicarProductoEnLinea(i: number, productoId: string) {
    if (!productoId) return;
    const p = productos.find((x) => x.id === productoId);
    if (!p) return;
    actualizarLinea(i, {
      descripcion: p.descripcion ? `${p.nombre} — ${p.descripcion}` : p.nombre,
      precio_unit: Number(p.precio_venta) || 0,
      iva_pct: Number(p.iva_pct) || 0,
    });
  }

  // ── Colores del documento (desde el tema configurable en Ajustes) ───────
  const coloresDocumento = useMemo(
    () => ({
      primario: theme["doc.primario"] ?? "#4f46e5",
      texto: theme["doc.texto"] ?? "#0f172a",
      acento: theme["doc.acento"] ?? "#eef2ff",
      acentoSuave: theme["doc.acentoSuave"] ?? "#f8fafc",
    }),
    [theme],
  );

  // ── Totales y validación ────────────────────────────────────────────────
  const totales = useMemo(() => calcularTotales(lineas, irpfPct), [lineas, irpfPct]);
  const errores = validarParaGenerar({
    tipo: tipo ?? "ticket",
    emisor_snapshot: emisor,
    cliente_snapshot: cliente,
    lineas,
  });

  // ── Líneas ──────────────────────────────────────────────────────────────
  const actualizarLinea = (i: number, patch: Partial<LineaDocumento>) =>
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const eliminarLinea = (i: number) =>
    setLineas((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  // ── Métodos de pago ─────────────────────────────────────────────────────
  function elegirMetodoGuardado(id: string) {
    setMetodoSeleccionadoId(id);
    if (id === "manual") return;
    const m = metodosGuardados.find((x) => x.id === id);
    if (m) {
      setMetodoPago(m.etiqueta);
      setCondicionesPago(m.detalle ?? "");
    }
  }

  // ── Generación ──────────────────────────────────────────────────────────
  async function generar() {
    if (!tipo || !negocioId) return;
    if (errores.length > 0) {
      toast.err(errores[0]);
      return;
    }
    setGenerando(true);

    // Si el cliente fue introducido manualmente y se marcó "Guardar también", lo creamos antes.
    let clienteIdFinal = clienteId;
    if (mostrarManual && guardarComoCliente && cliente.nombre && !clienteId) {
      const { data: nuevoCli, error: errCli } = await supabase
        .from("clientes")
        .insert({
          negocio_id: negocioId,
          nombre: cliente.nombre,
          cif: cliente.cif,
          direccion: cliente.direccion,
          email: cliente.email,
        })
        .select("id")
        .single();
      if (errCli) {
        toast.err(`No se pudo guardar el cliente: ${errCli.message}`);
      } else if (nuevoCli) {
        clienteIdFinal = nuevoCli.id;
        toast.ok("Cliente añadido a tu CRM.");
      }
    }

    // Si se marcó guardar el método de pago nuevo, lo persistimos
    if (
      metodoSeleccionadoId === "manual" &&
      guardarMetodoNuevo &&
      etiquetaMetodoNuevo.trim() &&
      negocioId
    ) {
      await supabase.from("metodos_pago").insert({
        negocio_id: negocioId,
        etiqueta: etiquetaMetodoNuevo.trim(),
        tipo: "otros",
        detalle: condicionesPago || null,
        predeterminado: metodosGuardados.length === 0,
      });
    }

    const anio = new Date(fechaEmision).getFullYear();

    // Atómico: reserva número + INSERT en la misma transacción → evita gaps
    // de numeración (requisito legal) y race conditions entre dos usuarios.
    const { data, error } = await supabase.rpc("crear_documento_generado", {
      p_doc: {
        tipo,
        cliente_id: clienteIdFinal,
        fecha_emision: fechaEmision,
        fecha_vencimiento: fechaVencimiento || null,
        emisor_snapshot: emisor,
        cliente_snapshot: cliente,
        lineas,
        subtotal: totales.subtotal,
        descuento_total: totales.descuento_total,
        base_imponible: totales.base_imponible,
        iva_total: totales.iva_total,
        irpf_pct: irpfPct,
        irpf_total: totales.irpf_total,
        total: totales.total,
        notas: notas || "",
        condiciones_pago: condicionesPago || "",
        metodo_pago: metodoPago || "",
      },
      p_serie: serie,
      p_anio: anio,
    });

    setGenerando(false);

    if (error || !data) {
      toast.err(`Error al guardar: ${error?.message ?? "desconocido"}`);
      return;
    }

    const doc = data as { id: string; referencia: string; numero: number; pdf_url: string | null };
    setGenerado(doc);
    toast.ok(`${ETIQUETA_TIPO[tipo]} ${doc.referencia} generada.`);
  }

  // ── Acciones post-generación ───────────────────────────────────────────
  function abrirVentanaImpresion(modo: "pdf" | "vista") {
    if (!previewRef.current || !tipo) return;
    const html = previewRef.current.innerHTML;
    const titulo = generado?.referencia ?? "documento";
    const formato = FORMATO_TIPO[tipo];
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) {
      toast.err("El navegador bloqueó la ventana.");
      return;
    }
    const autoPrint = modo === "pdf" ? "<script>window.onload=()=>window.print()</script>" : "";
    const cssA4 = `
      body{margin:0;background:#f1f5f9;padding:24px;font-family:system-ui,sans-serif}
      .doc-wrap{max-width:900px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.15)}
      @page{size:A4;margin:18mm}
      @media print{body{background:#fff;padding:0}.doc-wrap{box-shadow:none;max-width:none;border-radius:0}}
    `;
    const cssTicket = `
      body{margin:0;background:#f1f5f9;padding:12px;font-family:ui-monospace,Menlo,monospace}
      .doc-wrap{width:80mm;margin:0 auto;background:#fff;box-shadow:0 6px 24px rgba(0,0,0,.15)}
      @page{size:80mm auto;margin:0}
      @media print{body{background:#fff;padding:0}.doc-wrap{box-shadow:none}}
    `;
    const css = formato === "ticket" ? cssTicket : cssA4;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${titulo}</title>
      <style>${css}</style></head><body><div class="doc-wrap">${html}</div>${autoPrint}</body></html>`);
    w.document.close();
  }

  function enviarPorEmail() {
    if (!generado || !tipo) return;
    // Valida y escapa el destinatario para evitar header injection (CRLF, &cc=…).
    const emailRaw = (cliente.email ?? "").trim();
    const emailValido = /^[^\s<>"'`]+@[^\s<>"'`]+\.[^\s<>"'`]+$/.test(emailRaw);
    const destinatario = emailValido ? encodeURIComponent(emailRaw) : "";
    const asunto = encodeURIComponent(
      `${ETIQUETA_TIPO[tipo]} ${generado.referencia} — ${emisor.nombre}`,
    );
    const cuerpo = encodeURIComponent(
      `Hola${cliente.nombre ? ` ${cliente.nombre}` : ""},\n\n` +
        `Adjunto te envío la ${ETIQUETA_TIPO[tipo].toLowerCase()} ${generado.referencia} ` +
        `por importe de ${eur(totales.total)}.\n\n` +
        `Un saludo,\n${emisor.nombre}`,
    );
    window.location.href = `mailto:${destinatario}?subject=${asunto}&body=${cuerpo}`;
    toast.info("Recuerda adjuntar el PDF descargado al correo.");
  }

  async function añadirAFinanzas() {
    if (!generado || !negocioId || enviadoFinanzas || !tipo) return;
    const ivaPctMedio =
      totales.base_imponible > 0 ? (totales.iva_total / totales.base_imponible) * 100 : 21;
    const { data, error } = await supabase
      .from("finanzas")
      .insert({
        negocio_id: negocioId,
        cliente_id: clienteId,
        tipo: "ingreso",
        concepto: `${ETIQUETA_TIPO[tipo]} ${generado.referencia}`,
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
    await supabase.from("documentos").update({ finanza_id: data.id }).eq("id", generado.id);
    setEnviadoFinanzas(true);
    toast.ok("Movimiento añadido a Finanzas como ingreso pendiente.");
  }

  // ──────────────────────────────────────────────────────────────────────
  // PASO 1 — Selector de tipo
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
  // PASO 2 — Editor (form izquierda + preview derecha)
  const cabeceraResumen =
    `Serie ${serie} · ${formatearFechaCorta(fechaEmision)}` +
    (fechaVencimiento ? ` · vence ${formatearFechaCorta(fechaVencimiento)}` : "") +
    (irpfPct > 0 ? ` · IRPF ${irpfPct}%` : "");

  const pagoResumen = metodoPago + (condicionesPago ? ` · ${condicionesPago}` : "");

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
        title={
          generado
            ? `${ETIQUETA_TIPO[tipo]} ${generado.referencia}`
            : `Nueva ${ETIQUETA_TIPO[tipo].toLowerCase()}`
        }
        description={DESCRIPCION_TIPO[tipo]}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ─── FORMULARIO (izquierda) ──────────────────────────────── */}
        <fieldset disabled={generado !== null} className="flex flex-col gap-4 disabled:opacity-60">
          {/* CLIENTE */}
          <Card title="Cliente">
            {!mostrarManual ? (
              <div className="flex flex-col gap-2">
                <Field label="Cliente guardado" full>
                  <select
                    value={clienteId ?? ""}
                    onChange={(e) => elegirClientePorId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">— Selecciona un cliente —</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                        {c.cif ? ` · ${c.cif}` : ""}
                      </option>
                    ))}
                  </select>
                  {clientes.length === 0 && (
                    <Link href="/clientes" className="mt-1 text-[0.7rem] text-cyan hover:underline">
                      Aún no tienes clientes guardados — créalos en el módulo Clientes
                    </Link>
                  )}
                </Field>

                {clienteId && (
                  <div className="flex items-center gap-2 rounded-xl border border-ok/30 bg-ok/10 px-3 py-2 text-sm">
                    <CheckCircle2 size={14} className="text-ok" />
                    <span className="flex-1 text-text-hi">
                      <strong>{cliente.nombre}</strong>
                      {cliente.cif && <span className="ml-1 text-text-mid">({cliente.cif})</span>}
                    </span>
                    <button
                      type="button"
                      onClick={limpiarCliente}
                      className="text-xs text-text-mid hover:text-text-hi"
                    >
                      Quitar
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMostrarManual(true);
                    limpiarCliente();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-fuchsia/40 bg-fuchsia/5 py-2.5 text-sm font-semibold text-fuchsia hover:bg-fuchsia/10"
                >
                  <UserPlus size={14} /> Añadir cliente manualmente
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nombre" full>
                    <input
                      type="text"
                      value={cliente.nombre}
                      onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
                      className={inputCls}
                      autoFocus
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
                  <Field label="Email">
                    <input
                      type="email"
                      value={cliente.email ?? ""}
                      onChange={(e) => setCliente({ ...cliente, email: e.target.value || null })}
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
                </div>

                <label className="flex items-center gap-2 text-xs text-text-mid">
                  <input
                    type="checkbox"
                    checked={guardarComoCliente}
                    onChange={(e) => setGuardarComoCliente(e.target.checked)}
                    className="h-4 w-4 rounded border-indigo-400/30 bg-indigo-900/30 text-cyan focus:ring-cyan/30"
                  />
                  Guardar también como cliente en mi CRM
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setMostrarManual(false);
                    limpiarCliente();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-400/20 bg-indigo-900/20 py-2 text-xs font-semibold text-text-mid hover:text-text-hi"
                >
                  <ChevronDown size={12} /> Volver al listado guardado
                </button>
              </div>
            )}
          </Card>

          {/* CABECERA — colapsable */}
          {!cabeceraAbierta ? (
            <ResumenColapsable
              titulo="Cabecera"
              resumen={cabeceraResumen}
              onModificar={() => setCabeceraAbierta(true)}
            />
          ) : (
            <Card
              title="Cabecera"
              accion={
                <button
                  type="button"
                  onClick={() => setCabeceraAbierta(false)}
                  className="text-xs text-text-mid hover:text-text-hi"
                >
                  Colapsar
                </button>
              }
            >
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
                <Field label="Retención IRPF %">
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
          )}

          {/* CONTENIDO (productos / servicios) */}
          <Card title="Contenido">
            <div className="flex flex-col gap-3">
              {lineas.map((l, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-indigo-400/15 bg-indigo-900/20 p-3"
                >
                  <div className="grid grid-cols-12 gap-2">
                    <label className="col-span-12 flex flex-col gap-1">
                      <span className="text-[0.6rem] font-medium uppercase tracking-wider text-text-lo">
                        Producto / servicio guardado
                      </span>
                      <div className="relative">
                        <Package
                          size={13}
                          className="pointer-events-none absolute left-2.5 top-3 text-text-lo"
                        />
                        <select
                          value=""
                          onChange={(e) => {
                            aplicarProductoEnLinea(i, e.target.value);
                            e.target.value = "";
                          }}
                          className={`${inputCls} pl-8`}
                          disabled={productos.length === 0}
                        >
                          <option value="">
                            {productos.length === 0
                              ? "— Sin productos guardados —"
                              : "— Elegir de tu catálogo —"}
                          </option>
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} · {eur(Number(p.precio_venta) || 0)}
                              {p.tipo === "servicio" ? " · servicio" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                    <input
                      type="text"
                      placeholder="Descripción (o añade manualmente)"
                      value={l.descripcion}
                      onChange={(e) => actualizarLinea(i, { descripcion: e.target.value })}
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
                <Plus size={14} /> Añadir manualmente
              </button>
            </div>
          </Card>

          {/* PAGO — colapsable */}
          {!pagoAbierto ? (
            <ResumenColapsable
              titulo="Pago"
              resumen={pagoResumen}
              onModificar={() => setPagoAbierto(true)}
            />
          ) : (
            <Card
              title="Pago"
              accion={
                <button
                  type="button"
                  onClick={() => setPagoAbierto(false)}
                  className="text-xs text-text-mid hover:text-text-hi"
                >
                  Colapsar
                </button>
              }
            >
              <Field label="Método guardado">
                <select
                  value={metodoSeleccionadoId}
                  onChange={(e) => elegirMetodoGuardado(e.target.value)}
                  className={inputCls}
                >
                  {metodosGuardados.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.etiqueta}
                      {m.predeterminado ? " ⭐" : ""}
                    </option>
                  ))}
                  <option value="manual">— Introducir manualmente —</option>
                </select>
                {metodosGuardados.length === 0 && (
                  <Link href="/ajustes" className="mt-1 text-[0.7rem] text-cyan hover:underline">
                    Aún no tienes métodos guardados — añádelos en Ajustes
                  </Link>
                )}
              </Field>

              {metodoSeleccionadoId === "manual" && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field label="Método" full>
                    <input
                      type="text"
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      placeholder="Transferencia, Bizum, efectivo…"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Detalle / instrucciones" full>
                    <input
                      type="text"
                      value={condicionesPago}
                      onChange={(e) => setCondicionesPago(e.target.value)}
                      placeholder="IBAN, plazo, observaciones…"
                      className={inputCls}
                    />
                  </Field>
                  <label className="col-span-2 flex items-center gap-2 text-xs text-text-mid">
                    <input
                      type="checkbox"
                      checked={guardarMetodoNuevo}
                      onChange={(e) => setGuardarMetodoNuevo(e.target.checked)}
                      className="h-4 w-4 rounded border-indigo-400/30 bg-indigo-900/30 text-cyan focus:ring-cyan/30"
                    />
                    Guardar este método para reutilizarlo
                  </label>
                  {guardarMetodoNuevo && (
                    <Field label="Etiqueta del método" full>
                      <input
                        type="text"
                        value={etiquetaMetodoNuevo}
                        onChange={(e) => setEtiquetaMetodoNuevo(e.target.value)}
                        placeholder="Transferencia BBVA"
                        className={inputCls}
                      />
                    </Field>
                  )}
                </div>
              )}

              {metodoSeleccionadoId !== "manual" && condicionesPago && (
                <div className="mt-3 rounded-lg border border-indigo-400/15 bg-indigo-900/20 px-3 py-2 text-xs text-text-mid">
                  {condicionesPago}
                </div>
              )}
            </Card>
          )}

          {/* NOTAS */}
          <Card title="Notas (opcional)">
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Notas internas o mensaje para el cliente…"
              className={`${inputCls} h-auto resize-none py-2`}
            />
          </Card>
        </fieldset>

        {/* ─── PREVISUALIZACIÓN (derecha) ─────────────────────────── */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-4 lg:h-fit">
          <div className="flex items-center justify-between">
            <div className="section-label">Previsualización</div>
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-1.5 text-xs font-semibold text-cyan hover:bg-cyan/20"
            >
              <Maximize2 size={12} /> Ver en grande
            </button>
          </div>
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
                colores={coloresDocumento}
              />
            </div>
          </div>

          {/* GENERAR — bajo la previsualización */}
          {!generado && (
            <>
              {errores.length > 0 && (
                <div className="rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-warn">
                  <div className="mb-1 flex items-center gap-1.5 font-bold">
                    <AlertCircle size={13} /> Faltan datos para generar
                  </div>
                  <ul className="list-disc pl-4">
                    {errores.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                type="button"
                onClick={generar}
                disabled={generando || errores.length > 0 || !negocioId}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-base font-bold text-white shadow-glow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:from-text-lo disabled:to-text-lo disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {generando ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                Generar {ETIQUETA_TIPO[tipo].toLowerCase()}
              </button>
            </>
          )}

          {generado && (
            <div className="card-glass p-4">
              <div className="section-label mb-3">¿Qué quieres hacer ahora?</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <AccionBtn
                  onClick={() => abrirVentanaImpresion("pdf")}
                  Icono={Download}
                  label="Descargar PDF"
                  tono="cyan"
                />
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
            </div>
          )}
        </div>
      </div>

      <Modal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        size="xl"
        title={
          <button
            type="button"
            onClick={() => abrirVentanaImpresion("vista")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-1.5 text-xs font-semibold text-cyan hover:bg-cyan/20"
          >
            <Download size={12} /> Abrir en pestaña
          </button>
        }
        className="bg-white p-0"
      >
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
          colores={coloresDocumento}
        />
      </Modal>
    </div>
  );
}

// ── Subcomponentes locales (los reutilizables están en `@/components/ui/*`) ─

// Alias para no reescribir las decenas de `className={inputCls}` que ya
// existen — la cadena real vive en `@/components/ui/Input` (INPUT_CLS).
const inputCls = `h-10 ${INPUT_CLS}`;

// Wrapper para preservar la API existente usando el nuevo `<ActionButton>`.
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
  return (
    <ActionButton
      Icono={Icono}
      label={label}
      tono={tono}
      yaHecho={yaHecho}
      onClick={onClick}
      disabled={yaHecho && tono !== "ok"}
    />
  );
}

function Card({
  title,
  children,
  accion,
}: {
  title: string;
  children: React.ReactNode;
  accion?: React.ReactNode;
}) {
  return (
    <div className="card-glass p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="section-label">{title}</span>
        {accion}
      </div>
      {children}
    </div>
  );
}

function ResumenColapsable({
  titulo,
  resumen,
  onModificar,
}: {
  titulo: string;
  resumen: string;
  onModificar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onModificar}
      className="card-glass group flex items-center gap-3 p-3 text-left transition-colors hover:border-cyan/30"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/30 text-text-mid group-hover:text-cyan">
        <ChevronDown size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-text-lo">
          {titulo}
        </div>
        <div className="truncate text-sm text-text-hi">{resumen}</div>
      </div>
      <span className="inline-flex items-center gap-1 rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-1.5 text-xs font-semibold text-cyan">
        <Pencil size={12} /> Modificar
      </span>
    </button>
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
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </label>
  );
}
