-- =============================================================================
-- R3ZON Business OS — Retirada de la integración n8n
-- =============================================================================
-- · `clientes.webhook_url` y `clientes.webhook_activo`: columnas usadas solo por
--   la antigua pestaña «Automatización» (n8n / Make). La funcionalidad se elimina.
-- · `config_keys` para servicio = 'n8n': credenciales cifradas obsoletas.
-- · `comunicaciones.tipo = 'webhook_fire'`: registros de prueba del antiguo
--   panel de automatización; se conservan los datos históricos pero la UI ya
--   no genera nuevos eventos de ese tipo.
-- Idempotente.
-- =============================================================================

begin;

alter table public.clientes drop column if exists webhook_url;
alter table public.clientes drop column if exists webhook_activo;

delete from public.config_keys where servicio = 'n8n';

commit;
