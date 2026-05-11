// Constantes UI compartidas entre páginas. Las clases Tailwind se definen aquí
// para evitar duplicación entre clientes/productos/stock.

import type { EstadoStock, TipoMovimientoStock } from "./inventario";

export type EstadoCliente = "activa" | "prospecto" | "inactiva";

export const ESTADO_CLIENTE_BADGE: Record<EstadoCliente, string> = {
  activa:    "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  prospecto: "border-cyan/30 bg-cyan/10 text-cyan",
  inactiva:  "border-rose-400/30 bg-rose-500/10 text-rose-200",
};

export const ESTADO_STOCK_BADGE: Record<EstadoStock, { cls: string; label: string }> = {
  ok:        { cls: "border-ok/30 bg-ok/10 text-ok",                 label: "En stock" },
  bajo:      { cls: "border-warn/30 bg-warn/10 text-warn",           label: "Stock bajo" },
  agotado:   { cls: "border-danger/30 bg-danger/10 text-danger",     label: "Agotado" },
  sin_stock: { cls: "border-text-lo/30 bg-text-lo/10 text-text-mid", label: "Sin inventario" },
};

export const COLOR_MOV_STOCK: Record<TipoMovimientoStock, string> = {
  entrada:    "text-ok",
  salida:     "text-fuchsia",
  ajuste:     "text-warn",
  venta_tpv:  "text-cyan",
  devolucion: "text-text-mid",
};
