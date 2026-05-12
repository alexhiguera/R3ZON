/**
 * Parser CSV minimalista: acepta separador "," o ";", maneja comillas dobles
 * y saltos de línea dentro de campos entrecomillados. No depende de librería.
 */
export function parseCSV(texto: string): Record<string, string>[] {
  // Detecta separador heurísticamente.
  const primeraLinea = texto.split(/\r?\n/, 1)[0] ?? "";
  const sep = (primeraLinea.match(/;/g) ?? []).length > (primeraLinea.match(/,/g) ?? []).length ? ";" : ",";
  const filas: string[][] = [];
  let campo = "";
  let fila: string[] = [];
  let dentroComillas = false;
  // BOM
  if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1);
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; }
        else dentroComillas = false;
      } else campo += c;
    } else {
      if (c === '"') dentroComillas = true;
      else if (c === sep) { fila.push(campo); campo = ""; }
      else if (c === "\n") { fila.push(campo); filas.push(fila); fila = []; campo = ""; }
      else if (c === "\r") { /* ignorar */ }
      else campo += c;
    }
  }
  if (campo.length > 0 || fila.length > 0) { fila.push(campo); filas.push(fila); }
  if (filas.length === 0) return [];
  const headers = filas[0].map((h) => h.trim());
  return filas.slice(1).filter((r) => r.length === headers.length && r.some((v) => v !== "")).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = r[idx]; });
    return obj;
  });
}

/** Genera y descarga un CSV desde un array de objetos. */
export function descargarCSV(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v).replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
