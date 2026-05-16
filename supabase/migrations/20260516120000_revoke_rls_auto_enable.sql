-- =============================================================================
-- Revocar EXECUTE público sobre rls_auto_enable()
-- =============================================================================
-- `rls_auto_enable` es un event trigger interno que se dispara al crear tablas
-- para habilitar RLS automáticamente. PostgreSQL lo invoca por sí solo (los
-- event triggers no requieren EXECUTE sobre la función), pero por defecto
-- queda EXPUESTO vía `/rest/v1/rpc/rls_auto_enable` accesible incluso al
-- rol `anon` (sin login). El advisor de Supabase lo flaggea (lint 0028).
--
-- Tras este REVOKE el event trigger sigue funcionando con normalidad pero
-- nadie puede llamarlo manualmente desde el cliente.

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
