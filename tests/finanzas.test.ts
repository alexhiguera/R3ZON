import { describe, expect, it } from "vitest";
import { agregarPorMes, type MovimientoFila, totales } from "@/lib/finanzas";

const ingreso = (fecha: string, base: number, iva: number, irpf = 0): MovimientoFila => ({
  tipo: "ingreso",
  fecha,
  base_imponible: base,
  iva_importe: iva,
  irpf_importe: irpf,
  total: base + iva - irpf,
});

const gasto = (fecha: string, base: number, iva: number): MovimientoFila => ({
  tipo: "gasto",
  fecha,
  base_imponible: base,
  iva_importe: iva,
  irpf_importe: 0,
  total: base + iva,
});

describe("totales", () => {
  it("suma ingresos y gastos correctamente", () => {
    const filas = [
      ingreso("2026-01-15", 1000, 210, 150),
      ingreso("2026-02-10", 500, 105, 75),
      gasto("2026-01-20", 200, 42),
    ];
    const t = totales(filas);
    expect(t.ganado).toBe(1500);
    expect(t.gastado).toBe(200);
    expect(t.beneficio).toBe(1300);
    // IVA repercutido (315) − soportado (42) = 273
    expect(t.ivaAPagar).toBe(273);
    expect(t.irpfRetenido).toBe(225);
  });

  it("ivaAPagar negativo cuando soportado > repercutido (Hacienda devuelve)", () => {
    const filas = [ingreso("2026-01-01", 100, 21), gasto("2026-01-02", 1000, 210)];
    const t = totales(filas);
    expect(t.ivaAPagar).toBe(-189);
  });

  it("redondea a 2 decimales", () => {
    const filas = [ingreso("2026-01-01", 0.1, 0.02)];
    const t = totales(filas);
    expect(Number.isFinite(t.ganado)).toBe(true);
    expect(t.ganado.toString()).not.toMatch(/\.\d{3,}$/);
  });

  it("acepta strings numéricos sin romper (Number coerción)", () => {
    const filas: MovimientoFila[] = [
      {
        tipo: "ingreso",
        fecha: "2026-01-01",
        base_imponible: "100" as unknown as number,
        iva_importe: "21" as unknown as number,
        irpf_importe: 0,
        total: 121,
      },
    ];
    const t = totales(filas);
    expect(t.ganado).toBe(100);
    expect(t.ivaAPagar).toBe(21);
  });
});

describe("agregarPorMes", () => {
  it("agrega ingresos y gastos en el bucket del mes correcto", () => {
    const filas = [
      ingreso("2026-01-15", 1000, 210, 150),
      ingreso("2026-01-20", 500, 105, 0),
      gasto("2026-01-25", 200, 42),
      ingreso("2026-03-01", 300, 63, 0),
    ];
    const buckets = agregarPorMes(filas, 2026);
    expect(buckets[0].mes).toBe("Ene");
    expect(buckets[0].ganado).toBe(1500);
    expect(buckets[0].gastado).toBe(200);
    // IVA enero = 210 + 105 − 42 = 273
    expect(buckets[0].iva).toBe(273);
    expect(buckets[0].irpf).toBe(150);
    expect(buckets[2].ganado).toBe(300);
    expect(buckets[1].ganado).toBe(0);
  });

  it("ignora movimientos de otro año", () => {
    const filas = [ingreso("2025-06-01", 9999, 0, 0), ingreso("2026-06-01", 100, 21, 0)];
    const buckets = agregarPorMes(filas, 2026);
    expect(buckets[5].ganado).toBe(100);
  });

  it("siempre devuelve 12 meses aunque no haya movimientos", () => {
    const buckets = agregarPorMes([], 2026);
    expect(buckets).toHaveLength(12);
    expect(buckets.every((b) => b.ganado === 0 && b.gastado === 0)).toBe(true);
  });
});
