-- =============================================================================
-- R3ZON Business OS — Módulo Agenda + Sincronización Google Calendar
-- =============================================================================
-- · agenda_eventos     → eventos del calendario interno (sync con Google).
-- · google_connections → tokens OAuth (access + refresh) por usuario, cifrados
--                         con la misma master key (pgp_sym_*) que config_keys.
-- =============================================================================

-- 1. AGENDA_EVENTOS ----------------------------------------------------------
create table if not exists public.agenda_eventos (
  id              uuid primary key default uuid_generate_v4(),
  negocio_id      uuid not null references public.perfiles_negocio(id) on delete cascade,
  cliente_id      uuid references public.clientes(id) on delete set null,

  title           text not null,
  description     text,
  start_time      timestamptz not null,
  end_time        timestamptz not null,

  -- ID del evento en Google Calendar; permite upsert idempotente.
  google_event_id text,
  -- Calendario de Google del que proviene (por defecto 'primary').
  google_calendar_id text default 'primary',
  -- ETag/hash de Google para detectar cambios remotos.
  google_etag     text,
  -- Última sincronización exitosa con Google.
  last_synced_at  timestamptz,

  color           text,
  ubicacion       text,
  estado          text not null default 'confirmada',  -- confirmada | tentativa | cancelada

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  check (end_time > start_time),
  check (estado in ('confirmada','tentativa','cancelada'))
);

create index if not exists idx_agenda_negocio_inicio
  on public.agenda_eventos(negocio_id, start_time);
create index if not exists idx_agenda_cliente
  on public.agenda_eventos(cliente_id);

-- Un mismo google_event_id no puede duplicarse dentro de un negocio.
create unique index if not exists uq_agenda_google_event
  on public.agenda_eventos(negocio_id, google_event_id)
  where google_event_id is not null;

-- 2. GOOGLE_CONNECTIONS ------------------------------------------------------
-- Tokens OAuth por usuario. Se cifran con app.config_master_key (pgcrypto).
create table if not exists public.google_connections (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null unique references auth.users(id) on delete cascade,
  negocio_id            uuid not null references public.perfiles_negocio(id) on delete cascade,

  google_account_email  text,
  scope                 text,

  access_token_cifrado  bytea not null,
  refresh_token_cifrado bytea not null,
  expires_at            timestamptz not null,

  -- Token de sincronización incremental de Google (nextSyncToken).
  sync_token            text,
  last_full_sync_at     timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists idx_google_negocio on public.google_connections(negocio_id);

-- Funciones SECURITY DEFINER para guardar/leer tokens cifrados sin exponer
-- la master key al cliente.
create or replace function public.set_google_tokens(
  p_access_token  text,
  p_refresh_token text,
  p_expires_at    timestamptz,
  p_email         text default null,
  p_scope         text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid := public.current_negocio_id();
  v_user    uuid := auth.uid();
  v_master  text := current_setting('app.config_master_key', true);
  v_id      uuid;
begin
  if v_user    is null then raise exception 'No auth user'; end if;
  if v_negocio is null then raise exception 'No tenant';     end if;
  if v_master  is null then raise exception 'Master key not configured'; end if;

  insert into public.google_connections (
    user_id, negocio_id, google_account_email, scope,
    access_token_cifrado, refresh_token_cifrado, expires_at
  ) values (
    v_user, v_negocio, p_email, p_scope,
    pgp_sym_encrypt(p_access_token,  v_master),
    pgp_sym_encrypt(p_refresh_token, v_master),
    p_expires_at
  )
  on conflict (user_id) do update
    set access_token_cifrado  = excluded.access_token_cifrado,
        refresh_token_cifrado = excluded.refresh_token_cifrado,
        expires_at            = excluded.expires_at,
        google_account_email  = coalesce(excluded.google_account_email, google_connections.google_account_email),
        scope                 = coalesce(excluded.scope, google_connections.scope),
        updated_at            = now()
  returning id into v_id;
  return v_id;
end $$;

-- Refresca solo el access_token (tras un 401 + refresh).
create or replace function public.update_google_access_token(
  p_access_token text,
  p_expires_at   timestamptz
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_user   uuid := auth.uid();
  v_master text := current_setting('app.config_master_key', true);
begin
  if v_user is null or v_master is null then return; end if;
  update public.google_connections
     set access_token_cifrado = pgp_sym_encrypt(p_access_token, v_master),
         expires_at           = p_expires_at,
         updated_at           = now()
   where user_id = v_user;
end $$;

-- Devuelve los tokens descifrados del usuario actual (sólo SECURITY DEFINER).
create or replace function public.get_google_tokens()
returns table (
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  sync_token    text,
  email         text
) language plpgsql security definer set search_path = public as $$
declare
  v_user   uuid := auth.uid();
  v_master text := current_setting('app.config_master_key', true);
begin
  if v_user is null or v_master is null then return; end if;
  return query
    select pgp_sym_decrypt(access_token_cifrado,  v_master)::text,
           pgp_sym_decrypt(refresh_token_cifrado, v_master)::text,
           expires_at,
           sync_token,
           google_account_email
      from public.google_connections
     where user_id = v_user
     limit 1;
end $$;

create or replace function public.set_google_sync_token(p_sync_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.google_connections
     set sync_token        = p_sync_token,
         last_full_sync_at = now(),
         updated_at        = now()
   where user_id = auth.uid();
end $$;

-- 3. updated_at triggers -----------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['agenda_eventos','google_connections'] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.tg_set_updated_at();', t, t);
  end loop;
end $$;

-- 4. ROW LEVEL SECURITY ------------------------------------------------------
alter table public.agenda_eventos     enable row level security;
alter table public.google_connections enable row level security;

drop policy if exists tenant_isolation on public.agenda_eventos;
create policy tenant_isolation on public.agenda_eventos
  for all
  using      (negocio_id = public.current_negocio_id())
  with check (negocio_id = public.current_negocio_id());

-- google_connections: 1 fila por usuario; sólo el propio usuario accede.
drop policy if exists google_owner on public.google_connections;
create policy google_owner on public.google_connections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
