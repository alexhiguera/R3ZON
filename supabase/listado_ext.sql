-- =============================================================================
-- R3ZON Business OS — Extensión Listado (Productos + Stock unificados)
-- =============================================================================
-- Añade el flag `stock_mode_enabled` a `perfiles_negocio` para que cada negocio
-- pueda desactivar el modo stock (oculta movimientos / etiquetas de inventario).
-- Idempotente.
-- =============================================================================

alter table public.perfiles_negocio
  add column if not exists stock_mode_enabled boolean not null default true;
