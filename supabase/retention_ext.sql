-- =============================================================================
-- R3ZON Business OS — Funciones de retención y archivado (OPCIONAL)
-- =============================================================================
-- NO incluido en setup.sql. Ejecutar manualmente solo cuando proceda.
--
-- Crea tablas espejo `*_archivo` y funciones que mueven filas antiguas
-- desde las tablas-log más voraces. Sin scheduling: invoca las funciones
-- a mano, o desde pg_cron si tu plan Supabase lo permite (Pro+).
--
-- Uso típico (manual, una vez al mes):
--   select public.archive_fichajes_antiguos(48);              -- fichajes >4 años
--   select public.archive_stock_movimientos_antiguos(24);     -- stock >2 años
--   select public.archive_tpv_ventas_cerradas(24);            -- ventas cerradas >2 años
--
-- Uso con pg_cron (plan Pro+):
--   select cron.schedule('archive_fichajes', '0 3 1 * *',
--                        $$select public.archive_fichajes_antiguos(48)$$);
--
-- Importante: los datos archivados pierden RLS (las tablas archivo no la
-- tienen). Solo accesibles vía service_role o consultas administrativas.
-- =============================================================================

-- 1. Tablas archivo (creadas vacías con la misma estructura) ------------------

create table if not exists public.fichajes_archivo (like public.fichajes including all);
create table if not exists public.stock_movimientos_archivo (like public.stock_movimientos including all);
create table if not exists public.tpv_ventas_archivo (like public.tpv_ventas including all);
create table if not exists public.tpv_venta_items_archivo (like public.tpv_venta_items including all);

-- 2. Funciones de archivado --------------------------------------------------

create or replace function public.archive_fichajes_antiguos(p_meses int default 48)
returns int language plpgsql as $$
declare v_count int;
begin
  with movidos as (
    delete from public.fichajes
     where ts < now() - make_interval(months => p_meses)
     returning *
  )
  insert into public.fichajes_archivo select * from movidos;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

comment on function public.archive_fichajes_antiguos(int) is
  'Mueve fichajes con ts más antiguo de N meses a fichajes_archivo. RD-ley 8/2019 exige conservar 4 años (default 48 meses).';

create or replace function public.archive_stock_movimientos_antiguos(p_meses int default 24)
returns int language plpgsql as $$
declare v_count int;
begin
  with movidos as (
    delete from public.stock_movimientos
     where ts < now() - make_interval(months => p_meses)
     returning *
  )
  insert into public.stock_movimientos_archivo select * from movidos;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

comment on function public.archive_stock_movimientos_antiguos(int) is
  'Mueve movimientos de stock con ts más antiguo de N meses a archivo (default 24).';

create or replace function public.archive_tpv_ventas_cerradas(p_meses int default 24)
returns int language plpgsql as $$
declare v_count int;
begin
  -- Items primero (FK a venta_id)
  with items_movidos as (
    delete from public.tpv_venta_items i
     using public.tpv_ventas v
     where i.venta_id = v.id
       and v.estado = 'cerrada'
       and v.cerrada_at < now() - make_interval(months => p_meses)
     returning i.*
  )
  insert into public.tpv_venta_items_archivo select * from items_movidos;

  with ventas_movidas as (
    delete from public.tpv_ventas
     where estado = 'cerrada'
       and cerrada_at < now() - make_interval(months => p_meses)
     returning *
  )
  insert into public.tpv_ventas_archivo select * from ventas_movidas;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

comment on function public.archive_tpv_ventas_cerradas(int) is
  'Mueve ventas TPV cerradas más antiguas de N meses a archivo (default 24). Items archivados primero por FK.';
