import { describe, expect, it } from "vitest";
import { parseSpanishReceipt } from "@/lib/ocr/parser";

describe("parseSpanishReceipt — fechas", () => {
  it("parsea formato dd/mm/yyyy", () => {
    const r = parseSpanishReceipt("Fecha: 03/05/2026");
    expect(r.fecha).toBe("2026-05-03");
  });

  it("parsea formato dd-mm-yy y normaliza siglo", () => {
    const r = parseSpanishReceipt("Emitido 03-05-26");
    expect(r.fecha).toBe("2026-05-03");
  });

  it("parsea dd.mm.yyyy con un dígito de día", () => {
    const r = parseSpanishReceipt("3.5.2026");
    expect(r.fecha).toBe("2026-05-03");
  });

  it("año 99 se interpreta como 1999", () => {
    const r = parseSpanishReceipt("01/01/99");
    expect(r.fecha).toBe("1999-01-01");
  });

  it("devuelve null si no hay fecha", () => {
    const r = parseSpanishReceipt("ticket sin fecha aquí");
    expect(r.fecha).toBeNull();
  });
});

describe("parseSpanishReceipt — CIF / NIF", () => {
  it("detecta CIF empresarial (B + 7 dígitos + control)", () => {
    const r = parseSpanishReceipt("CIF: B12345678");
    expect(r.cif).toBe("B12345678");
  });

  it("detecta NIF (8 dígitos + letra)", () => {
    const r = parseSpanishReceipt("NIF 12345678Z del cliente");
    expect(r.cif).toBe("12345678Z");
  });

  it("detecta NIE (X/Y/Z + 7 dígitos + letra)", () => {
    const r = parseSpanishReceipt("NIE X1234567L");
    expect(r.cif).toBe("X1234567L");
  });

  it("normaliza a mayúsculas", () => {
    const r = parseSpanishReceipt("cif: b12345678");
    expect(r.cif).toBe("B12345678");
  });

  it("devuelve null si no hay identificador fiscal", () => {
    const r = parseSpanishReceipt("ticket de café 1,20€");
    expect(r.cif).toBeNull();
  });
});

describe("parseSpanishReceipt — importes", () => {
  it("extrae base, IVA y total cuando vienen explícitos", () => {
    const texto = `
      BASE IMPONIBLE   100,00
      IVA 21%           21,00
      TOTAL            121,00
    `;
    const r = parseSpanishReceipt(texto);
    expect(r.base).toBe(100);
    expect(r.iva_porcentaje).toBe(21);
    expect(r.iva_importe).toBe(21);
    expect(r.total).toBe(121);
  });

  it("calcula base e IVA si solo hay total + porcentaje", () => {
    const texto = `
      Producto X
      IVA (10%)
      TOTAL 11,00
    `;
    const r = parseSpanishReceipt(texto);
    expect(r.iva_porcentaje).toBe(10);
    expect(r.total).toBe(11);
    expect(r.base).toBe(10);
    expect(r.iva_importe).toBe(1);
  });

  it("acepta separador miles con punto y decimales con coma", () => {
    const texto = `
      BASE IMPONIBLE 1.234,56
      IVA 21%        259,26
      TOTAL          1.493,82
    `;
    const r = parseSpanishReceipt(texto);
    expect(r.base).toBe(1234.56);
    expect(r.total).toBe(1493.82);
  });

  it("interpreta '1.00' como 1, no como 100 (decimales con punto)", () => {
    const texto = `
      BASE IMPONIBLE 1.00
      IVA 21% 0.21
      TOTAL 1.21
    `;
    const r = parseSpanishReceipt(texto);
    expect(r.base).toBe(1);
    expect(r.total).toBe(1.21);
  });

  it("'1,00' y '1.00' producen el mismo valor numérico", () => {
    const a = parseSpanishReceipt("TOTAL 1,00");
    const b = parseSpanishReceipt("TOTAL 1.00");
    expect(a.total).toBe(1);
    expect(b.total).toBe(1);
  });

  it("acepta formato US: miles con coma, decimales con punto", () => {
    const texto = `
      BASE IMPONIBLE 12,345.67
      TOTAL 14,938.20
    `;
    const r = parseSpanishReceipt(texto);
    expect(r.base).toBe(12345.67);
    expect(r.total).toBe(14938.2);
  });


  it("confianza > 0 cuando se detectaron los campos", () => {
    const r = parseSpanishReceipt("BASE IMPONIBLE 50,00\nIVA 21% 10,50\nTOTAL 60,50");
    expect(r.confianza.base).toBeGreaterThan(0);
    expect(r.confianza.iva).toBeGreaterThan(0);
  });

  it("confianza 0 cuando no hay nada", () => {
    const r = parseSpanishReceipt("texto basura sin importes");
    expect(r.confianza.base).toBe(0);
    expect(r.confianza.iva).toBe(0);
    expect(r.base).toBeNull();
    expect(r.iva_porcentaje).toBeNull();
  });
});
