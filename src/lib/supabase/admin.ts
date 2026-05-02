import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con SERVICE_ROLE_KEY. NUNCA importar desde Client Components.
 * Usar sólo en route handlers / server actions para operaciones privilegiadas:
 *   · supabase.auth.admin.inviteUserByEmail(...)
 *   · supabase.auth.admin.deleteUser(...)
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no configurada — necesaria para auth.admin.*"
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
