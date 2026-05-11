// Utilidades de formato y fechas. Determinísticas, sin red.
// Punto único de verdad — no reimplementar `eur`, `round*` ni helpers de
// fecha en otros archivos.

// ── Moneda ────────────────────────────────────────────────────────────────────

export const eur = (n: number): string =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

// ── Redondeo ──────────────────────────────────────────────────────────────────

export const round2 = (n: number): number => Math.round(n * 100) / 100;
export const round3 = (n: number): number => Math.round(n * 1000) / 1000;

// ── Fechas ────────────────────────────────────────────────────────────────────

/** Devuelve la fecha de hoy en formato `YYYY-MM-DD` (zona local). */
export const hoyISO = (): string => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

/** Devuelve la fecha de hoy + N días en formato `YYYY-MM-DD`. */
export const hoyMas = (dias: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

/** "11 may 26" — para chips/resúmenes compactos. */
export const formatearFechaCorta = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
};

/** "11 de mayo de 2026" — para cabeceras de documentos formales. */
export const formatearFechaLarga = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};
