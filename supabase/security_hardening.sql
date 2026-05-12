-- =============================================================================
-- R3ZON Business OS — Endurecimiento de seguridad
-- =============================================================================
-- Resuelve los 8 ERRORES detectados por el Database Linter de Supabase:
--   1) RLS habilitada en tablas archivo (fichajes/stock/tpv) con políticas de
--      lectura por tenant.
--   2) Vistas `v_fichaje_estado_actual`, `v_consentimientos_negocio` y
--      `v_equipo_negocio` recreadas con `security_invoker = on` para que
--      respeten la RLS del rol que las consulta.
--   3) `v_equipo_negocio` ya no hace JOIN a `auth.users` (evita el lint
--      `auth_users_exposed`). El email del titular se toma de
--      `perfiles_negocio.email_contacto`.
--
-- Idempotente. Ejecutable cuantas veces se quiera.
-- =============================================================================

-- 1) RLS en tablas archivo --------------------------------------------------
alter table public.fichajes_archivo            enable row level security;
alter table public.stock_movimientos_archivo   enable row level security;
alter table public.tpv_ventas_archivo          enable row level security;
alter table public.tpv_venta_items_archivo     enable row level security;

drop policy if exists fichajes_archivo_select on public.fichajes_archivo;
create policy fichajes_archivo_select on public.fichajes_archivo
  for select using ( negocio_id = public.current_negocio_id() );

drop policy if exists stock_mov_archivo_select on public.stock_movimientos_archivo;
create policy stock_mov_archivo_select on public.stock_movimientos_archivo
  for select using ( negocio_id = public.current_negocio_id() );

drop policy if exists tpv_ventas_archivo_select on public.tpv_ventas_archivo;
create policy tpv_ventas_archivo_select on public.tpv_ventas_archivo
  for select using ( negocio_id = public.current_negocio_id() );

drop policy if exists tpv_venta_items_archivo_select on public.tpv_venta_items_archivo;
create policy tpv_venta_items_archivo_select on public.tpv_venta_items_archivo
  for select using ( negocio_id = public.current_negocio_id() );

-- 2) Vistas con security_invoker -------------------------------------------
drop view if exists public.v_fichaje_estado_actual;
create view public.v_fichaje_estado_actual
  with (security_invoker = on)
as
  select distinct on (user_id) user_id,
    negocio_id,
    tipo as ultimo_tipo,
    ts   as ultimo_ts,
    id   as ultimo_id
   from public.fichajes
  order by user_id, ts desc;

drop view if exists public.v_consentimientos_negocio;
create view public.v_consentimientos_negocio
  with (security_invoker = on)
as
  select distinct on (negocio_id, tipo) id,
    negocio_id,
    tipo,
    texto_version,
    aceptado,
    fecha,
    ip,
    user_agent,
    revocado_en,
    aceptado and revocado_en is null as vigente
   from public.consentimientos_rgpd
  where cliente_id is null
  order by negocio_id, tipo, fecha desc;

-- v_equipo_negocio: sin JOIN a auth.users y con security_invoker
drop view if exists public.v_equipo_negocio;
create view public.v_equipo_negocio
  with (security_invoker = on)
as
  select p.user_id,
    p.email_contacto::text as email,
    'Titular'::text        as nombre,
    'admin'::text          as rol,
    'activo'::text         as estado,
    true                   as es_owner,
    p.created_at           as invited_at,
    p.created_at           as accepted_at,
    p.id                   as negocio_id,
    null::uuid             as miembro_id
   from public.perfiles_negocio p
  where p.user_id = auth.uid()
  union all
  select m.user_id,
    m.email,
    m.nombre,
    m.rol::text   as rol,
    m.estado::text as estado,
    false         as es_owner,
    m.invited_at,
    m.accepted_at,
    m.negocio_id,
    m.id          as miembro_id
   from public.miembros_negocio m
  where exists (
      select 1 from public.perfiles_negocio p
       where p.id = m.negocio_id and p.user_id = auth.uid()
  );

grant select on public.v_fichaje_estado_actual   to authenticated;
grant select on public.v_consentimientos_negocio to authenticated;
grant select on public.v_equipo_negocio          to authenticated;
