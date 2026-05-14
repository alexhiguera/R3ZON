-- =============================================================================
-- R3ZON Business OS — Security fixes (Supabase Database Linter)
-- =============================================================================
-- Resuelve 3 hallazgos:
--   1) auth_users_exposed en v_equipo_negocio: la vista no debe hacer JOIN a
--      auth.users. Se toma el email del titular desde
--      perfiles_negocio.email_contacto y el de los miembros desde
--      miembros_negocio.email.
--   2) security_definer_view en v_fichaje_estado_actual y
--      v_consentimientos_negocio: se recrean con `with (security_invoker = on)`
--      para que respeten la RLS del rol que las consulta.
--
-- Idempotente: re-ejecutable sin efectos colaterales.
-- =============================================================================

begin;

-- 1) v_fichaje_estado_actual --------------------------------------------------
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

-- 2) v_consentimientos_negocio -----------------------------------------------
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

-- 3) v_equipo_negocio: sin JOIN a auth.users, con security_invoker -----------
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

commit;
