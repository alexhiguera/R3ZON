import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  buildMailtoUrl,
  type ClienteSnapshot,
  calcularTotales,
  type EmisorSnapshot,
  ETIQUETA_TIPO,
  type LineaDocumento,
  lineaVacia,
  type TipoDocumento,
  validarParaGenerar,
} from "@/lib/documentos";
import { hoyISO, hoyMas } from "@/lib/formato";
import { createClient } from "@/lib/supabase/client";
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

export type DocumentoGenerado = {
  id: string;
  referencia: string;
  numero: number;
  pdf_url: string | null;
};

/**
 * Hook que concentra todo el estado y las acciones del editor de documentos.
 * Saca de la UI: carga inicial (perfil + clientes + productos + métodos de pago),
 * gestión de líneas, cálculo de totales, generación atómica vía RPC, envío por
 * email con sanitización del destinatario y alta en finanzas.
 */
export function useDocumentoEditor(tipo: TipoDocumento | null) {
  const supabase = useMemo(() => createClient(), []);
  const negocioId = useNegocioId();
  const toast = useToast();

  // Datos del emisor
  const [emisor, setEmisor] = useState<EmisorSnapshot>({
    nombre: "",
    cif: null,
    direccion: null,
    email: null,
    telefono: null,
    logo_url: null,
  });

  // Cliente
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

  // Productos / servicios guardados
  const [productos, setProductos] = useState<ProductoFila[]>([]);

  // Cabecera (con valores por defecto)
  const [serie, setSerie] = useState("A");
  const [fechaEmision, setFechaEmision] = useState(hoyISO);
  const [fechaVencimiento, setFechaVencimiento] = useState(() => hoyMas(15));
  const [irpfPct, setIrpfPct] = useState<number>(0);
  const [cabeceraAbierta, setCabeceraAbierta] = useState(false);

  // Líneas
  const [lineas, setLineas] = useState<LineaDocumento[]>([lineaVacia()]);

  // Métodos de pago
  const [metodosGuardados, setMetodosGuardados] = useState<MetodoPagoFila[]>([]);
  const [metodoSeleccionadoId, setMetodoSeleccionadoId] = useState<string | "manual">("manual");
  const [metodoPago, setMetodoPago] = useState("transferencia");
  const [condicionesPago, setCondicionesPago] = useState("");
  const [pagoAbierto, setPagoAbierto] = useState(false);
  const [guardarMetodoNuevo, setGuardarMetodoNuevo] = useState(false);
  const [etiquetaMetodoNuevo, setEtiquetaMetodoNuevo] = useState("");

  // Notas
  const [notas, setNotas] = useState("");

  // Estado de generación
  const [generando, setGenerando] = useState(false);
  const [generado, setGenerado] = useState<DocumentoGenerado | null>(null);
  const [enviadoFinanzas, setEnviadoFinanzas] = useState(false);

  // Carga inicial
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

  // Derivados
  const totales = useMemo(() => calcularTotales(lineas, irpfPct), [lineas, irpfPct]);
  const errores = validarParaGenerar({
    tipo: tipo ?? "ticket",
    emisor_snapshot: emisor,
    cliente_snapshot: cliente,
    lineas,
  });

  // Acciones sobre estado
  const actualizarLinea = (i: number, patch: Partial<LineaDocumento>) =>
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const eliminarLinea = (i: number) =>
    setLineas((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const añadirLinea = () => setLineas((prev) => [...prev, lineaVacia()]);

  function elegirClientePorId(id: string) {
    if (!id) {
      limpiarCliente();
      return;
    }
    const c = clientes.find((x) => x.id === id);
    if (!c) return;
    setClienteId(c.id);
    setCliente({ nombre: c.nombre, cif: c.cif, direccion: c.direccion, email: c.email });
    setMostrarManual(false);
  }

  function limpiarCliente() {
    setClienteId(null);
    setCliente({ nombre: "", cif: null, direccion: null, email: null });
  }

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

  function elegirMetodoGuardado(id: string) {
    setMetodoSeleccionadoId(id);
    if (id === "manual") return;
    const m = metodosGuardados.find((x) => x.id === id);
    if (m) {
      setMetodoPago(m.etiqueta);
      setCondicionesPago(m.detalle ?? "");
    }
  }

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

    const doc = data as DocumentoGenerado;
    setGenerado(doc);
    toast.ok(`${ETIQUETA_TIPO[tipo]} ${doc.referencia} generada.`);
  }

  function mailtoUrl(): string | null {
    if (!generado || !tipo) return null;
    return buildMailtoUrl({
      tipo,
      referencia: generado.referencia,
      clienteEmail: cliente.email,
      clienteNombre: cliente.nombre,
      emisorNombre: emisor.nombre,
      total: totales.total,
    });
  }

  function enviarPorEmail() {
    const url = mailtoUrl();
    if (!url) return;
    window.location.href = url;
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

  return {
    // identificadores
    negocioId,
    supabase,
    // emisor
    emisor,
    // cliente
    clientes,
    cliente,
    setCliente,
    clienteId,
    mostrarManual,
    setMostrarManual,
    guardarComoCliente,
    setGuardarComoCliente,
    elegirClientePorId,
    limpiarCliente,
    // productos
    productos,
    aplicarProductoEnLinea,
    // cabecera
    serie,
    setSerie,
    fechaEmision,
    setFechaEmision,
    fechaVencimiento,
    setFechaVencimiento,
    irpfPct,
    setIrpfPct,
    cabeceraAbierta,
    setCabeceraAbierta,
    // líneas
    lineas,
    actualizarLinea,
    eliminarLinea,
    añadirLinea,
    // pago
    metodosGuardados,
    metodoSeleccionadoId,
    elegirMetodoGuardado,
    metodoPago,
    setMetodoPago,
    condicionesPago,
    setCondicionesPago,
    pagoAbierto,
    setPagoAbierto,
    guardarMetodoNuevo,
    setGuardarMetodoNuevo,
    etiquetaMetodoNuevo,
    setEtiquetaMetodoNuevo,
    // notas
    notas,
    setNotas,
    // derivados
    totales,
    errores,
    // acciones
    generando,
    generado,
    generar,
    enviadoFinanzas,
    enviarPorEmail,
    mailtoUrl,
    añadirAFinanzas,
  };
}
