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
-- perfiles_negocio se conserva si ya hay usuarios para no perder la sesión;
-- coméntalo si quieres wipe absoluto:
-- drop table if exists public.perfiles_negocio cascade;

commit;

-- 2. SCHEMA + EXTENSIONES ----------------------------------------------------
\i schema.sql
\i auth_extension.sql
\i crm_kanban_ext.sql
\i agenda_ext.sql

-- 3. SEED --------------------------------------------------------------------
\i seed_clientes.sql

-- =============================================================================
-- NOTA: si tu cliente SQL no soporta `\i`, ejecuta manualmente cada archivo
--       en este orden:
--   1) schema.sql
--   2) auth_extension.sql
--   3) crm_kanban_ext.sql
--   4) agenda_ext.sql
--   5) seed_clientes.sql
-- =============================================================================
