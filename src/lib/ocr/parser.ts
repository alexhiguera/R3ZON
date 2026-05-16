/**
 * Parser de tickets/facturas españolas.
 * Recibe texto crudo del OCR y extrae fecha, CIF/NIF, base imponible, IVA y total.
 * Tolerante a ruido (líneas en blanco, OCR confuso) — funciona 100% en navegador.
 */

export type ReceiptData = {
  fecha: string | null; // ISO: YYYY-MM-DD
  cif: string | null;
  base: number | null; // base imponible €
  iva_porcentaje: number | null;
  iva_importe: number | null;
  total: number | null;
  confianza: {
    fecha: number;
    cif: number;
    base: number;
    iva: number;
  };
};

const num = (s: string) => parseFloat(s.replace(/\s/g, "").replace(/\./g, "").replace(",", "."));

export function parseSpanishReceipt(textoCrudo: string): ReceiptData {
  const texto = textoCrudo.replace(/ /g, " ");
  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    fecha: extraerFecha(texto),
    cif: extraerCIF(texto),
    ...extraerImportes(texto, lineas),
  };
}

// ─── FECHA ────────────────────────────────────────────────────────────────────
function extraerFecha(t: string): string | null {
  // dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy (con yy o yyyy)
  const re = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/;
  const m = t.match(re);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) y = (parseInt(y, 10) > 50 ? "19" : "20") + y;
  const dd = d.padStart(2, "0");
  const mm = mo.padStart(2, "0");
  // Validación básica
  const fecha = new Date(`${y}-${mm}-${dd}`);
  if (Number.isNaN(fecha.getTime())) return null;
  return `${y}-${mm}-${dd}`;
}

// ─── CIF / NIF ────────────────────────────────────────────────────────────────
function extraerCIF(t: string): string | null {
  // CIF: letra inicial + 7 dígitos + dígito control (letra o número)
  // NIF: 8 dígitos + letra
  const re = /\b([ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]|\d{8}[A-HJ-NP-TV-Z]|[XYZ]\d{7}[A-HJ-NP-TV-Z])\b/i;
  const m = t.replace(/[\s.-]/g, " ").match(re);
  return m ? m[1].toUpperCase() : null;
}

// ─── IMPORTES ─────────────────────────────────────────────────────────────────
type Importes = Pick<
  ReceiptData,
  "base" | "iva_porcentaje" | "iva_importe" | "total" | "confianza"
>;

function extraerImportes(texto: string, lineas: string[]): Importes {
  const conf = { fecha: 0, cif: 0, base: 0, iva: 0 };

  // Patrón de número con € opcional: 12.345,67 / 12,67 / 12.67
  const NUM = /([0-9]{1,3}(?:[.\s][0-9]{3})*[,.][0-9]{2}|\d+[,.]\d{2})/;

  // TOTAL
  const totalMatch =
    texto.match(
      new RegExp(`(?:TOTAL\\s*A?\\s*PAGAR|TOTAL|IMPORTE\\s+TOTAL)[^0-9]{0,15}${NUM.source}`, "i"),
    ) || texto.match(new RegExp(`${NUM.source}\\s*€?\\s*$`, "im"));
  const total = totalMatch ? num(totalMatch[1] ?? totalMatch[0]) : null;

  // BASE IMPONIBLE
  const baseMatch = texto.match(
    new RegExp(
      `(?:BASE\\s+IMPONIBLE|BASE\\s+IMP\\.?|SUBTOTAL|B\\.I\\.)[^0-9]{0,15}${NUM.source}`,
      "i",
    ),
  );
  let base = baseMatch ? num(baseMatch[1]) : null;

  // IVA: 'IVA 21%  3,15'  o  '21,00%  3,15'
  const ivaPctMatch = texto.match(/(?:IVA|I\.V\.A\.?)\s*\(?\s*(\d{1,2}(?:[,.]\d{1,2})?)\s*%\)?/i);
  const ivaPorcentaje = ivaPctMatch ? num(ivaPctMatch[1]) : null;

  const ivaImpMatch = texto.match(
    new RegExp(`(?:IVA|I\\.V\\.A\\.?|CUOTA\\s*IVA)[^0-9]{0,20}${NUM.source}`, "i"),
  );
  const ivaImporte = ivaImpMatch ? num(ivaImpMatch[1]) : null;

  // Si solo tenemos total + porcentaje → calculamos base e iva
  if (!base && total && ivaPorcentaje) {
    base = +(total / (1 + ivaPorcentaje / 100)).toFixed(2);
  }
  let ivaImpFinal = ivaImporte;
  if (!ivaImpFinal && base && ivaPorcentaje) {
    ivaImpFinal = +((base * ivaPorcentaje) / 100).toFixed(2);
  }

  conf.base = base ? 0.85 : 0;
  conf.iva = ivaPorcentaje ? 0.85 : 0;

  return {
    base,
    iva_porcentaje: ivaPorcentaje,
    iva_importe: ivaImpFinal,
    total,
    confianza: conf,
  };
}
