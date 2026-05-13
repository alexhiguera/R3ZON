-- =============================================================================
-- R3ZON Business OS — Hardening adicional: comparación timing-safe de tokens
-- =============================================================================
-- Sustituye la comparación `channel_token = p_channel_token` (texto, short-circuit
-- byte-a-byte) por una comparación de digest SHA-256 de longitud fija (32 bytes),
-- mitigando timing attacks contra el token del webhook de Google Calendar.
--
-- La función mantiene la misma firma y semántica: si el token no coincide,
-- no devuelve filas. Se ejecuta con SECURITY DEFINER porque el webhook llama
-- con service-role sin sesión de usuario.
--
-- Idempotente. Ejecutable cuantas veces se quiera.
-- Aplicar DESPUÉS de agenda_ext.sql.
-- =============================================================================

create extension if not exists pgcrypto;

create or replace function public.find_connection_by_channel(
  p_channel_id    text,
  p_channel_token text
) returns table (user_id uuid, negocio_id uuid)
language sql security definer set search_path = public as $$
  select user_id, negocio_id
    from public.google_connections
   where channel_id = p_channel_id
     -- Comparación de digests de longitud fija (32 bytes) → constante en tiempo.
     and digest(coalesce(channel_token, ''), 'sha256')
       = digest(coalesce(p_channel_token, ''), 'sha256')
     and (channel_expiration is null or channel_expiration > now())
   limit 1;
$$;

-- Re-aplicar restricciones de EXECUTE (en caso de reset de privilegios).
revoke all on function public.find_connection_by_channel(text, text) from public, anon, authenticated;
grant execute on function public.find_connection_by_channel(text, text) to service_role;
