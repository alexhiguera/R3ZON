/**
 * Traduce los códigos `?google_error=…` que setean connect/callback a
 * mensajes legibles. Pure function: usable desde client y server.
 */
export function formatGoogleError(code: string): string {
  switch (code) {
    case "missing_google_credentials":
      return "Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en el servidor. Configura .env.local y reinicia.";
    case "no_refresh_token":
      return "Google no devolvió refresh_token. Revoca el acceso en myaccount.google.com/permissions y vuelve a conectar.";
    case "invalid_state":
      return "Token de seguridad inválido. Inicia el proceso de conexión de nuevo.";
    case "oauth_cancelled":
    case "access_denied":
      return "Cancelaste el consentimiento de Google. Vuelve a intentarlo si quieres sincronizar.";
    case "token_exchange_failed":
      return "Google rechazó el intercambio de tokens. Comprueba que el redirect URI esté autorizado en la consola de Google.";
    case "persistence_failed":
      return "No se pudieron guardar los tokens. Revisa que app.config_master_key esté definida en la BD.";
    case "network_error":
      return "Error de red al hablar con Google. Inténtalo de nuevo.";
    case "rate_limit":
      return "Google Calendar ha rechazado la sincronización por límite de peticiones. Espera un minuto y vuelve a intentarlo.";
    default:
      return `Error al conectar con Google (${code}).`;
  }
}
