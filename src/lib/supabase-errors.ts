/**
 * Traduce errores de Supabase / Postgres / PostgREST a mensajes legibles
 * en español para el usuario final. Pure function: usable desde client y
 * server. Nunca expone stack ni mensajes técnicos crudos.
 *
 * Códigos cubiertos:
 *  · Postgres SQLSTATE — 23505, 23503, 23502, 23514, 22P02, 22001, 40P01
 *  · PostgREST          — PGRST116 (not found), PGRST301 (JWT inválido)
 *  · RLS                — 42501 (insufficient_privilege)
 *  · Auth Supabase      — "Invalid login credentials", "Email rate limit", etc.
 *  · Storage            — "Payload too large", "mime type not supported"
 */

type UnknownError =
  | { code?: string; message?: string; details?: string; hint?: string; name?: string; status?: number }
  | Error
  | string
  | null
  | undefined;

const POSTGRES_MESSAGES: Record<string, string> = {
  "23505": "Ya existe un registro con esos datos.",
  "23503": "No se puede borrar: hay elementos vinculados a este registro.",
  "23502": "Falta un campo obligatorio.",
  "23514": "Los datos introducidos no cumplen una validación.",
  "22P02": "Formato de dato inválido.",
  "22001": "Uno de los textos es demasiado largo.",
  "40P01": "Conflicto al guardar. Vuelve a intentarlo.",
  "42501": "No tienes permisos para realizar esta acción.",
};

const POSTGREST_MESSAGES: Record<string, string> = {
  PGRST116: "No se ha encontrado el elemento solicitado.",
  PGRST301: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  PGRST204: "No tienes acceso a este recurso.",
};

const AUTH_MESSAGES: Array<{ match: RegExp; text: string }> = [
  { match: /invalid login credentials/i, text: "Email o contraseña incorrectos." },
  { match: /email not confirmed/i, text: "Confirma tu email antes de iniciar sesión." },
  { match: /user already registered|already been registered/i, text: "Ya existe una cuenta con ese email." },
  { match: /password should be at least/i, text: "La contraseña debe tener al menos 8 caracteres." },
  { match: /email rate limit/i, text: "Demasiados intentos. Espera unos minutos antes de volver a intentarlo." },
  { match: /signup is disabled|signups not allowed/i, text: "El registro de nuevas cuentas está desactivado." },
  { match: /jwt expired|token has expired/i, text: "Tu sesión ha caducado. Vuelve a iniciar sesión." },
  { match: /jwt|invalid token/i, text: "Sesión inválida. Vuelve a iniciar sesión." },
];

const STORAGE_MESSAGES: Array<{ match: RegExp; text: string }> = [
  { match: /payload too large|file size|exceeded.*size/i, text: "El archivo es demasiado grande." },
  { match: /mime type|not supported|content type/i, text: "Formato de archivo no soportado." },
  { match: /bucket not found/i, text: "No se encontró el almacenamiento. Contacta con soporte." },
  { match: /duplicate.*object|already exists/i, text: "Ya existe un archivo con ese nombre." },
];

const NETWORK_MESSAGES: Array<{ match: RegExp; text: string }> = [
  { match: /failed to fetch|network ?error|networkrequestfailed/i, text: "Sin conexión con el servidor. Comprueba tu red e inténtalo de nuevo." },
  { match: /timeout|aborted/i, text: "La operación ha tardado demasiado. Inténtalo de nuevo." },
];

/**
 * Devuelve un mensaje en español listo para mostrar al usuario.
 * Nunca devuelve el `message` original sin haberlo mapeado, salvo que sea
 * claramente humano (sin palabras técnicas como "constraint", "violates"…).
 */
export function formatSupabaseError(err: UnknownError, fallback = "No se ha podido completar la operación. Inténtalo de nuevo."): string {
  if (!err) return fallback;
  if (typeof err === "string") return looksTechnical(err) ? fallback : err;

  const code = (err as { code?: string }).code;
  const message = (err as { message?: string }).message ?? "";
  const status = (err as { status?: number }).status;

  // 1) Postgres SQLSTATE
  if (code && POSTGRES_MESSAGES[code]) return POSTGRES_MESSAGES[code];

  // 2) PostgREST
  if (code && POSTGREST_MESSAGES[code]) return POSTGREST_MESSAGES[code];

  // 3) HTTP status (Supabase Auth / Functions)
  if (status === 401 || status === 403) return "No tienes permisos para realizar esta acción.";
  if (status === 404) return "No se ha encontrado el elemento solicitado.";
  if (status === 409) return "Hay un conflicto con un registro existente.";
  if (status === 413) return "El archivo es demasiado grande.";
  if (status === 429) return "Demasiadas peticiones. Espera unos segundos y vuelve a intentarlo.";
  if (status && status >= 500) return "El servidor no responde. Vuelve a intentarlo en unos segundos.";

  // 4) Auth / Storage / Network por patrón en mensaje
  for (const { match, text } of AUTH_MESSAGES)    if (match.test(message)) return text;
  for (const { match, text } of STORAGE_MESSAGES) if (match.test(message)) return text;
  for (const { match, text } of NETWORK_MESSAGES) if (match.test(message)) return text;

  // 5) Último recurso: devolver el mensaje solo si parece humano.
  if (message && !looksTechnical(message)) return message;

  return fallback;
}

function looksTechnical(s: string): boolean {
  // Patrones típicos de error crudo de Postgres/PostgREST/JS que no queremos mostrar.
  return /violates|constraint|relation\s+".*"|column\s+".*"|duplicate key|stack|\bnull value\b|\bat \w+\.\w+\b|\bTypeError\b|\bReferenceError\b|undefined is not|cannot read prop|\bENOTFOUND\b|\bECONNREFUSED\b/i.test(s);
}

/**
 * Helper conveniente: dado un error, devuelve `{ ok: false, message }` para
 * Server Actions, o el mensaje plano para toasts.
 */
export function toUserMessage(err: UnknownError, fallback?: string): string {
  return formatSupabaseError(err, fallback);
}
