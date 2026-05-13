/**
 * Traduce errores de Stripe (Stripe.errors.* o JSON de la API) a mensajes
 * legibles en español para el usuario final. Pure function.
 */

type StripeLike = {
  type?: string;
  code?: string;
  decline_code?: string;
  message?: string;
};

const CODE_MESSAGES: Record<string, string> = {
  card_declined: "Tu banco ha rechazado la tarjeta. Prueba con otra o contacta con tu banco.",
  expired_card: "La tarjeta está caducada.",
  incorrect_cvc: "El CVC no es correcto.",
  incorrect_number: "El número de tarjeta no es correcto.",
  insufficient_funds: "Fondos insuficientes en la tarjeta.",
  invalid_cvc: "CVC inválido.",
  invalid_expiry_month: "Mes de caducidad inválido.",
  invalid_expiry_year: "Año de caducidad inválido.",
  invalid_number: "Número de tarjeta inválido.",
  processing_error: "Error al procesar el pago. Inténtalo de nuevo en unos minutos.",
  rate_limit: "Demasiadas peticiones a la pasarela de pago. Espera unos segundos.",
  authentication_required: "Tu banco pide autenticación adicional. Vuelve a intentarlo.",
};

const DECLINE_MESSAGES: Record<string, string> = {
  generic_decline: "Tu banco ha rechazado la operación.",
  do_not_honor: "Tu banco ha rechazado la operación. Contacta con ellos.",
  fraudulent: "La tarjeta ha sido marcada como fraudulenta.",
  lost_card: "La tarjeta está marcada como perdida.",
  stolen_card: "La tarjeta está marcada como robada.",
  pickup_card: "La tarjeta ha sido retenida por el banco.",
  expired_card: "La tarjeta está caducada.",
  insufficient_funds: "Fondos insuficientes.",
};

const TYPE_MESSAGES: Record<string, string> = {
  StripeCardError: "Hubo un problema con la tarjeta.",
  StripeInvalidRequestError: "La petición a Stripe no es válida.",
  StripeAPIError: "Stripe no responde. Inténtalo en unos minutos.",
  StripeConnectionError: "No se pudo conectar con Stripe. Comprueba tu red.",
  StripeAuthenticationError: "Configuración de Stripe inválida. Contacta con soporte.",
  StripeRateLimitError: "Demasiadas peticiones. Espera unos segundos.",
};

export function formatStripeError(err: unknown, fallback = "No se ha podido procesar el pago. Inténtalo de nuevo."): string {
  if (!err) return fallback;
  const e = err as StripeLike;

  if (e.decline_code && DECLINE_MESSAGES[e.decline_code]) return DECLINE_MESSAGES[e.decline_code];
  if (e.code && CODE_MESSAGES[e.code]) return CODE_MESSAGES[e.code];
  if (e.type && TYPE_MESSAGES[e.type]) return TYPE_MESSAGES[e.type];

  // Solo devolvemos el `message` si es razonablemente legible.
  if (e.message && e.message.length < 160 && !/\bat \w+\.\w+\b/.test(e.message)) return e.message;
  return fallback;
}
