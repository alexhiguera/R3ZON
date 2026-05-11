// Tipos y lógica pura para Proveedores / Gastos.

export type Proveedor = {
  id: string;
  negocio_id: string;
  nombre: string;
  cif: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  web: string | null;
  persona_contacto: string | null;
  categoria: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type TipoGasto = "general" | "previsto" | "suscripcion";
export type Recurrencia = "mensual" | "trimestral" | "anual";
export type EstadoGasto = "pendiente" | "pagado" | "cancelado";

export type GastoProveedor = {
  id: string;
  negocio_id: string;
  proveedor_id: string | null;
  tipo: TipoGasto;
  concepto: string;
  categoria: string | null;
  fecha: string;        // ISO date
  importe: number;
  iva_pct: number;
  recurrencia: Recurrencia | null;
  proximo_cobro: string | null;
  estado: EstadoGasto;
  adjunto_url: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export const TIPO_GASTO_LABEL: Record<TipoGasto, string> = {
  general:     "Gasto general",
  previsto:    "Gasto previsto",
  suscripcion: "Suscripción",
};

export const ESTADO_GASTO_BADGE: Record<EstadoGasto, { label: string; cls: string }> = {
  pendiente:  { label: "Pendiente",  cls: "border-amber-400/30 bg-amber-500/10 text-amber-200" },
  pagado:     { label: "Pagado",     cls: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" },
  cancelado:  { label: "Cancelado",  cls: "border-rose-400/30 bg-rose-500/10 text-rose-200" },
};

export function totalIncluyendoIva(importe: number, iva_pct: number): number {
  const t = importe * (1 + iva_pct / 100);
  return Math.round(t * 100) / 100;
}

export function gastoMensualizado(g: Pick<GastoProveedor, "importe" | "recurrencia">): number {
  switch (g.recurrencia) {
    case "mensual":    return g.importe;
    case "trimestral": return g.importe / 3;
    case "anual":      return g.importe / 12;
    default:           return 0;
  }
}
