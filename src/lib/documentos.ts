// Lógica pura de documentos comerciales (factura, ticket, presupuesto, …).
// Sin red ni Supabase: todo determinístico para tests.

export type TipoDocumento =
  | "factura"
  | "ticket"
  | "presupuesto"
  | "albaran"
  | "proforma";

export type EstadoDocumento =
  | "borrador"
  | "generado"
  | "enviado"
  | "pagado"
  | "anulado";

export type LineaDocumento = {
  descripcion: string;
  cantidad: number;
  precio_unit: number;
  descuento_pct: number;
  iva_pct: number;
};

export type EmisorSnapshot = {
  nombre: string;
  cif: string | null;
  direccion: string | null;
  email: string | null;
  telefono: string | null;
};

export type ClienteSnapshot = {
  nombre: string;
  cif: string | null;
  direccion: string | null;
  email: string | null;
};

export type Documento = {
  id: string;
  negocio_id: string;
  cliente_id: string | null;
  tipo: TipoDocumento;
  serie: string;
  numero: number | null;
  anio: number;
  referencia: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  emisor_snapshot: EmisorSnapshot;
  cliente_snapshot: ClienteSnapshot;
  lineas: LineaDocumento[];
  subtotal: number;
  descuento_total: number;
  base_imponible: number;
  iva_total: number;
  irpf_pct: number;
  irpf_total: number;
  total: number;
  estado: EstadoDocumento;
  notas: string | null;
  condiciones_pago: string | null;
  metodo_pago: string | null;
  finanza_id: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
};

export const ETIQUETA_TIPO: Record<TipoDocumento, string> = {
  factura:     "Factura",
  ticket:      "Ticket",
  presupuesto: "Presupuesto",
  albaran:     "Albarán",
  proforma:    "Proforma",
};

export const DESCRIPCION_TIPO: Record<TipoDocumento, string> = {
  factura:     "Documento legal con validez fiscal. Numeración correlativa obligatoria.",
  ticket:      "Justificante de venta para clientes finales (sin datos fiscales).",
  presupuesto: "Oferta económica vinculante hasta su fecha de validez.",
  albaran:     "Justificante de entrega de mercancía o servicio.",
  proforma:    "Borrador de factura sin validez fiscal.",
};

export const TIPOS_DOCUMENTO: TipoDocumento[] = [
  "factura",
  "ticket",
  "presupuesto",
  "albaran",
  "proforma",
];

// Tipos que necesitan datos fiscales completos del cliente.
export const REQUIERE_CLIENTE_FISCAL: TipoDocumento[] = ["factura", "proforma"];

// ── Cálculo de totales ────────────────────────────────────────────────────────

export type TotalesDocumento = {
  subtotal: number;          // Σ cantidad × precio_unit (sin descuento)
  descuento_total: number;   // Σ descuentos por línea
  base_imponible: number;    // subtotal − descuento_total
  iva_total: number;         // Σ IVA por línea (sobre la base con descuento)
  irpf_total: number;        // base_imponible × irpf_pct
  total: number;             // base_imponible + iva_total − irpf_total
  desglose_iva: Map<number, { base: number; cuota: number }>;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Calcula totales de un documento. Determinístico, sin efectos secundarios. */
export function calcularTotales(
  lineas: LineaDocumento[],
  irpf_pct = 0,
): TotalesDocumento {
  let subtotal = 0;
  let descuento_total = 0;
  let iva_total = 0;
  const desglose_iva = new Map<number, { base: number; cuota: number }>();

  for (const l of lineas) {
    const cantidad = Number(l.cantidad) || 0;
    const precio   = Number(l.precio_unit) || 0;
    const descPct  = Number(l.descuento_pct) || 0;
    const ivaPct   = Number(l.iva_pct) || 0;

    const bruto    = cantidad * precio;
    const desc     = bruto * (descPct / 100);
    const baseLin  = bruto - desc;
    const ivaLin   = baseLin * (ivaPct / 100);

    subtotal        += bruto;
    descuento_total += desc;
    iva_total       += ivaLin;

    const acc = desglose_iva.get(ivaPct) ?? { base: 0, cuota: 0 };
    acc.base  += baseLin;
    acc.cuota += ivaLin;
    desglose_iva.set(ivaPct, acc);
  }

  const base_imponible = subtotal - descuento_total;
  const irpf_total = base_imponible * ((Number(irpf_pct) || 0) / 100);
  const total = base_imponible + iva_total - irpf_total;

  // Redondeo final
  const desglose_redondeado = new Map<number, { base: number; cuota: number }>();
  for (const [pct, v] of desglose_iva) {
    desglose_redondeado.set(pct, { base: round2(v.base), cuota: round2(v.cuota) });
  }

  return {
    subtotal:        round2(subtotal),
    descuento_total: round2(descuento_total),
    base_imponible:  round2(base_imponible),
    iva_total:       round2(iva_total),
    irpf_total:      round2(irpf_total),
    total:           round2(total),
    desglose_iva:    desglose_redondeado,
  };
}

/** Línea vacía para inicializar el formulario. */
export function lineaVacia(): LineaDocumento {
  return {
    descripcion:   "",
    cantidad:      1,
    precio_unit:   0,
    descuento_pct: 0,
    iva_pct:       21,
  };
}

/** Formatea importes en EUR con 2 decimales. */
export const eur = (n: number): string =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

/** Construye la referencia visible (mismo formato que la columna generada). */
export function referenciaDocumento(
  tipo: TipoDocumento,
  serie: string,
  anio: number,
  numero: number | null,
): string {
  const n = String(numero ?? 0).padStart(5, "0");
  return `${tipo}-${serie}-${anio}-${n}`;
}

/** Valida que un documento esté listo para generarse. Devuelve lista de errores. */
export function validarParaGenerar(d: {
  tipo: TipoDocumento;
  cliente_snapshot: Partial<ClienteSnapshot>;
  emisor_snapshot: Partial<EmisorSnapshot>;
  lineas: LineaDocumento[];
}): string[] {
  const errores: string[] = [];
  if (!d.emisor_snapshot.nombre) errores.push("Falta el nombre del emisor.");
  if (REQUIERE_CLIENTE_FISCAL.includes(d.tipo)) {
    if (!d.cliente_snapshot.nombre) errores.push("Selecciona o introduce el cliente.");
    if (!d.cliente_snapshot.cif)    errores.push("La factura requiere CIF/NIF del cliente.");
  }
  if (d.lineas.length === 0) errores.push("Añade al menos una línea.");
  if (d.lineas.some((l) => !l.descripcion.trim()))
    errores.push("Todas las líneas necesitan descripción.");
  if (d.lineas.some((l) => (Number(l.cantidad) || 0) <= 0))
    errores.push("Las cantidades deben ser mayores que cero.");
  return errores;
}
