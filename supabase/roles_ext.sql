-- =============================================================================
-- R3ZON Business OS — Sistema de roles extendido
-- Ejecutar DESPUÉS de team_ext.sql + billing_ext.sql
-- =============================================================================
-- Arquitectura de roles (ver ROLES.md en la raíz del repo):
--
--   1) ADMIN GLOBAL (super admin de la plataforma — soporte/dueño):
--      - Vive en la tabla `admin_global`. Una sola fila por user_id elegible.
--      - Puede inspeccionar todos los negocios desde herramientas internas.
--      - NO se mezcla con la jerarquía de tenant: un admin global no es
--        admin de un negocio salvo que también sea owner o miembro.
--
--   2) OWNER de tenant (perfiles_negocio.user_id):
--      - Implícito en el modelo: el dueño del negocio. No hay row en
--        miembros_negocio. Tiene permisos totales en su tenant.
--
--   3) MIEMBROS de tenant (miembros_negocio):
--      - rol_miembro ∈ {admin, editor, lector}
--      - permisos JSONB: granularidad por recurso/acción que el OWNER del
--        tenant puede ajustar. El rol fija un baseline, los permisos lo
--        SOBRESCRIBEN cuando están presentes.
--
--   4) PLAN de suscripción (perfiles_negocio.plan + subscription_status):
--      - Capa ortogonal: NO añade permisos, sólo limita uso (cuotas).
--      - Vive en el cliente (src/lib/usePlan.ts) y se valida en RPCs críticas.
-- =============================================================================

-- 1. ADMIN GLOBAL -------------------------------------------------------------
create table if not exists public.admin_global (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  motivo      text,
  granted_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.admin_global enable row level security;

-- Sólo otros admin_global pueden leer/escribir admin_global.
drop policy if exists admin_global_self_read on public.admin_global;
create policy admin_global_self_read on public.admin_global
  for select using (
    exists (select 1 from public.admin_global a where a.user_id = auth.uid())
  );

-- Función helper: ¿el usuario actual es admin global?
create or replace function public.es_admin_global()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_global where user_id = auth.uid());
$$;
grant execute on function public.es_admin_global() to authenticated;

-- 2. PERMISOS GRANULARES ------------------------------------------------------
-- Añadimos la columna `permisos jsonb` a miembros_negocio. NULL ⇒ usar
-- baseline del rol (definido más abajo). Si está presente, sobrescribe campo
-- a campo (mezcla en `tiene_permiso`).
alter table public.miembros_negocio
  add column if not exists permisos jsonb;

comment on column public.miembros_negocio.permisos is
  'Overrides granulares: {"clientes":{"write":false}, "finanzas":{"read":true}}. '
  'Si null o vacío, se aplica el baseline del rol.';

-- 3. BASELINE POR ROL ---------------------------------------------------------
-- Devuelve el conjunto de permisos por defecto que aplica un rol.
-- Forma: jsonb { recurso → {read: bool, write: bool, delete: bool} }
create or replace function public.permisos_baseline(p_rol public.rol_miembro)
returns jsonb
language sql immutable as $$
  select case p_rol
    when 'admin' then jsonb_build_object(
      'clientes',       jsonb_build_object('read', true, 'write', true, 'delete', true),
      'finanzas',       jsonb_build_object('read', true, 'write', true, 'delete', true),
      'tareas',         jsonb_build_object('read', true, 'write', true, 'delete', true),
      'citas',          jsonb_build_object('read', true, 'write', true, 'delete', true),
      'documentos',     jsonb_build_object('read', true, 'write', true, 'delete', true),
      'inventario',     jsonb_build_object('read', true, 'write', true, 'delete', true),
      'equipo',         jsonb_build_object('read', true, 'write', true, 'delete', true),
      'ajustes',        jsonb_build_object('read', true, 'write', true, 'delete', false),
      'datos',          jsonb_build_object('read', true, 'write', true, 'delete', false)
    )
    when 'editor' then jsonb_build_object(
      'clientes',       jsonb_build_object('read', true, 'write', true, 'delete', false),
      'finanzas',       jsonb_build_object('read', true, 'write', true, 'delete', false),
      'tareas',         jsonb_build_object('read', true, 'write', true, 'delete', false),
      'citas',          jsonb_build_object('read', true, 'write', true, 'delete', false),
      'documentos',     jsonb_build_object('read', true, 'write', true, 'delete', false),
      'inventario',     jsonb_build_object('read', true, 'write', true, 'delete', false),
      'equipo',         jsonb_build_object('read', true, 'write', false,'delete', false),
      'ajustes',        jsonb_build_object('read', true, 'write', false,'delete', false),
      'datos',          jsonb_build_object('read', true, 'write', false,'delete', false)
    )
    when 'lector' then jsonb_build_object(
      'clientes',       jsonb_build_object('read', true, 'write', false,'delete', false),
      'finanzas',       jsonb_build_object('read', true, 'write', false,'delete', false),
      'tareas',         jsonb_build_object('read', true, 'write', false,'delete', false),
      'citas',          jsonb_build_object('read', true, 'write', false,'delete', false),
      'documentos',     jsonb_build_object('read', true, 'write', false,'delete', false),
      'inventario',     jsonb_build_object('read', true, 'write', false,'delete', false),
      'equipo',         jsonb_build_object('read', true, 'write', false,'delete', false),
      'ajustes',        jsonb_build_object('read', true, 'write', false,'delete', false),
      'datos',          jsonb_build_object('read', false,'write', false,'delete', false)
    )
  end;
