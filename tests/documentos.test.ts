import { describe, expect, it } from "vitest";
import {
  calcularTotales,
  eur,
  type LineaDocumento,
  lineaVacia,
  referenciaDocumento,
  validarParaGenerar,
} from "@/lib/documentos";

const linea = (over: Partial<LineaDocumento> = {}): LineaDocumento => ({
  ...lineaVacia(),
  ...over,
});

describe("calcularTotales", () => {
  it("devuelve ceros con lista vacía", () => {
    const r = calcularTotales([]);
    expect(r.subtotal).toBe(0);
    expect(r.base_imponible).toBe(0);
    expect(r.iva_total).toBe(0);
    expect(r.total).toBe(0);
    expect(r.desglose_iva.size).toBe(0);
  });

  it("una línea sin descuento ni IRPF", () => {
    const r = calcularTotales([linea({ cantidad: 2, precio_unit: 50, iva_pct: 21 })]);
    expect(r.subtotal).toBe(100);
    expect(r.descuento_total).toBe(0);
    expect(r.base_imponible).toBe(100);
    expect(r.iva_total).toBe(21);
    expect(r.total).toBe(121);
  });

  it("aplica descuento por línea sobre la base", () => {
    const r = calcularTotales([
      linea({ cantidad: 1, precio_unit: 200, descuento_pct: 10, iva_pct: 21 }),
    ]);
    expect(r.subtotal).toBe(200);
    expect(r.descuento_total).toBe(20);
    expect(r.base_imponible).toBe(180);
    expect(r.iva_total).toBe(37.8);
    expect(r.total).toBe(217.8);
  });

  it("agrupa el desglose por tipos de IVA distintos", () => {
    const r = calcularTotales([
      linea({ cantidad: 1, precio_unit: 100, iva_pct: 21 }),
      linea({ cantidad: 1, precio_unit: 100, iva_pct: 10 }),
      linea({ cantidad: 2, precio_unit: 50, iva_pct: 21 }),
    ]);
    expect(r.subtotal).toBe(300);
    expect(r.iva_total).toBe(21 + 10 + 21);
    const iva21 = r.desglose_iva.get(21);
    const iva10 = r.desglose_iva.get(10);
    expect(iva21).toEqual({ base: 200, cuota: 42 });
    expect(iva10).toEqual({ base: 100, cuota: 10 });
  });

  it("retiene IRPF sobre la base imponible (no sobre el total)", () => {
    const r = calcularTotales([linea({ cantidad: 1, precio_unit: 1000, iva_pct: 21 })], 15);
    expect(r.base_imponible).toBe(1000);
    expect(r.iva_total).toBe(210);
    expect(r.irpf_total).toBe(150); // 1000 × 15 %
    expect(r.total).toBe(1060); // 1000 + 210 − 150
  });

  it("trata valores no numéricos como cero", () => {
    const r = calcularTotales([
      // @ts-expect-error — simula entrada del formulario
      linea({ cantidad: "x", precio_unit: 100, iva_pct: 21 }),
    ]);
    expect(r.subtotal).toBe(0);
    expect(r.total).toBe(0);
  });
});

describe("eur", () => {
  it("formatea con 2 decimales y símbolo €", () => {
    // El separador de miles depende del ICU disponible en el runtime;
    // basta con verificar la coma decimal con 2 dígitos y el símbolo €.
    expect(eur(1234.5)).toMatch(/,50/);
    expect(eur(1234.5)).toMatch(/€/);
    expect(eur(0)).toMatch(/0,00/);
  });

  it("trata NaN como 0", () => {
    expect(eur(NaN)).toMatch(/0,00/);
  });
});

describe("referenciaDocumento", () => {
  it("produce el mismo formato que la columna generada", () => {
    expect(referenciaDocumento("factura", "A", 2026, 7)).toBe("factura-A-2026-00007");
    expect(referenciaDocumento("ticket", "B", 2025, null)).toBe("ticket-B-2025-00000");
    expect(referenciaDocumento("presupuesto", "A", 2026, 12345)).toBe("presupuesto-A-2026-12345");
  });
});

