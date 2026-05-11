// Lógica pura del registro de jornada laboral (sin red ni Supabase).
// Todas las funciones son determinísticas para poder cubrirlas con tests.

export type TipoFichaje =
  | "entrada"
  | "inicio_descanso"
  | "fin_descanso"
  | "salida";

export type Fichaje = {
  id: string;
  user_id: string;
  negocio_id: string;
  tipo: TipoFichaje;
  ts: string; // ISO 8601, fijada por el servidor
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy_m: number | null;
  observaciones: string | null;
};

// ── Máquina de estados ────────────────────────────────────────────────────────

const TRANSICIONES: Record<TipoFichaje | "_inicial", TipoFichaje[]> = {
  _inicial:        ["entrada"],
  entrada:         ["inicio_descanso", "salida"],
  inicio_descanso: ["fin_descanso"],
  fin_descanso:    ["inicio_descanso", "salida"],
  salida:          ["entrada"],
};

/** Tipos de fichaje válidos tras el último conocido (null = sin fichajes previos). */
export function siguientesPermitidos(ultimo: TipoFichaje | null): TipoFichaje[] {
  return TRANSICIONES[ultimo ?? "_inicial"];
}

/** Comprueba si la transición de `ultimo` a `nuevo` es válida. */
export function transicionValida(
  ultimo: TipoFichaje | null,
  nuevo: TipoFichaje,
): boolean {
  return siguientesPermitidos(ultimo).includes(nuevo);
}

/** Estado visible del trabajador según su último fichaje. */
export function estadoTrabajador(
  ultimo: TipoFichaje | null,
): "fuera" | "trabajando" | "en_descanso" {
  if (ultimo === null || ultimo === "salida") return "fuera";
  if (ultimo === "inicio_descanso") return "en_descanso";
  return "trabajando";
}

// ── Cálculo de jornada ────────────────────────────────────────────────────────

export type ResumenJornada = {
  trabajado_ms: number;
  descanso_ms: number;
  cerrada: boolean;
  primera_entrada: string | null;
  ultima_salida: string | null;
};

/**
 * Calcula tiempo trabajado y de descanso para una lista de fichajes.
 * Si la jornada no está cerrada, suma hasta `ahora` para mostrar el
 * contador en tiempo real.
 */
export function calcularJornada(
  fichajes: Pick<Fichaje, "tipo" | "ts">[],
  ahora: Date = new Date(),
): ResumenJornada {
  if (fichajes.length === 0) {
    return {
      trabajado_ms: 0,
      descanso_ms: 0,
      cerrada: false,
      primera_entrada: null,
      ultima_salida: null,
    };
  }

  const orden = [...fichajes].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime(),
  );

  let trabajado = 0;
  let descanso = 0;
  let abiertoTrabajo: number | null = null;
  let abiertoDescanso: number | null = null;
  let primera_entrada: string | null = null;
  let ultima_salida: string | null = null;

  for (const f of orden) {
    const t = new Date(f.ts).getTime();

    switch (f.tipo) {
      case "entrada":
        if (primera_entrada === null) primera_entrada = f.ts;
        if (abiertoTrabajo === null && abiertoDescanso === null) {
          abiertoTrabajo = t;
        }
        break;

      case "inicio_descanso":
        if (abiertoTrabajo !== null) {
          trabajado += t - abiertoTrabajo;
          abiertoTrabajo = null;
        }
        if (abiertoDescanso === null) abiertoDescanso = t;
        break;

      case "fin_descanso":
        if (abiertoDescanso !== null) {
          descanso += t - abiertoDescanso;
          abiertoDescanso = null;
        }
        if (abiertoTrabajo === null) abiertoTrabajo = t;
        break;

      case "salida":
        if (abiertoTrabajo !== null) {
          trabajado += t - abiertoTrabajo;
          abiertoTrabajo = null;
        }
        if (abiertoDescanso !== null) {
          descanso += t - abiertoDescanso;
          abiertoDescanso = null;
        }
        ultima_salida = f.ts;
        break;
    }
  }

  const cerrada = abiertoTrabajo === null && abiertoDescanso === null;
  if (!cerrada) {
    const tNow = ahora.getTime();
    if (abiertoTrabajo !== null) trabajado += Math.max(0, tNow - abiertoTrabajo);
    if (abiertoDescanso !== null) descanso += Math.max(0, tNow - abiertoDescanso);
  }

  return { trabajado_ms: trabajado, descanso_ms: descanso, cerrada, primera_entrada, ultima_salida };
}

/** Formatea milisegundos como "Xh YYm". Negativos, NaN o Infinity → "0h 00m". */
export function formatearDuracion(ms: number): string {
  if (!Number.isFinite(ms)) return "0h 00m";
  const safe = Math.max(0, Math.floor(ms / 1000));
  const horas = Math.floor(safe / 3600);
  const minutos = Math.floor((safe % 3600) / 60);
  return `${horas}h ${minutos.toString().padStart(2, "0")}m`;
}

/**
 * Filtra fichajes que caen dentro del día natural de `fecha` (en hora local).
 */
export function fichajesDelDia<T extends { ts: string }>(
  fichajes: T[],
  fecha: Date = new Date(),
): T[] {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);
  return fichajes.filter((f) => {
    const t = new Date(f.ts).getTime();
    return t >= inicio.getTime() && t < fin.getTime();
  });
}

export const ETIQUETA_TIPO: Record<TipoFichaje, string> = {
  entrada:         "Entrada",
  inicio_descanso: "Inicio de descanso",
  fin_descanso:    "Fin de descanso",
  salida:          "Salida",
};