$$;

-- 4. CHEQUEO DE PERMISO -------------------------------------------------------
-- Devuelve true si el usuario actual tiene `p_accion` sobre `p_recurso` en
-- el negocio implícito por la sesión (resolvemos vía `current_negocio_id`).
-- Reglas:
--   - Admin global: true siempre.
--   - Owner del negocio (perfiles_negocio.user_id = auth.uid()): true siempre.
--   - Miembro activo: baseline del rol + overrides en permisos JSONB.
create or replace function public.tiene_permiso(
  p_recurso text,
  p_accion  text  -- 'read' | 'write' | 'delete'
) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_neg uuid;
  v_row public.miembros_negocio%rowtype;
  v_perm jsonb;
  v_ov   jsonb;
  v_val  boolean;
begin
  if v_uid is null then return false; end if;
  if public.es_admin_global() then return true; end if;

  -- ¿es owner?
  select id into v_neg from public.perfiles_negocio
   where user_id = v_uid limit 1;
  if v_neg is not null then return true; end if;

  -- ¿es miembro activo?
  select * into v_row from public.miembros_negocio
   where user_id = v_uid and estado = 'activo' limit 1;
  if v_row.id is null then return false; end if;

  v_perm := public.permisos_baseline(v_row.rol);
  v_ov   := coalesce(v_row.permisos, '{}'::jsonb);

  -- Override punto-fino: permisos.recurso.accion gana sobre baseline.
  v_val := coalesce(
    (v_ov   -> p_recurso ->> p_accion)::boolean,
    (v_perm -> p_recurso ->> p_accion)::boolean,
    false
  );
  return v_val;
end $$;
grant execute on function public.tiene_permiso(text, text) to authenticated;

-- 5. VISTA: permisos efectivos del usuario actual -----------------------------
-- Útil para que la UI cachee de un solo viaje todos los flags relevantes.
create or replace view public.v_permisos_actuales as
select
  auth.uid()                                  as user_id,
  case
    when public.es_admin_global() then 'admin_global'
    when exists (select 1 from public.perfiles_negocio p where p.user_id = auth.uid()) then 'owner'
    when exists (select 1 from public.miembros_negocio m where m.user_id = auth.uid() and m.estado = 'activo') then 'miembro'
    else 'anon'
  end                                         as nivel,
  coalesce(
    (select m.rol::text from public.miembros_negocio m
      where m.user_id = auth.uid() and m.estado = 'activo' limit 1),
    case when exists (select 1 from public.perfiles_negocio p where p.user_id = auth.uid())
         then 'admin' else null end
  )                                           as rol,
  case
    when public.es_admin_global() then null
    when exists (select 1 from public.perfiles_negocio p where p.user_id = auth.uid())
      then public.permisos_baseline('admin')
    else
      (select coalesce(m.permisos, public.permisos_baseline(m.rol))
         from public.miembros_negocio m
        where m.user_id = auth.uid() and m.estado = 'activo' limit 1)
  end                                         as permisos;

grant select on public.v_permisos_actuales to authenticated;

-- 6. ACTUALIZAR vista de equipo para incluir permisos -------------------------
-- (Compat: añadimos `permisos` al final; consumidores existentes no se rompen.)
create or replace view public.v_equipo_negocio as
  select
    p.user_id                                  as user_id,
    coalesce(u.email, p.email_contacto)        as email,
    coalesce(u.raw_user_meta_data->>'full_name', 'Titular') as nombre,
    'admin'::text                              as rol,
    'activo'::text                             as estado,
    true                                       as es_owner,
    p.created_at                               as invited_at,
    p.created_at                               as accepted_at,
    p.id                                       as negocio_id,
    null::uuid                                 as miembro_id,
    null::jsonb                                as permisos
  from public.perfiles_negocio p
  left join auth.users u on u.id = p.user_id
  where p.user_id = auth.uid()
  union all
  select
    m.user_id, m.email, m.nombre, m.rol::text, m.estado::text,
    false, m.invited_at, m.accepted_at, m.negocio_id, m.id, m.permisos
  from public.miembros_negocio m
  where exists (
    select 1 from public.perfiles_negocio p
     where p.id = m.negocio_id and p.user_id = auth.uid()
  );

grant select on public.v_equipo_negocio to authenticated;
