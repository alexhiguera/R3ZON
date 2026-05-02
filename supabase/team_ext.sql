-- =============================================================================
-- R3ZON Business OS — Extensión Equipo (multi-usuario por negocio)
-- Ejecutar DESPUÉS de schema.sql + auth_extension.sql
-- =============================================================================
-- Modelo:
--   · Cada `perfiles_negocio` tiene 1 OWNER (perfiles_negocio.user_id) que es
--     siempre admin implícito.
--   · `miembros_negocio` añade trabajadores adicionales con su propio rol.
--   · El invitado recibe email vía supabase.auth.admin.inviteUserByEmail.
--     Hasta que activa su cuenta, `user_id` es NULL y `estado='invitado'`.
--   · Al primer login del invitado, un trigger en auth.users completa el enlace
--     (user_id ← auth.users.id) y registra el consentimiento RGPD del miembro.
-- =============================================================================

-- 1. ENUMs --------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'rol_miembro') then
    create type public.rol_miembro as enum ('admin','editor','lector');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_miembro') then
    create type public.estado_miembro as enum ('invitado','activo','revocado');
  end if;
end $$;

-- 2. TABLA miembros_negocio --------------------------------------------------
create table if not exists public.miembros_negocio (
  id              uuid primary key default uuid_generate_v4(),
  negocio_id      uuid not null references public.perfiles_negocio(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete set null,
  email           text not null,
  nombre          text,
  rol             public.rol_miembro not null default 'lector',
  estado          public.estado_miembro not null default 'invitado',

  -- Auditoría legal: versión de los documentos que el invitado ACEPTARÁ al activar.
  privacidad_version text,
  terminos_version   text,

  invited_by      uuid references auth.users(id) on delete set null,
  invited_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  revoked_at      timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (negocio_id, email)
);
create index if not exists idx_miembros_negocio on public.miembros_negocio(negocio_id);
create index if not exists idx_miembros_user    on public.miembros_negocio(user_id);

-- Trigger updated_at (reutiliza tg_set_updated_at del schema base).
drop trigger if exists set_updated_at on public.miembros_negocio;
create trigger set_updated_at before update on public.miembros_negocio
  for each row execute function public.tg_set_updated_at();

-- 3. RLS ----------------------------------------------------------------------
alter table public.miembros_negocio enable row level security;

-- El OWNER del negocio (perfiles_negocio.user_id) ve y gestiona todo.
drop policy if exists miembros_owner on public.miembros_negocio;
create policy miembros_owner on public.miembros_negocio
  for all
  using (
    exists (
      select 1 from public.perfiles_negocio p
       where p.id = miembros_negocio.negocio_id
         and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.perfiles_negocio p
       where p.id = miembros_negocio.negocio_id
         and p.user_id = auth.uid()
    )
  );

-- El propio miembro puede leer SU fila (para conocer su rol y estado).
drop policy if exists miembros_self_read on public.miembros_negocio;
create policy miembros_self_read on public.miembros_negocio
  for select using (user_id = auth.uid());

-- 4. RPC: aceptar invitación -------------------------------------------------
-- Llamado por el invitado en su primer login. Vincula user_id a la fila pendiente
-- por email y registra los consentimientos RGPD aceptados.
create or replace function public.aceptar_invitacion(
  p_ip         inet default null,
  p_user_agent text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_email   text;
  v_row     public.miembros_negocio%rowtype;
begin
  if v_user_id is null then raise exception 'No auth'; end if;

  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then return null; end if;

  update public.miembros_negocio
     set user_id = v_user_id,
         estado  = 'activo',
         accepted_at = now()
   where email = v_email
     and estado = 'invitado'
     and user_id is null
   returning * into v_row;

  if v_row.id is null then return null; end if;

  -- Registrar consentimientos del miembro (cliente_id NULL = consentimiento del usuario, no de un cliente).
  if v_row.privacidad_version is not null then
    insert into public.consentimientos_rgpd
      (negocio_id, cliente_id, tipo, texto_version, aceptado, ip, user_agent)
    values
      (v_row.negocio_id, null, 'privacidad', v_row.privacidad_version, true, p_ip, p_user_agent);
  end if;
  if v_row.terminos_version is not null then
    insert into public.consentimientos_rgpd
      (negocio_id, cliente_id, tipo, texto_version, aceptado, ip, user_agent)
    values
      (v_row.negocio_id, null, 'terminos', v_row.terminos_version, true, p_ip, p_user_agent);
  end if;

  return v_row.id;
end $$;

-- 5. VISTA: miembros del negocio actual + el OWNER unificado ------------------
-- Útil para que la UI muestre todos los participantes en una sola query.
create or replace view public.v_equipo_negocio as
  -- Owner
  select
    p.user_id              as user_id,
    coalesce(u.email, p.email_contacto) as email,
    coalesce(u.raw_user_meta_data->>'full_name', 'Titular') as nombre,
    'admin'::text          as rol,
    'activo'::text         as estado,
    true                   as es_owner,
    p.created_at           as invited_at,
    p.created_at           as accepted_at,
    p.id                   as negocio_id,
    null::uuid             as miembro_id
  from public.perfiles_negocio p
  left join auth.users u on u.id = p.user_id
  where p.user_id = auth.uid()

  union all

  -- Miembros adicionales del negocio del OWNER
  select
    m.user_id,
    m.email,
    m.nombre,
    m.rol::text,
    m.estado::text,
    false as es_owner,
    m.invited_at,
    m.accepted_at,
    m.negocio_id,
    m.id as miembro_id
  from public.miembros_negocio m
  where exists (
    select 1 from public.perfiles_negocio p
     where p.id = m.negocio_id and p.user_id = auth.uid()
  );

grant select on public.v_equipo_negocio to authenticated;
