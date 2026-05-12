// Lógica pura para Productos / Stock / TPV. Sin red ni Supabase: determinístico
// y testeable.

import { eur, round2, round3 } from "./formato";
import type { Database } from "./database.types";

export { eur };

export type TipoProducto = "producto" | "servicio";

type ProductoRow = Database["public"]["Tables"]["productos"]["Row"];
export type Producto = Omit<ProductoRow, "tipo"> & { tipo: TipoProducto };

export type TipoMovimientoStock =
  | "entrada"
  | "salida"
  | "ajuste"
  | "venta_tpv"
  | "devolucion";

export type StockMovimiento = {
  id: string;
  negocio_id: string;
  producto_id: string;
  tipo: TipoMovimientoStock;
  cantidad: number;          // firmado
  motivo: string | null;
  referencia: string | null;
  ts: string;
  user_id: string | null;
};

export type EstadoStock = "ok" | "bajo" | "agotado" | "sin_stock";

export type ItemTPV = {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_unit: number;
  iva_pct: number;
  descuento_pct: number;
};

export type EstadoVentaTPV = "abierta" | "cerrada" | "anulada";

export type VentaTPV = {
  id: string;
  negocio_id: string;
  user_id: string | null;
  cliente_id: string | null;
  mesa: string | null;
  estado: EstadoVentaTPV;
  metodo_pago: string | null;
  subtotal: number;
  descuento: number;
  iva_total: number;
  total: number;
  notas: string | null;
  abierta_at: string;
  cerrada_at: string | null;
};

// ── Stock ────────────────────────────────────────────────────────────────────

/**
 * Devuelve el estado visual del stock para un producto.
 * - sin_stock: el producto no rastrea stock (servicios, comida sin inventario).
 * - agotado:   stock_actual <= 0
 * - bajo:      stock_actual <= stock_minimo (>0)
 * - ok:        en otro caso.
 */
export function estadoStock(p: {
  stock_tracking: boolean;
  stock_actual: number | null;
  stock_minimo: number | null;
}): EstadoStock {
  if (!p.stock_tracking) return "sin_stock";
  const actual = Number(p.stock_actual ?? 0);
  const minimo = Number(p.stock_minimo ?? 0);
  if (actual <= 0) return "agotado";
  if (minimo > 0 && actual <= minimo) return "bajo";
  return "ok";
}

/** Aplica un movimiento al stock actual (sólo si el producto rastrea stock). */
export function aplicarMovimiento(actual: number, m: { cantidad: number }): number {
  return round3(actual + (Number(m.cantidad) || 0));
}

// ── TPV ──────────────────────────────────────────────────────────────────────

export type TotalesTPV = {
  subtotal: number;       // Σ importe línea (sin IVA, ya con descuento)
  iva_total: number;      // Σ IVA por línea
  total: number;          // subtotal + iva
  num_items: number;
  num_unidades: number;
};

/** Suma totales del ticket TPV. */
export function calcularTotalVenta(items: ItemTPV[]): TotalesTPV {
  let subtotal = 0;
  let iva = 0;
  let unidades = 0;

  for (const it of items) {
    const cant   = Number(it.cantidad) || 0;
    const precio = Number(it.precio_unit) || 0;
    const desc   = Number(it.descuento_pct) || 0;
    const ivaPct = Number(it.iva_pct) || 0;

    const linea = cant * precio * (1 - desc / 100);
    subtotal += linea;
    iva      += linea * (ivaPct / 100);
    unidades += cant;
  }

  return {
    subtotal:     round2(subtotal),
    iva_total:    round2(iva),
    total:        round2(subtotal + iva),
    num_items:    items.length,
    num_unidades: round3(unidades),
  };
}

/**
 * Añade un producto al ticket. Si ya está, incrementa la cantidad para evitar
 * duplicar líneas idénticas. Devuelve un nuevo array (immutable).
 */
export function añadirItem(items: ItemTPV[], producto: {
  id: string;
  nombre: string;
  precio_venta: number;
  iva_pct: number;
}): ItemTPV[] {
  const idx = items.findIndex(
    (it) => it.producto_id === producto.id && (it.descuento_pct ?? 0) === 0,
  );
  if (idx >= 0) {
    return items.map((it, i) =>
      i === idx ? { ...it, cantidad: round3(it.cantidad + 1) } : it,
    );
  }
  return [
    ...items,
    {
      producto_id:   producto.id,
      nombre:        producto.nombre,
      cantidad:      1,
      precio_unit:   producto.precio_venta,
      iva_pct:       producto.iva_pct,
      descuento_pct: 0,
    },
  ];
}

/** Cambia la cantidad de un ítem. cantidad<=0 → elimina la línea. */
export function cambiarCantidad(items: ItemTPV[], idx: number, cantidad: number): ItemTPV[] {
  const c = Number(cantidad) || 0;
  if (c <= 0) return items.filter((_, i) => i !== idx);
  return items.map((it, i) => (i === idx ? { ...it, cantidad: round3(c) } : it));
}

/** Elimina un ítem por índice. */
export function eliminarItem(items: ItemTPV[], idx: number): ItemTPV[] {
  return items.filter((_, i) => i !== idx);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export const ETIQUETA_MOVIMIENTO: Record<TipoMovimientoStock, string> = {
  entrada:    "Entrada",
  salida:     "Salida",
  ajuste:     "Ajuste",
  venta_tpv:  "Venta TPV",
  devolucion: "Devolución",
};

/** Color suave por categoría — para botones del TPV cuando el producto no tiene color. */
export function colorCategoria(cat: string | null | undefined): string {
  if (!cat) return "#64748b";
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 55%, 50%)`;
}
