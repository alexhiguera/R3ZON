import { NextResponse, type NextRequest } from "next/server";

// Envuelve un route handler para capturar errores no manejados, registrarlos
// en servidor con contexto y devolver un JSON 500 genérico al cliente.
//
// Las rutas siguen devolviendo NextResponse para los errores esperados
// (auth, validación, conflicto, etc.) — esto solo cubre el camino de
// excepción inesperada (red caída, Stripe 5xx, cliente Supabase mal
// configurado…) para que nunca se serialice un stack trace al cliente.
export function withApiHandler(
  name: string,
  handler: (req: NextRequest) => Promise<Response>,
) {
  return async (req: NextRequest): Promise<Response> => {
    try {
      return await handler(req);
    } catch (err) {
      // En producción solo loguear el mensaje — el stack puede contener
      // fragmentos de tokens/secretos en errores de OAuth/Stripe.
      const msg = err instanceof Error ? err.message : String(err);
      if (process.env.NODE_ENV === "production") {
        console.error(`[api:${name}]`, msg);
      } else {
        console.error(`[api:${name}]`, msg, err instanceof Error ? err.stack : undefined);
      }
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
  };
}
