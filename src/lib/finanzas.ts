import { eur } from "./formato";
import type { Database } from "./database.types";

export { eur };

type FinanzaRow = Database["public"]["Tables"]["finanzas"]["Row"];

// `tipo` es `text` con CHECK constraint en la BD → Supabase lo genera como
// `string`. Lo estrechamos al union real. Los importes son `number | null`
// en BD, pero los consumidores siempre los normalizan con `Number(... ?? 0)`.
export type MovimientoFila = Pick<FinanzaRow, "fecha" | "base_imponible"> & {
  tipo: "ingreso" | "gasto";
  iva_importe: number | null;
  irpf_importe: number | null;
  total: number | null;
};

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Acumulamos en céntimos enteros para evitar el error de IEEE-754 sobre N
// líneas. `Math.round` antes de sumar fija un solo redondeo por importe.
const toCts = (v: number | null) => Math.round(Number(v ?? 0) * 100);
const fromCts = (cts: number) => cts / 100;

export function agregarPorMes(filas: MovimientoFila[], anio = new Date().getFullYear()) {
  const buckets = MESES.map((mes) => ({ mes, ganadoCts: 0, gastadoCts: 0, ivaCts: 0, irpfCts: 0 }));

  for (const f of filas) {
    const d = new Date(f.fecha);
    if (d.getFullYear() !== anio) continue;
    const b = buckets[d.getMonth()];
    if (f.tipo === "ingreso") {
      b.ganadoCts += toCts(f.base_imponible);
      b.ivaCts    += toCts(f.iva_importe);   // IVA repercutido (cobras al cliente)
      b.irpfCts   += toCts(f.irpf_importe);  // IRPF retenido por el cliente
    } else {
      b.gastadoCts += toCts(f.base_imponible);
      b.ivaCts     -= toCts(f.iva_importe);  // IVA soportado (resta de lo que debes)
    }
  }

  return buckets.map((b) => ({
    mes: b.mes,
    ganado:  fromCts(b.ganadoCts),
    gastado: fromCts(b.gastadoCts),
    iva:     fromCts(b.ivaCts),
    irpf:    fromCts(b.irpfCts),
  }));
}

export function totales(filas: MovimientoFila[]) {
  let ganadoCts = 0, gastadoCts = 0, ivaRepCts = 0, ivaSopCts = 0, irpfCts = 0;
  for (const f of filas) {
    if (f.tipo === "ingreso") {
      ganadoCts += toCts(f.base_imponible);
      ivaRepCts += toCts(f.iva_importe);
      irpfCts   += toCts(f.irpf_importe);
    } else {
      gastadoCts += toCts(f.base_imponible);
      ivaSopCts  += toCts(f.iva_importe);
    }
  }
  return {
    ganado:       fromCts(ganadoCts),
    gastado:      fromCts(gastadoCts),
    beneficio:    fromCts(ganadoCts - gastadoCts),
    ivaAPagar:    fromCts(ivaRepCts - ivaSopCts), // si negativo → Hacienda te devuelve
    irpfRetenido: fromCts(irpfCts),
  };
}