describe("validarParaGenerar", () => {
  const baseValido = {
    tipo: "factura" as const,
    emisor_snapshot: { nombre: "Mi Empresa SL", cif: "B12345678" },
    cliente_snapshot: { nombre: "Cliente SL", cif: "B87654321" },
    lineas: [linea({ descripcion: "Trabajo", cantidad: 1, precio_unit: 100 })],
  };

  it("acepta una factura completa", () => {
    expect(validarParaGenerar(baseValido)).toEqual([]);
  });

  it("exige CIF del cliente para facturas", () => {
    const r = validarParaGenerar({
      ...baseValido,
      cliente_snapshot: { nombre: "Cliente SL", cif: null },
    });
    expect(r).toContain("La factura requiere CIF/NIF del cliente.");
  });

  it("permite tickets sin cliente", () => {
    const r = validarParaGenerar({
      ...baseValido,
      tipo: "ticket",
      cliente_snapshot: {},
    });
    expect(r).toEqual([]);
  });

  it("rechaza líneas sin descripción o cantidad cero", () => {
    const r = validarParaGenerar({
      ...baseValido,
      lineas: [linea({ descripcion: "", cantidad: 0 })],
    });
    expect(r).toContain("Todas las líneas necesitan descripción.");
    expect(r).toContain("Las cantidades deben ser mayores que cero.");
  });

  it("rechaza documento vacío", () => {
    const r = validarParaGenerar({ ...baseValido, lineas: [] });
    expect(r).toContain("Añade al menos una línea.");
  });

  it("rechaza precio_unit negativo", () => {
    const r = validarParaGenerar({
      ...baseValido,
      lineas: [linea({ descripcion: "X", cantidad: 1, precio_unit: -10 })],
    });
    expect(r).toContain("Los precios unitarios no pueden ser negativos.");
  });

  it("rechaza IVA fuera de [0,100]", () => {
    const r1 = validarParaGenerar({
      ...baseValido,
      lineas: [linea({ descripcion: "X", iva_pct: -5 })],
    });
    expect(r1).toContain("El IVA debe estar entre 0 % y 100 %.");

    const r2 = validarParaGenerar({
      ...baseValido,
      lineas: [linea({ descripcion: "X", iva_pct: 200 })],
    });
    expect(r2).toContain("El IVA debe estar entre 0 % y 100 %.");
  });

  it("rechaza descuento fuera de [0,100]", () => {
    const r = validarParaGenerar({
      ...baseValido,
      lineas: [linea({ descripcion: "X", descuento_pct: 150 })],
    });
    expect(r).toContain("El descuento debe estar entre 0 % y 100 %.");
  });
});

describe("buildMailtoUrl", () => {
  const base = {
    tipo: "factura" as const,
    referencia: "F2026-0001",
    emisorNombre: "Mi Negocio SL",
    clienteNombre: "Alex",
    total: 121,
  };

  it("usa el email cuando es válido", async () => {
    const { buildMailtoUrl } = await import("@/lib/documentos");
    const url = buildMailtoUrl({ ...base, clienteEmail: "alex@example.com" });
    expect(url.startsWith("mailto:alex%40example.com?")).toBe(true);
    expect(url).toContain("subject=");
    expect(url).toContain("body=");
  });

  it("deja el destinatario vacío si el email no es válido", async () => {
    const { buildMailtoUrl } = await import("@/lib/documentos");
    const url = buildMailtoUrl({ ...base, clienteEmail: "no-es-un-email" });
    expect(url.startsWith("mailto:?")).toBe(true);
  });

  it("bloquea header injection con CRLF en el email", async () => {
    const { buildMailtoUrl } = await import("@/lib/documentos");
    // Intento de inyectar Bcc adicional via salto de línea.
    const malicioso = "victim@a.com\r\nBcc: attacker@evil.com";
    const url = buildMailtoUrl({ ...base, clienteEmail: malicioso });
    // El email contiene espacios/CRLF → no pasa la regex → destinatario vacío.
    expect(url.startsWith("mailto:?")).toBe(true);
    expect(url).not.toContain("attacker");
    expect(url).not.toContain("Bcc");
  });

  it("bloquea header injection con &cc= en el email", async () => {
    const { buildMailtoUrl } = await import("@/lib/documentos");
    const malicioso = "victim@a.com&cc=attacker@evil.com";
    const url = buildMailtoUrl({ ...base, clienteEmail: malicioso });
    // El & no rompe la regex pero `encodeURIComponent` lo escapa.
    // O bien es rechazado por la regex (no contiene caracteres prohibidos en el email),
    // o bien se codifica como %26 y &cc= no se interpreta literalmente.
    expect(url).not.toMatch(/[?&]cc=attacker/i);
  });

  it("escapa caracteres especiales del nombre del cliente en el body", async () => {
    const { buildMailtoUrl } = await import("@/lib/documentos");
    const url = buildMailtoUrl({
      ...base,
      clienteEmail: "a@b.com",
      clienteNombre: "Alex & Co\n<script>",
    });
    // < > y los saltos de línea van codificados en el body.
    expect(url).toContain("body=");
    expect(url).not.toContain("<script>");
  });

  it("trata null/undefined de email como destinatario vacío", async () => {
    const { buildMailtoUrl } = await import("@/lib/documentos");
    const a = buildMailtoUrl({ ...base, clienteEmail: null });
    const b = buildMailtoUrl({ ...base, clienteEmail: undefined });
    expect(a.startsWith("mailto:?")).toBe(true);
    expect(b.startsWith("mailto:?")).toBe(true);
  });
});
