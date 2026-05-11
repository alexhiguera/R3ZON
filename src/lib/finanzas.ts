import { eur, round2 } from "./formato";
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

export function agregarPorMes(filas: MovimientoFila[], anio = new Date().getFullYear()) {
  const buckets = MESES.map((mes) => ({ mes, ganado: 0, gastado: 0, iva: 0, irpf: 0 }));

  for (const f of filas) {
    const d = new Date(f.fecha);
    if (d.getFullYear() !== anio) continue;
    const b = buckets[d.getMonth()];
    if (f.tipo === "ingreso") {
      b.ganado += Number(f.base_imponible);
      b.iva += Number(f.iva_importe);   // IVA repercutido (cobras al cliente)
      b.irpf += Number(f.irpf_importe); // IRPF retenido por el cliente
    } else {
      b.gastado += Number(f.base_imponible);
      b.iva -= Number(f.iva_importe);   // IVA soportado (resta de lo que debes)
    }
  }

  return buckets.map((b) => ({
    ...b,
    ganado: round2(b.ganado),
    gastado: round2(b.gastado),
    iva: round2(b.iva),
    irpf: round2(b.irpf),
  }));
}

export function totales(filas: MovimientoFila[]) {
  let ganado = 0, gastado = 0, ivaRep = 0, ivaSop = 0, irpf = 0;
  for (const f of filas) {
    if (f.tipo === "ingreso") {
      ganado += Number(f.base_imponible);
      ivaRep += Number(f.iva_importe);
      irpf  += Number(f.irpf_importe);
    } else {
      gastado += Number(f.base_imponible);
      ivaSop  += Number(f.iva_importe);
    }
  }
  return {
    ganado: round2(ganado),
    gastado: round2(gastado),
    beneficio: round2(ganado - gastado),
    ivaAPagar: round2(ivaRep - ivaSop), // si negativo → Hacienda te devuelve
    irpfRetenido: round2(irpf),
  };
}
