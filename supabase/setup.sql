-- =============================================================================
-- R3ZON Business OS — INSTALACIÓN LIMPIA (wipe + schema + seed)
-- =============================================================================
-- ⚠️  DESTRUCTIVO. Borra TODAS las tablas de dominio y las recrea desde cero
--     en el modelo B2B. Pensado para entornos de desarrollo.
--
-- Pega este archivo entero en el SQL Editor de Supabase Dashboard.
-- Después de ejecutarlo, recuerda registrar al menos 1 usuario para que se
-- cree su perfiles_negocio (gracias al trigger on_auth_user_created); luego
-- ejecuta `seed_clientes.sql` para poblar 10 clientes de prueba.
-- =============================================================================

begin;

-- 1. WIPE — orden inverso de dependencia ------------------------------------
drop table if exists public.tpv_venta_items     cascade;
drop table if exists public.tpv_ventas          cascade;
drop table if exists public.stock_movimientos   cascade;
drop table if exists public.productos           cascade;
drop table if exists public.metodos_pago        cascade;
drop table if exists public.documentos          cascade;
drop table if exists public.fichajes            cascade;
drop table if exists public.agenda_eventos      cascade;
drop table if exists public.google_connections  cascade;
drop table if exists public.comunicaciones      cascade;
drop table if exists public.kanban_columnas     cascade;
drop table if exists public.tareas_kanban       cascade;
drop table if exists public.finanzas            cascade;
drop table if exists public.consentimientos_rgpd cascade;
drop table if exists public.contactos_empresa   cascade;
drop table if exists public.contactos_cliente   cascade;
drop table if exists public.empresas            cascade;
drop table if exists public.clientes            cascade;
drop table if exists public.citas               cascade;
drop table if exists public.config_keys         cascade;
drop table if exists public.dispositivos_conocidos cascade;
drop table if exists public.terminos_versiones  cascade;
drop table if exists public.miembros_negocio    cascade;
drop table if exists public.pagos_stripe        cascade;
-- perfiles_negocio se conserva si ya hay usuarios para no perder la sesión;
-- coméntalo si quieres wipe absoluto:
-- drop table if exists public.perfiles_negocio cascade;

commit;

-- 2. SCHEMA + EXTENSIONES ----------------------------------------------------
-- Orden importante: cada módulo asume las tablas anteriores.
\i schema.sql
\i auth_extension.sql
\i team_ext.sql
\i roles_ext.sql
\i crm_kanban_ext.sql
\i agenda_ext.sql
\i billing_ext.sql
\i documentos_ext.sql
\i metodos_pago_ext.sql
\i inventario_ext.sql
\i fichajes_ext.sql
\i fix_tenant_defaults.sql
\i security_hardening.sql

-- 3. SEED --------------------------------------------------------------------
\i seed_clientes.sql

-- =============================================================================
-- NOTA: si tu cliente SQL no soporta `\i`, ejecuta manualmente cada archivo
--       en este orden:
--   1) schema.sql
--   2) auth_extension.sql
--   3) team_ext.sql
--   4) roles_ext.sql
--   5) crm_kanban_ext.sql
--   6) agenda_ext.sql
--   7) billing_ext.sql
--   8) documentos_ext.sql
--   9) metodos_pago_ext.sql
--  10) inventario_ext.sql
--  11) fichajes_ext.sql
--  12) fix_tenant_defaults.sql
--  13) security_hardening.sql
--  14) seed_clientes.sql
--
-- Opcional (gestión avanzada de retención de logs, ejecutar manualmente
-- cuando proceda y solo si tu plan Supabase soporta pg_cron):
--   - retention_ext.sql
-- =============================================================================
