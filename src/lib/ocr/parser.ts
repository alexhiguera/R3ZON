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

/**
 * Convierte un número escrito en una factura a `number` sin asumir locale.
 *
 * Antes hacíamos `replace(/\./g, "").replace(",", ".")` — eso asumía formato
 * español (`1.234,56`) y rompía con tickets US (`1.00` → 100). Ahora miramos
 * cuál es el separador que aparece *al final* de la cadena:
 *
 * - Si tras el último `,` o `.` hay exactamente 2 dígitos ⇒ es el separador
 *   decimal. El resto de `.`/`,` son separadores de miles ⇒ se descartan.
 * - Si tras el último separador hay 3 o más dígitos (o ninguno) ⇒ no hay
 *   parte decimal; todos los puntos/comas son separadores de miles.
 *
 * Casos cubiertos:
 *   "1,00"      → 1
 *   "1.00"      → 1            (antes: 100 — el bug)
 *   "12.345,67" → 12345.67     (ES con miles)
 *   "12,345.67" → 12345.67     (US con miles)
 *   "1.000"     → 1000         (ES sin decimales)
 *   "1,000"     → 1000         (US sin decimales)
 */
const num = (s: string): number => {
  const cleaned = s.replace(/\s/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const lastSep = Math.max(lastComma, lastDot);
  if (lastSep === -1) return parseFloat(cleaned);
  const afterSep = cleaned.length - lastSep - 1;
  if (afterSep === 2) {
    const intPart = cleaned.slice(0, lastSep).replace(/[.,]/g, "");
    const decPart = cleaned.slice(lastSep + 1);
    return parseFloat(`${intPart}.${decPart}`);
  }
  return parseFloat(cleaned.replace(/[.,]/g, ""));
};

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

  // Patrón de número con € opcional. Acepta cualquier combinación de separadores
  // de miles (`.`, `,`, espacio) seguidos de coma o punto decimal y 2 dígitos:
  //   12.345,67  (ES)   12,345.67  (US)   1.234   1.00   1,00   12,67
  const NUM = /([0-9]{1,3}(?:[.,\s][0-9]{3})*[.,][0-9]{2}|\d+[.,]\d{2})/;

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
