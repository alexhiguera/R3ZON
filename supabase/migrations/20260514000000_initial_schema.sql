-- =============================================================================
-- R3ZON — Migración inicial consolidada (entorno LOCAL)
-- =============================================================================

-- ============================================================================
-- >>> schema.sql
-- ============================================================================
-- =============================================================================
-- R3ZON Business OS — Esquema base (modelo B2B puro)
-- =============================================================================
-- Tenancy:
--   · auth.users (Supabase Auth) → 1 fila en perfiles_negocio (el "tenant")
--   · Todas las tablas de dominio referencian negocio_id (FK a perfiles_negocio)
--   · RLS aísla cada tenant: solo el dueño puede ver/editar sus filas.
--
-- Modelo de dominio:
--   · clientes           = cuentas B2B (empresas / entidades jurídicas).
--   · contactos_cliente  = personas dentro de un cliente, con jerarquía
--                          (reports_to autorreferencial → organigrama).
--   · citas / tareas_kanban / finanzas → vinculadas opcionalmente a un cliente.
--   · consentimientos_rgpd → consentimientos del titular del negocio o de un
--                            cliente (cliente_id NULLABLE).
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- =============================================================================
-- 1. PERFILES_NEGOCIO  (tenant root)
-- =============================================================================
create table if not exists public.perfiles_negocio (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null unique references auth.users(id) on delete cascade,
  nombre_negocio  text not null,
  cif_nif         text,
  sector          text,
  email_contacto  text,
  telefono        text,
  direccion       text,
  logo_url        text,
  moneda          text not null default 'EUR',
  zona_horaria    text not null default 'Europe/Madrid',
  plan            text not null default 'free',  -- free | pro | enterprise
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_perfiles_user on public.perfiles_negocio(user_id);

-- Helper: devuelve el negocio_id del usuario autenticado.
create or replace function public.current_negocio_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.perfiles_negocio where user_id = auth.uid() limit 1;
$$;

-- =============================================================================
-- 2. CLIENTES  (cuentas B2B — empresas / entidades jurídicas)
-- =============================================================================
create table if not exists public.clientes (
  id                uuid primary key default uuid_generate_v4(),
  negocio_id        uuid not null references public.perfiles_negocio(id) on delete cascade,

  -- Identidad jurídica
  nombre            text not null,            -- razón social / nombre comercial
  cif               text,                     -- CIF / NIF empresarial
  sector            text,
  sitio_web         text,

  -- Contacto principal
  email             text,
  telefono          text,
  direccion         text,
  ciudad            text,
  pais              text default 'España',
  codigo_postal     text,

  -- Datos B2B
  num_empleados     integer,
  facturacion_anual numeric(14,2),
  estado            text not null default 'prospecto',   -- activa | prospecto | inactiva
  notas             text,
  etiquetas         text[] default '{}',
  logo_url          text,

  -- Automatización (n8n / Make)
  webhook_url       text,
  webhook_activo    boolean not null default false,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  check (estado in ('activa','prospecto','inactiva'))
);
create index if not exists idx_clientes_negocio on public.clientes(negocio_id);
create index if not exists idx_clientes_nombre  on public.clientes(negocio_id, nombre);
create index if not exists idx_clientes_email   on public.clientes(negocio_id, email);

-- =============================================================================
-- 3. CONTACTOS_CLIENTE  (personas dentro de cada cliente, organigrama)
-- =============================================================================
create table if not exists public.contactos_cliente (
  id            uuid primary key default uuid_generate_v4(),
  negocio_id    uuid not null references public.perfiles_negocio(id) on delete cascade,
  cliente_id    uuid not null references public.clientes(id)         on delete cascade,

  -- Jerarquía: a quién reporta (mismo cliente_id).
  reports_to    uuid references public.contactos_cliente(id) on delete set null,

  nombre        text not null,
  apellidos     text,
  email         text,
  telefono      text,
  puesto        text,
  departamento text,
  es_decisor    boolean not null default false,
  notas         text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_contactos_cliente on public.contactos_cliente(cliente_id);
create index if not exists idx_contactos_negocio on public.contactos_cliente(negocio_id);
create index if not exists idx_contactos_reports on public.contactos_cliente(reports_to);

alter table public.contactos_cliente
  drop constraint if exists contactos_no_self_report;
alter table public.contactos_cliente
  add constraint contactos_no_self_report check (reports_to is null or reports_to <> id);

-- Trigger: reports_to debe pertenecer al MISMO cliente.
create or replace function public.tg_check_reports_to_same_cliente()
returns trigger language plpgsql as $$
declare v_cliente uuid;
begin
  if new.reports_to is null then return new; end if;
  select cliente_id into v_cliente
    from public.contactos_cliente where id = new.reports_to;
  if v_cliente is null or v_cliente <> new.cliente_id then
    raise exception 'reports_to debe pertenecer al mismo cliente';
  end if;
  return new;
end $$;

drop trigger if exists check_reports_to_same_cliente on public.contactos_cliente;
create trigger check_reports_to_same_cliente
  before insert or update on public.contactos_cliente
  for each row execute function public.tg_check_reports_to_same_cliente();

-- =============================================================================
-- 4. CITAS (calendario / agenda básico)  → ver también agenda_ext.sql
-- =============================================================================
create table if not exists public.citas (
  id             uuid primary key default uuid_generate_v4(),
  negocio_id     uuid not null references public.perfiles_negocio(id) on delete cascade,
  cliente_id     uuid references public.clientes(id) on delete set null,
  titulo         text not null,
  descripcion    text,
  inicio         timestamptz not null,
  fin            timestamptz not null,
  estado         text not null default 'pendiente',  -- pendiente|confirmada|cancelada|completada
  ubicacion      text,
  color          text,
  precio         numeric(10,2),
  recordatorio_min int default 60,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (fin > inicio)
);
create index if not exists idx_citas_negocio_inicio on public.citas(negocio_id, inicio);
create index if not exists idx_citas_cliente on public.citas(cliente_id);

-- =============================================================================
-- 5. TAREAS_KANBAN
-- =============================================================================
create table if not exists public.tareas_kanban (
  id           uuid primary key default uuid_generate_v4(),
  negocio_id   uuid not null references public.perfiles_negocio(id) on delete cascade,
  cliente_id   uuid references public.clientes(id) on delete set null,
  titulo       text not null,
  descripcion  text,
  columna      text not null default 'pendiente',
  prioridad    text not null default 'normal',
  posicion     integer not null default 0,
  fecha_limite timestamptz,
  etiquetas    text[] default '{}',
  completada   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_kanban_negocio_columna on public.tareas_kanban(negocio_id, columna, posicion);

-- =============================================================================
-- 6. FINANZAS
-- =============================================================================
create table if not exists public.finanzas (
  id              uuid primary key default uuid_generate_v4(),
  negocio_id      uuid not null references public.perfiles_negocio(id) on delete cascade,
  cliente_id      uuid references public.clientes(id) on delete set null,

  tipo            text not null,
  concepto        text not null,
  categoria       text,
  fecha           date not null default current_date,

  base_imponible  numeric(12,2) not null,
  iva_porcentaje  numeric(5,2)  not null default 21.00,
  iva_importe     numeric(12,2) generated always as (round(base_imponible * iva_porcentaje / 100, 2)) stored,
  irpf_porcentaje numeric(5,2)  not null default 0.00,
  irpf_importe    numeric(12,2) generated always as (round(base_imponible * irpf_porcentaje / 100, 2)) stored,
  total           numeric(12,2) generated always as (
                    round(base_imponible
                          + (base_imponible * iva_porcentaje  / 100)
                          - (base_imponible * irpf_porcentaje / 100), 2)
                  ) stored,

  numero_factura  text,
  metodo_pago     text,
  estado_pago     text not null default 'pagado',
  archivo_url     text,
  ocr_extraido    jsonb,

  notas           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  check (tipo in ('ingreso','gasto')),
  check (base_imponible >= 0)
);
create index if not exists idx_finanzas_negocio_fecha on public.finanzas(negocio_id, fecha desc);
create index if not exists idx_finanzas_tipo on public.finanzas(negocio_id, tipo);

-- =============================================================================
-- 7. CONSENTIMIENTOS_RGPD
--    cliente_id NULLABLE — los consentimientos del propio titular del negocio
--    (onboarding) se guardan con cliente_id = NULL.
-- =============================================================================
create table if not exists public.consentimientos_rgpd (
  id            uuid primary key default uuid_generate_v4(),
  negocio_id    uuid not null references public.perfiles_negocio(id) on delete cascade,
  cliente_id    uuid references public.clientes(id) on delete cascade,
  tipo          text not null,
  texto_version text not null,
  aceptado      boolean not null,
  fecha         timestamptz not null default now(),
  ip            inet,
  user_agent    text,
  firma_url     text,
  revocado_en   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_rgpd_cliente on public.consentimientos_rgpd(cliente_id);
create index if not exists idx_rgpd_negocio on public.consentimientos_rgpd(negocio_id);

-- =============================================================================
-- 8. CONFIG_KEYS (API keys cifradas con pgcrypto)
-- =============================================================================
create table if not exists public.config_keys (
  id           uuid primary key default uuid_generate_v4(),
  negocio_id   uuid not null references public.perfiles_negocio(id) on delete cascade,
  servicio     text not null,
  alias        text,
  valor_cifrado bytea not null,
  metadata     jsonb default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (negocio_id, servicio, alias)
);
create index if not exists idx_config_negocio on public.config_keys(negocio_id);

create or replace function public.set_config_key(
  p_servicio text, p_alias text, p_valor text, p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid := public.current_negocio_id();
  v_master  text := current_setting('app.config_master_key', true);
  v_id      uuid;
begin
  if v_negocio is null then raise exception 'No tenant'; end if;
  if v_master  is null then raise exception 'Master key not configured'; end if;

  insert into public.config_keys (negocio_id, servicio, alias, valor_cifrado, metadata)
  values (v_negocio, p_servicio, p_alias, pgp_sym_encrypt(p_valor, v_master), p_metadata)
  on conflict (negocio_id, servicio, alias) do update
    set valor_cifrado = excluded.valor_cifrado,
        metadata      = excluded.metadata,
        updated_at    = now()
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.get_config_key(p_servicio text, p_alias text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid := public.current_negocio_id();
  v_master  text := current_setting('app.config_master_key', true);
  v_cifrado bytea;
begin
  if v_negocio is null or v_master is null then return null; end if;
  select valor_cifrado into v_cifrado
    from public.config_keys
   where negocio_id = v_negocio and servicio = p_servicio
     and (alias = p_alias or (alias is null and p_alias is null))
   limit 1;
  if v_cifrado is null then return null; end if;
  return pgp_sym_decrypt(v_cifrado, v_master);
end $$;

-- =============================================================================
-- 9. TRIGGER updated_at
-- =============================================================================
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'perfiles_negocio','clientes','contactos_cliente',
    'citas','tareas_kanban','finanzas','config_keys'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.tg_set_updated_at();', t, t);
  end loop;
end $$;

-- =============================================================================
-- 10. ROW LEVEL SECURITY
-- =============================================================================
alter table public.perfiles_negocio     enable row level security;
alter table public.clientes             enable row level security;
alter table public.contactos_cliente    enable row level security;
alter table public.citas                enable row level security;
alter table public.tareas_kanban        enable row level security;
alter table public.finanzas             enable row level security;
alter table public.consentimientos_rgpd enable row level security;
alter table public.config_keys          enable row level security;

drop policy if exists perfiles_owner on public.perfiles_negocio;
create policy perfiles_owner on public.perfiles_negocio
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array[
    'clientes','contactos_cliente','citas','tareas_kanban',
    'finanzas','consentimientos_rgpd','config_keys'
  ] loop
    execute format('drop policy if exists tenant_isolation on public.%I;', t);
    execute format(
      'create policy tenant_isolation on public.%I
         for all
         using      (negocio_id = public.current_negocio_id())
         with check (negocio_id = public.current_negocio_id());', t);
  end loop;
end $$;

-- =============================================================================
-- 11. BOOTSTRAP: crear perfil_negocio al registrarse
-- =============================================================================
create or replace function public.tg_create_perfil_on_signup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles_negocio (user_id, nombre_negocio, email_contacto)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre_negocio','Mi negocio'), new.email)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_create_perfil_on_signup();

-- ============================================================================
-- >>> auth_extension.sql
-- ============================================================================
-- =============================================================================
-- R3ZON Business OS — Extensión Auth / RGPD / Devices
-- Ejecutar DESPUÉS de schema.sql
-- =============================================================================

-- 1. VERSIONES DE TÉRMINOS LEGALES (control de versionado RGPD/LOPDGDD)
create table if not exists public.terminos_versiones (
  id           uuid primary key default uuid_generate_v4(),
  documento    text not null,                   -- 'privacidad'|'cookies'|'terminos'|'aviso_legal'
  version      text not null,                   -- '2026-04-28' o 'v1.0'
  url          text,
  contenido_md text,                            -- snapshot del contenido legal
  vigente_desde timestamptz not null default now(),
  unique (documento, version)
);

insert into public.terminos_versiones (documento, version, url) values
  ('privacidad',  '2026-04-28', '/legal/privacidad'),
  ('cookies',     '2026-04-28', '/legal/cookies'),
  ('terminos',    '2026-04-28', '/legal/terminos'),
  ('aviso_legal', '2026-04-28', '/legal/aviso-legal')
on conflict do nothing;

-- 2. DISPOSITIVOS CONOCIDOS (para notificar nuevo inicio de sesión)
create table if not exists public.dispositivos_conocidos (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  device_hash    text not null,                 -- SHA-256 de UA + plataforma + zona horaria
  device_name    text,                          -- 'Chrome en macOS' (humano)
  ip             inet,
  user_agent     text,
  pais           text,
  primer_login   timestamptz not null default now(),
  ultimo_login   timestamptz not null default now(),
  notificado     boolean not null default false,
  unique (user_id, device_hash)
);
create index if not exists idx_devices_user on public.dispositivos_conocidos(user_id);

alter table public.dispositivos_conocidos enable row level security;
drop policy if exists devices_owner on public.dispositivos_conocidos;
create policy devices_owner on public.dispositivos_conocidos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3. ESTADO DE ONBOARDING en perfiles_negocio
alter table public.perfiles_negocio
  add column if not exists onboarding_completado boolean not null default false,
  add column if not exists onboarding_completado_en timestamptz;

-- 4. RPC: registrar consentimientos RGPD durante onboarding
-- Acepta un array de documentos { tipo, version }
create or replace function public.registrar_onboarding(
  p_consentimientos jsonb,    -- [{tipo:'privacidad',version:'2026-04-28',aceptado:true}, ...]
  p_ip inet default null,
  p_user_agent text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_negocio   uuid := public.current_negocio_id();
  v_doc       jsonb;
  v_required  text[] := array['terminos','privacidad','cookies'];
  v_tipo      text;
  v_aceptado  boolean;
begin
  if v_negocio is null then raise exception 'No tenant'; end if;

  -- Defensa server-side: las casillas obligatorias del RGPD/LOPDGDD deben
  -- estar marcadas como aceptadas. Si alguien intenta llamar a la RPC
  -- saltándose la UI, abortamos en transacción para que no se complete el
  -- onboarding.
  foreach v_tipo in array v_required loop
    select coalesce((d->>'aceptado')::boolean, false)
      into v_aceptado
      from jsonb_array_elements(p_consentimientos) d
     where d->>'tipo' = v_tipo
     limit 1;
    if v_aceptado is null or v_aceptado = false then
      raise exception 'Consentimiento obligatorio % no aceptado', v_tipo
        using errcode = 'check_violation';
    end if;
  end loop;

  -- Modelo B2B: el consentimiento del propio titular del negocio se guarda
  -- con cliente_id = NULL (la columna es nullable en consentimientos_rgpd).
  for v_doc in select * from jsonb_array_elements(p_consentimientos) loop
    insert into public.consentimientos_rgpd (
      negocio_id, cliente_id, tipo, texto_version, aceptado, ip, user_agent
    ) values (
      v_negocio, null,
      v_doc->>'tipo',
      v_doc->>'version',
      coalesce((v_doc->>'aceptado')::boolean, false),
      p_ip, p_user_agent
    );
  end loop;

  update public.perfiles_negocio
     set onboarding_completado = true,
         onboarding_completado_en = now()
   where id = v_negocio;

  return v_negocio;
end $$;

-- 5. RPC: registrar dispositivo y devolver si es NUEVO
create or replace function public.registrar_dispositivo(
  p_device_hash text,
  p_device_name text default null,
  p_user_agent  text default null,
  p_ip          inet default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_existe boolean;
begin
  select exists(
    select 1 from public.dispositivos_conocidos
     where user_id = auth.uid() and device_hash = p_device_hash
  ) into v_existe;

  if v_existe then
    update public.dispositivos_conocidos
       set ultimo_login = now()
     where user_id = auth.uid() and device_hash = p_device_hash;
    return false;          -- conocido
  else
    insert into public.dispositivos_conocidos
      (user_id, device_hash, device_name, user_agent, ip, notificado)
    values (auth.uid(), p_device_hash, p_device_name, p_user_agent, p_ip, false);
    return true;           -- NUEVO → la Edge Function debe enviar email
  end if;
end $$;

-- ============================================================================
-- >>> team_ext.sql
-- ============================================================================
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

-- ============================================================================
-- >>> roles_ext.sql
-- ============================================================================
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

-- ============================================================================
-- >>> crm_kanban_ext.sql
-- ============================================================================
-- =============================================================================
-- R3ZON Business OS — Extensión CRM + Kanban
-- Ejecutar después de schema.sql y auth_extension.sql
-- =============================================================================

-- 1. COMUNICACIONES (historial de contacto por cliente)
create table if not exists public.comunicaciones (
  id          uuid primary key default uuid_generate_v4(),
  negocio_id  uuid not null references public.perfiles_negocio(id) on delete cascade,
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  tipo        text not null, -- nota|email_click|whatsapp_click|webhook_fire|llamada|cita
  asunto      text,
  contenido   text,
  metadata    jsonb default '{}',   -- url, status_code, etc.
  leido       boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_com_cliente   on public.comunicaciones(cliente_id);
create index if not exists idx_com_negocio   on public.comunicaciones(negocio_id, created_at desc);

alter table public.comunicaciones enable row level security;
drop policy if exists tenant_isolation on public.comunicaciones;
create policy tenant_isolation on public.comunicaciones
  for all using      (negocio_id = public.current_negocio_id())
  with check         (negocio_id = public.current_negocio_id());

-- 2. KANBAN_COLUMNAS (columnas personalizadas por negocio)
-- (Las columnas webhook_url / webhook_activo de clientes ya están en schema.sql)
create table if not exists public.kanban_columnas (
  id         uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references public.perfiles_negocio(id) on delete cascade,
  nombre     text not null,
  slug       text not null,   -- identificador estable usado en tareas_kanban.columna
  color      text not null default '#818cf8',
  posicion   integer not null default 0,
  created_at timestamptz not null default now(),
  unique (negocio_id, slug)
);
create index if not exists idx_columnas_negocio on public.kanban_columnas(negocio_id, posicion);

alter table public.kanban_columnas enable row level security;
drop policy if exists tenant_isolation on public.kanban_columnas;
create policy tenant_isolation on public.kanban_columnas
  for all using      (negocio_id = public.current_negocio_id())
  with check         (negocio_id = public.current_negocio_id());

-- Columnas por defecto al crear un negocio
create or replace function public.tg_seed_kanban_columnas()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.kanban_columnas (negocio_id, nombre, slug, color, posicion) values
    (new.id, 'Pendiente',    'pendiente',    '#818cf8', 0),
    (new.id, 'En curso',     'en_curso',     '#22d3ee', 1),
    (new.id, 'Revisión',     'revision',     '#fb923c', 2),
    (new.id, 'Completado',   'hecho',        '#34d399', 3)
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists seed_kanban on public.perfiles_negocio;
create trigger seed_kanban
  after insert on public.perfiles_negocio
  for each row execute function public.tg_seed_kanban_columnas();

-- 4. Añadir columna_id a tareas_kanban (mantenemos columna text para compatibilidad)
alter table public.tareas_kanban
  add column if not exists columna_id uuid references public.kanban_columnas(id) on delete set null;

-- 5. RPC: Reordenar tareas tras drag & drop
create or replace function public.reordenar_tarea(
  p_tarea_id   uuid,
  p_columna    text,
  p_posicion   integer
) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.tareas_kanban
     set columna = p_columna, posicion = p_posicion, updated_at = now()
   where id = p_tarea_id
     and negocio_id = public.current_negocio_id();
end $$;

-- 6. RPC: Batch — reordenar varias tareas en una sola llamada.
-- Cada item: { id: uuid, columna: text, posicion: int }
create or replace function public.reordenar_tareas_batch(p_updates jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  rec jsonb;
begin
  for rec in select * from jsonb_array_elements(p_updates) loop
    update public.tareas_kanban
       set columna    = rec->>'columna',
           posicion   = (rec->>'posicion')::int,
           updated_at = now()
     where id = (rec->>'id')::uuid
       and negocio_id = public.current_negocio_id();
  end loop;
end $$;

-- 7. RPC: Batch — reordenar columnas tras drag & drop horizontal.
-- Cada item: { id: uuid, posicion: int }
create or replace function public.reordenar_columnas_batch(p_updates jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  rec jsonb;
begin
  for rec in select * from jsonb_array_elements(p_updates) loop
    update public.kanban_columnas
       set posicion = (rec->>'posicion')::int
     where id = (rec->>'id')::uuid
       and negocio_id = public.current_negocio_id();
  end loop;
end $$;

-- ============================================================================
-- >>> agenda_ext.sql
-- ============================================================================
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

-- =============================================================================
-- 5. WATCH CHANNEL — push notifications de Google Calendar
-- =============================================================================
-- Google Calendar permite registrar un canal HTTP (events.watch) que avisa
-- a una URL nuestra cuando hay cambios. La canal expira (~7 días máx) y se
-- identifica por (channel_id, resource_id). Nosotros generamos además un
-- channel_token aleatorio que validamos en el webhook para evitar spoofing.
alter table public.google_connections
  add column if not exists channel_id          text,
  add column if not exists channel_token       text,
  add column if not exists channel_resource_id text,
  add column if not exists channel_expiration  timestamptz;

create unique index if not exists uq_google_channel_id
  on public.google_connections(channel_id)
  where channel_id is not null;

-- RPC del usuario: persiste los datos del canal recién creado.
create or replace function public.set_google_watch_channel(
  p_channel_id          text,
  p_channel_token       text,
  p_channel_resource_id text,
  p_channel_expiration  timestamptz
) returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'No auth user'; end if;
  update public.google_connections
     set channel_id          = p_channel_id,
         channel_token       = p_channel_token,
         channel_resource_id = p_channel_resource_id,
         channel_expiration  = p_channel_expiration,
         updated_at          = now()
   where user_id = v_user;
end $$;

-- Limpia los datos del canal (al desconectar o detenerlo manualmente).
create or replace function public.clear_google_watch_channel()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.google_connections
     set channel_id          = null,
         channel_token       = null,
         channel_resource_id = null,
         channel_expiration  = null,
         updated_at          = now()
   where user_id = auth.uid();
end $$;

-- =============================================================================
-- 6. RPCs ADMIN — sólo callable con cliente service-role (en el webhook).
-- =============================================================================
-- Mapean (channel_id, channel_token) → user_id sin exponer tokens. La SECURITY
-- DEFINER es necesaria porque el handler del webhook no autentica como usuario,
-- usa la service-role key. Validamos el token en el WHERE: si no coincide,
-- la consulta no devuelve filas (ataque mitigado).
create or replace function public.find_connection_by_channel(
  p_channel_id    text,
  p_channel_token text
) returns table (user_id uuid, negocio_id uuid)
language sql security definer set search_path = public, extensions as $$
  select user_id, negocio_id
    from public.google_connections
   where channel_id    = p_channel_id
     and channel_token = p_channel_token
     and (channel_expiration is null or channel_expiration > now())
   limit 1;
$$;

-- Lectura de tokens descifrados por user_id explícito. Sólo callable con
-- service-role (porque saltamos la RLS del cliente normal). Necesario para
-- que el webhook ejecute el sync en nombre del usuario sin tener su sesión.
create or replace function public.get_google_tokens_admin(p_user_id uuid)
returns table (
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  sync_token    text,
  email         text,
  negocio_id    uuid
) language plpgsql security definer set search_path = public as $$
declare
  v_master text := current_setting('app.config_master_key', true);
begin
  if v_master is null then return; end if;
  return query
    select pgp_sym_decrypt(access_token_cifrado,  v_master)::text,
           pgp_sym_decrypt(refresh_token_cifrado, v_master)::text,
           expires_at,
           sync_token,
           google_account_email,
           negocio_id
      from public.google_connections
     where user_id = p_user_id
     limit 1;
end $$;

-- Actualiza el access_token tras un refresh, identificando por user_id.
-- Variante "admin" de update_google_access_token sin auth.uid() requirement.
create or replace function public.update_google_access_token_admin(
  p_user_id      uuid,
  p_access_token text,
  p_expires_at   timestamptz
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_master text := current_setting('app.config_master_key', true);
begin
  if v_master is null then return; end if;
  update public.google_connections
     set access_token_cifrado = pgp_sym_encrypt(p_access_token, v_master),
         expires_at           = p_expires_at,
         updated_at           = now()
   where user_id = p_user_id;
end $$;

-- Persistir sync_token por user_id (admin variant).
create or replace function public.set_google_sync_token_admin(
  p_user_id    uuid,
  p_sync_token text
) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.google_connections
     set sync_token        = p_sync_token,
         last_full_sync_at = now(),
         updated_at        = now()
   where user_id = p_user_id;
end $$;

-- Restringir EXECUTE de las RPCs admin a service_role para que un usuario
-- autenticado no pueda invocarlas y exfiltrar tokens de otros tenants.
revoke all on function public.find_connection_by_channel(text, text)            from public, anon, authenticated;
revoke all on function public.get_google_tokens_admin(uuid)                     from public, anon, authenticated;
revoke all on function public.update_google_access_token_admin(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.set_google_sync_token_admin(uuid, text)           from public, anon, authenticated;
grant  execute on function public.find_connection_by_channel(text, text)            to service_role;
grant  execute on function public.get_google_tokens_admin(uuid)                     to service_role;
grant  execute on function public.update_google_access_token_admin(uuid, text, timestamptz) to service_role;
grant  execute on function public.set_google_sync_token_admin(uuid, text)           to service_role;

-- ============================================================================
-- >>> billing_ext.sql
-- ============================================================================
-- =============================================================================
-- R3ZON Business OS — Extensión Facturación / Stripe
-- Ejecutar DESPUÉS de schema.sql
-- =============================================================================
-- Modelo:
--   · Cada `perfiles_negocio` se enlaza con un Stripe Customer.
--   · `pagos_stripe` cachea el historial de cobros (sincronizado por webhook),
--     para mostrar el historial sin llamar a Stripe en cada render.
-- =============================================================================

-- 1. Columnas Stripe en perfiles_negocio -------------------------------------
alter table public.perfiles_negocio
  add column if not exists stripe_customer_id     text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists subscription_status    text,            -- active|trialing|past_due|canceled|...
  add column if not exists subscription_price_id  text,            -- ID del Price activo
  add column if not exists subscription_period_end timestamptz,    -- siguiente renovación
  add column if not exists subscription_cancel_at_period_end boolean not null default false;

-- 2. Tabla pagos_stripe -------------------------------------------------------
create table if not exists public.pagos_stripe (
  id                uuid primary key default uuid_generate_v4(),
  negocio_id        uuid not null references public.perfiles_negocio(id) on delete cascade,

  stripe_invoice_id text unique,                 -- in_…
  stripe_charge_id  text,                        -- ch_…

  amount_cents      integer not null,
  currency          text not null default 'eur',
  status            text not null,               -- paid | open | void | uncollectible | failed
  description       text,
  hosted_invoice_url text,                       -- enlace a la factura HTML de Stripe
  invoice_pdf_url    text,                       -- enlace al PDF de la factura
  paid_at           timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists idx_pagos_negocio on public.pagos_stripe(negocio_id, paid_at desc);

-- 3. RLS ----------------------------------------------------------------------
alter table public.pagos_stripe enable row level security;

drop policy if exists pagos_owner on public.pagos_stripe;
create policy pagos_owner on public.pagos_stripe
  for select using (
    exists (
      select 1 from public.perfiles_negocio p
       where p.id = pagos_stripe.negocio_id
         and p.user_id = auth.uid()
    )
  );

-- Sólo el service role (webhook) inserta/actualiza. No hay policy WITH CHECK
-- para usuarios autenticados — los INSERTs los hace el route handler con la
-- service_role_key, que ignora RLS.

-- ============================================================================
-- >>> metodos_pago_ext.sql
-- ============================================================================
-- =============================================================================
-- R3ZON Business OS — Extensión Métodos de pago guardados
-- Ejecutar DESPUÉS de schema.sql
-- =============================================================================
-- Cada negocio puede guardar varios métodos de pago para reutilizarlos
-- al emitir documentos (transferencia con IBAN, Bizum con número, etc.).
-- =============================================================================

create table if not exists public.metodos_pago (
  id           uuid primary key default uuid_generate_v4(),
  negocio_id   uuid not null references public.perfiles_negocio(id) on delete cascade,

  etiqueta     text not null,                 -- "Transferencia BBVA"
  tipo         text not null default 'otros', -- transferencia|bizum|tarjeta|efectivo|domiciliacion|paypal|otros
  detalle      text,                          -- IBAN, teléfono Bizum, instrucciones…
  predeterminado boolean not null default false,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  check (tipo in ('transferencia','bizum','tarjeta','efectivo','domiciliacion','paypal','otros'))
);

create index if not exists idx_metodos_pago_negocio
  on public.metodos_pago(negocio_id, predeterminado desc, etiqueta);

-- Solo un predeterminado por negocio
create unique index if not exists uq_metodos_pago_default
  on public.metodos_pago(negocio_id) where predeterminado;

drop trigger if exists set_updated_at on public.metodos_pago;
create trigger set_updated_at before update on public.metodos_pago
  for each row execute function public.tg_set_updated_at();

alter table public.metodos_pago enable row level security;

drop policy if exists tenant_isolation on public.metodos_pago;
create policy tenant_isolation on public.metodos_pago
  for all
  using      (negocio_id = public.current_negocio_id())
  with check (negocio_id = public.current_negocio_id());

-- RPC atómica para cambiar el método predeterminado.
-- Antes el cliente hacía 2 UPDATEs separados → ventana sin predeterminado.
create or replace function public.set_metodo_pago_predeterminado(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid := public.current_negocio_id();
begin
  if v_negocio is null then raise exception 'NO_TENANT'; end if;
  -- Verifica pertenencia antes de actuar
  if not exists (
    select 1 from public.metodos_pago
     where id = p_id and negocio_id = v_negocio
  ) then
    raise exception 'METODO_PAGO_NO_ENCONTRADO';
  end if;

  -- Atómico: ambos UPDATE en la misma transacción, con el índice único parcial
  -- garantizando que no se rompe la invariante de un solo predeterminado.
  update public.metodos_pago
     set predeterminado = false
   where negocio_id = v_negocio
     and predeterminado
     and id <> p_id;

  update public.metodos_pago
     set predeterminado = true
   where id = p_id;
end $$;

-- ============================================================================
-- >>> documentos_ext.sql
-- ============================================================================
-- =============================================================================
-- R3ZON Business OS — Extensión Documentos (facturas, tickets, presupuestos…)
-- Ejecutar DESPUÉS de schema.sql
-- =============================================================================
-- Modelo:
--   · Documentos comerciales con numeración por (negocio, tipo, serie, año).
--   · `emisor_snapshot` y `cliente_snapshot` congelan los datos al generar:
--     una factura emitida no debe cambiar si el cliente actualiza su CIF.
--   · Una vez `estado != 'borrador'` el documento es inmutable (trigger).
--   · `lineas` se guarda como JSONB para flexibilidad; los totales son
--     columnas numeric para poder filtrar/sumar sin parsear JSON.
--   · `finanza_id` enlaza opcionalmente con un movimiento de finanzas.
-- =============================================================================

-- 1. Tabla documentos ---------------------------------------------------------
create table if not exists public.documentos (
  id                uuid primary key default uuid_generate_v4(),
  negocio_id        uuid not null references public.perfiles_negocio(id) on delete cascade,
  cliente_id        uuid references public.clientes(id) on delete set null,

  tipo              text not null,               -- factura|ticket|presupuesto|albaran|proforma
  serie             text not null default 'A',
  numero            integer,                     -- secuencial por (negocio,tipo,serie,año)
  anio              integer not null default extract(year from current_date)::int,
  referencia        text generated always as (
                      tipo || '-' || serie || '-' || anio::text || '-' ||
                      lpad(coalesce(numero, 0)::text, 5, '0')
                    ) stored,

  fecha_emision     date not null default current_date,
  fecha_vencimiento date,

  -- Snapshots inmutables (se rellenan al generar)
  emisor_snapshot   jsonb not null default '{}'::jsonb,
  cliente_snapshot  jsonb not null default '{}'::jsonb,

  -- Líneas: [{descripcion, cantidad, precio_unit, descuento_pct, iva_pct}]
  lineas            jsonb not null default '[]'::jsonb,

  -- Totales (calculados en cliente y persistidos)
  subtotal          numeric(12,2) not null default 0,
  descuento_total   numeric(12,2) not null default 0,
  base_imponible    numeric(12,2) not null default 0,
  iva_total         numeric(12,2) not null default 0,
  irpf_pct          numeric(5,2)  not null default 0,
  irpf_total        numeric(12,2) not null default 0,
  total             numeric(12,2) not null default 0,

  estado            text not null default 'borrador', -- borrador|generado|enviado|pagado|anulado
  notas             text,
  condiciones_pago  text,
  metodo_pago       text,

  finanza_id        uuid references public.finanzas(id) on delete set null,
  pdf_url           text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  check (tipo in ('factura','ticket','presupuesto','albaran','proforma')),
  check (estado in ('borrador','generado','enviado','pagado','anulado'))
);

create index if not exists idx_documentos_negocio_fecha
  on public.documentos(negocio_id, fecha_emision desc);
create index if not exists idx_documentos_tipo
  on public.documentos(negocio_id, tipo, anio);
create unique index if not exists uq_documentos_numero
  on public.documentos(negocio_id, tipo, serie, anio, numero)
  where numero is not null;

-- 2. Trigger updated_at + inmutabilidad post-generación ----------------------
drop trigger if exists set_updated_at on public.documentos;
create trigger set_updated_at before update on public.documentos
  for each row execute function public.tg_set_updated_at();

create or replace function public.tg_documentos_inmutable()
returns trigger language plpgsql as $$
begin
  -- Permitido siempre: cambios sólo de estado o pdf_url, finanza_id, notas internas.
  if old.estado <> 'borrador' then
    if new.tipo <> old.tipo
       or new.numero <> old.numero
       or new.serie <> old.serie
       or new.anio <> old.anio
       or new.fecha_emision <> old.fecha_emision
       or new.lineas::text <> old.lineas::text
       or new.emisor_snapshot::text <> old.emisor_snapshot::text
       or new.cliente_snapshot::text <> old.cliente_snapshot::text
       or new.total <> old.total then
      raise exception 'DOCUMENTO_INMUTABLE: % ya fue generado', old.referencia;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists tg_doc_inmutable on public.documentos;
create trigger tg_doc_inmutable before update on public.documentos
  for each row execute function public.tg_documentos_inmutable();

-- 3. RPC: siguiente número atómico --------------------------------------------
-- Devuelve el próximo correlativo para (tipo, serie, año) del negocio actual.
-- Atómico: usa advisory lock por (negocio,tipo,serie,año) para evitar carreras.
create or replace function public.siguiente_numero_documento(
  p_tipo  text,
  p_serie text default 'A',
  p_anio  integer default extract(year from current_date)::int
) returns integer language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid := public.current_negocio_id();
  v_max     integer;
  v_lock    bigint;
begin
  if v_negocio is null then raise exception 'NO_TENANT'; end if;
  if p_tipo not in ('factura','ticket','presupuesto','albaran','proforma') then
    raise exception 'TIPO_INVALIDO: %', p_tipo;
  end if;

  -- Lock estable derivado de los identificadores
  v_lock := hashtextextended(v_negocio::text || p_tipo || p_serie || p_anio::text, 0);
  perform pg_advisory_xact_lock(v_lock);

  select coalesce(max(numero), 0) into v_max
    from public.documentos
   where negocio_id = v_negocio
     and tipo = p_tipo
     and serie = p_serie
     and anio = p_anio;

  return v_max + 1;
end $$;

-- 3b. RPC: crear documento generado (atómico) -------------------------------
-- Reserva el correlativo + INSERT en la misma transacción → cero gaps.
-- Sustituye al patrón "siguiente_numero_documento + INSERT" que dejaba
-- huecos si el INSERT del cliente fallaba (problema normativo).
create or replace function public.crear_documento_generado(
  p_doc           jsonb,
  p_serie         text default 'A',
  p_anio          integer default null
) returns public.documentos
language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid := public.current_negocio_id();
  v_tipo    text := p_doc->>'tipo';
  v_anio    integer := coalesce(
    p_anio,
    extract(year from coalesce((p_doc->>'fecha_emision')::date, current_date))::int
  );
  v_max     integer;
  v_lock    bigint;
  v_doc     public.documentos;
begin
  if v_negocio is null then raise exception 'NO_TENANT'; end if;
  if v_tipo not in ('factura','ticket','presupuesto','albaran','proforma') then
    raise exception 'TIPO_INVALIDO: %', v_tipo;
  end if;

  -- Lock por (negocio, tipo, serie, año) — atómico hasta el COMMIT del INSERT
  v_lock := hashtextextended(v_negocio::text || v_tipo || p_serie || v_anio::text, 0);
  perform pg_advisory_xact_lock(v_lock);

  select coalesce(max(numero), 0) into v_max
    from public.documentos
   where negocio_id = v_negocio
     and tipo = v_tipo
     and serie = p_serie
     and anio = v_anio;

  insert into public.documentos (
    negocio_id, cliente_id, tipo, serie, numero, anio,
    fecha_emision, fecha_vencimiento,
    emisor_snapshot, cliente_snapshot, lineas,
    subtotal, descuento_total, base_imponible,
    iva_total, irpf_pct, irpf_total, total,
    estado, notas, condiciones_pago, metodo_pago
  ) values (
    v_negocio,
    nullif(p_doc->>'cliente_id','')::uuid,
    v_tipo,
    p_serie,
    v_max + 1,
    v_anio,
    coalesce((p_doc->>'fecha_emision')::date, current_date),
    nullif(p_doc->>'fecha_vencimiento','')::date,
    coalesce(p_doc->'emisor_snapshot',  '{}'::jsonb),
    coalesce(p_doc->'cliente_snapshot', '{}'::jsonb),
    coalesce(p_doc->'lineas',           '[]'::jsonb),
    coalesce((p_doc->>'subtotal')::numeric,        0),
    coalesce((p_doc->>'descuento_total')::numeric, 0),
    coalesce((p_doc->>'base_imponible')::numeric,  0),
    coalesce((p_doc->>'iva_total')::numeric,       0),
    coalesce((p_doc->>'irpf_pct')::numeric,        0),
    coalesce((p_doc->>'irpf_total')::numeric,      0),
    coalesce((p_doc->>'total')::numeric,           0),
    'generado',
    nullif(p_doc->>'notas',''),
    nullif(p_doc->>'condiciones_pago',''),
    nullif(p_doc->>'metodo_pago','')
  )
  returning * into v_doc;

  return v_doc;
end $$;

-- 4. RLS ----------------------------------------------------------------------
alter table public.documentos enable row level security;

drop policy if exists tenant_isolation on public.documentos;
create policy tenant_isolation on public.documentos
  for all
  using      (negocio_id = public.current_negocio_id())
  with check (negocio_id = public.current_negocio_id());

-- ─────────────────────────────────────────────────────────────────────────
-- Relación con `finanzas`:
--   `documentos` registra documentos comerciales emitidos POR ti
--   (facturas, tickets, presupuestos…). `finanzas` registra cualquier
--   movimiento monetario (incluyendo gastos de proveedores vía OCR).
--   La integración es opcional: documentos.finanza_id apunta al ingreso
--   creado al pulsar "Añadir a Finanzas" desde el editor de documentos.
--   Mantener separados es intencional: un mismo movimiento de finanzas
--   puede no provenir de un documento emitido (p. ej. gasto OCR).
-- ─────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- >>> documentos_recibo_logos_ext.sql
-- ============================================================================
-- =============================================================================
-- R3ZON Business OS — Iteración: tipo 'recibo' + bucket 'logos'
-- Idempotente. Aplicar con: node scripts/apply-pending-migrations.mjs
-- =============================================================================
-- Cambios:
--   1. Permitir tipo 'recibo' en documentos + RPCs.
--   2. Crear bucket público "logos" para identidad visual del negocio.
-- =============================================================================

-- 1. CHECK constraint de documentos.tipo: añadir 'recibo' ----------------------
alter table public.documentos
  drop constraint if exists documentos_tipo_check;
alter table public.documentos
  add  constraint documentos_tipo_check
  check (tipo in ('factura','ticket','presupuesto','albaran','proforma','recibo'));

-- 2. RPC: siguiente_numero_documento (acepta 'recibo') ------------------------
create or replace function public.siguiente_numero_documento(
  p_tipo  text,
  p_serie text default 'A',
  p_anio  integer default extract(year from current_date)::int
) returns integer language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid := public.current_negocio_id();
  v_max     integer;
  v_lock    bigint;
begin
  if v_negocio is null then raise exception 'NO_TENANT'; end if;
  if p_tipo not in ('factura','ticket','presupuesto','albaran','proforma','recibo') then
    raise exception 'TIPO_INVALIDO: %', p_tipo;
  end if;

  v_lock := hashtextextended(v_negocio::text || p_tipo || p_serie || p_anio::text, 0);
  perform pg_advisory_xact_lock(v_lock);

  select coalesce(max(numero), 0) into v_max
    from public.documentos
   where negocio_id = v_negocio
     and tipo = p_tipo
     and serie = p_serie
     and anio = p_anio;

  return v_max + 1;
end $$;

-- 3. RPC: crear_documento_generado (acepta 'recibo') --------------------------
create or replace function public.crear_documento_generado(
  p_doc           jsonb,
  p_serie         text default 'A',
  p_anio          integer default null
) returns public.documentos
language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid := public.current_negocio_id();
  v_tipo    text := p_doc->>'tipo';
  v_anio    integer := coalesce(
    p_anio,
    extract(year from coalesce((p_doc->>'fecha_emision')::date, current_date))::int
  );
  v_max     integer;
  v_lock    bigint;
  v_doc     public.documentos;
begin
  if v_negocio is null then raise exception 'NO_TENANT'; end if;
  if v_tipo not in ('factura','ticket','presupuesto','albaran','proforma','recibo') then
    raise exception 'TIPO_INVALIDO: %', v_tipo;
  end if;

  v_lock := hashtextextended(v_negocio::text || v_tipo || p_serie || v_anio::text, 0);
  perform pg_advisory_xact_lock(v_lock);

  select coalesce(max(numero), 0) into v_max
    from public.documentos
   where negocio_id = v_negocio
     and tipo = v_tipo
     and serie = p_serie
     and anio = v_anio;

  insert into public.documentos (
    negocio_id, cliente_id, tipo, serie, numero, anio,
    fecha_emision, fecha_vencimiento,
    emisor_snapshot, cliente_snapshot, lineas,
    subtotal, descuento_total, base_imponible,
    iva_total, irpf_pct, irpf_total, total,
    estado, notas, condiciones_pago, metodo_pago
  ) values (
    v_negocio,
    nullif(p_doc->>'cliente_id','')::uuid,
    v_tipo,
    p_serie,
    v_max + 1,
    v_anio,
    coalesce((p_doc->>'fecha_emision')::date, current_date),
    nullif(p_doc->>'fecha_vencimiento','')::date,
    coalesce(p_doc->'emisor_snapshot',  '{}'::jsonb),
    coalesce(p_doc->'cliente_snapshot', '{}'::jsonb),
    coalesce(p_doc->'lineas',           '[]'::jsonb),
    coalesce((p_doc->>'subtotal')::numeric,        0),
    coalesce((p_doc->>'descuento_total')::numeric, 0),
    coalesce((p_doc->>'base_imponible')::numeric,  0),
    coalesce((p_doc->>'iva_total')::numeric,       0),
    coalesce((p_doc->>'irpf_pct')::numeric,        0),
    coalesce((p_doc->>'irpf_total')::numeric,      0),
    coalesce((p_doc->>'total')::numeric,           0),
    'generado',
    nullif(p_doc->>'notas',''),
    nullif(p_doc->>'condiciones_pago',''),
    nullif(p_doc->>'metodo_pago','')
  )
  returning * into v_doc;

  return v_doc;
end $$;

-- 4. Storage bucket 'logos' (público, lectura libre, escritura por dueño) -----
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do update set public = excluded.public;

-- Estructura de paths esperada:  <perfil_negocio_id>/logo-<ts>.<ext>
-- Lectura pública: cualquier usuario autenticado o anónimo puede leer.
drop policy if exists "logos public read" on storage.objects;
create policy "logos public read" on storage.objects
  for select using (bucket_id = 'logos');

-- Escritura: sólo miembros del negocio cuyo id coincide con la primera carpeta.
drop policy if exists "logos write own negocio" on storage.objects;
create policy "logos write own negocio" on storage.objects
  for insert with check (
    bucket_id = 'logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = public.current_negocio_id()::text
  );

drop policy if exists "logos update own negocio" on storage.objects;
create policy "logos update own negocio" on storage.objects
  for update using (
    bucket_id = 'logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = public.current_negocio_id()::text
  );

drop policy if exists "logos delete own negocio" on storage.objects;
create policy "logos delete own negocio" on storage.objects
  for delete using (
    bucket_id = 'logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = public.current_negocio_id()::text
  );

-- ============================================================================
-- >>> inventario_ext.sql
-- ============================================================================
-- =============================================================================
-- R3ZON Business OS — Extensión Productos / Stock / TPV
-- Ejecutar DESPUÉS de schema.sql
-- =============================================================================
-- Modelo:
--   · productos:        catálogo único, sirve a restaurante (con `categoria` y
--                       `color`) y a tienda (con `codigo`/SKU y `stock_tracking`).
--   · stock_movimientos: log inmutable y firmado (cantidad +/-) de todos los
--                       cambios de inventario. La fuente de la verdad.
--   · productos.stock_actual: cache mantenida por trigger sobre movimientos.
--   · tpv_ventas:       ticket en curso ('abierta') o cobrado ('cerrada').
--   · tpv_venta_items:  líneas del ticket (snapshot de precio/IVA/descuento).
--   · cerrar_venta_tpv():RPC atómico que cobra la venta y genera los
--                       movimientos de stock automáticamente.
-- =============================================================================

-- 1. PRODUCTOS ---------------------------------------------------------------
create table if not exists public.productos (
  id              uuid primary key default uuid_generate_v4(),
  negocio_id      uuid not null references public.perfiles_negocio(id) on delete cascade,

  codigo          text,                          -- SKU / barcode
  nombre          text not null,
  descripcion     text,
  categoria       text,
  tipo            text not null default 'producto', -- producto|servicio
  unidad          text not null default 'ud',       -- ud|kg|l|ración|hora…

  precio_venta    numeric(12,2) not null default 0,
  precio_coste    numeric(12,2) not null default 0,
  iva_pct         numeric(5,2)  not null default 21,

  stock_tracking  boolean not null default true,
  stock_actual    numeric(12,3) not null default 0,
  stock_minimo    numeric(12,3) not null default 0,

  imagen_url      text,
  color           text,                            -- hex para botones TPV
  activo          boolean not null default true,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  check (tipo in ('producto','servicio')),
  check (precio_venta >= 0),
  check (precio_coste >= 0)
);

create unique index if not exists uq_productos_codigo
  on public.productos(negocio_id, codigo)
  where codigo is not null;
create index if not exists idx_productos_negocio_activo
  on public.productos(negocio_id, activo);
create index if not exists idx_productos_categoria
  on public.productos(negocio_id, categoria);
-- Cubre la query principal del TPV: WHERE activo = true ORDER BY categoria, nombre
create index if not exists idx_productos_activo_categoria_nombre
  on public.productos(negocio_id, activo, categoria, nombre);

drop trigger if exists set_updated_at on public.productos;
create trigger set_updated_at before update on public.productos
  for each row execute function public.tg_set_updated_at();

-- 2. STOCK_MOVIMIENTOS -------------------------------------------------------
create table if not exists public.stock_movimientos (
  id           uuid primary key default uuid_generate_v4(),
  negocio_id   uuid not null references public.perfiles_negocio(id) on delete cascade,
  -- ON DELETE RESTRICT preserva la auditoría: para retirar un producto del
  -- catálogo márcalo como `activo = false` en lugar de borrarlo.
  producto_id  uuid not null references public.productos(id) on delete restrict,

  tipo         text not null,                    -- entrada|salida|ajuste|venta_tpv|devolucion
  cantidad     numeric(12,3) not null,           -- firmado: + entra, − sale
  motivo       text,
  referencia   text,                              -- venta_id, factura, lote…

  ts           timestamptz not null default now(),
  user_id      uuid references auth.users(id) on delete set null,

  check (tipo in ('entrada','salida','ajuste','venta_tpv','devolucion')),
  check (cantidad <> 0)
);

create index if not exists idx_stock_mov_producto on public.stock_movimientos(producto_id, ts desc);
create index if not exists idx_stock_mov_negocio  on public.stock_movimientos(negocio_id, ts desc);

-- Trigger: actualiza productos.stock_actual al insertar un movimiento.
create or replace function public.tg_aplicar_stock_movimiento()
returns trigger language plpgsql as $$
begin
  update public.productos
     set stock_actual = stock_actual + new.cantidad
   where id = new.producto_id
     and stock_tracking = true;
  return new;
end $$;

drop trigger if exists tg_aplicar_stock on public.stock_movimientos;
create trigger tg_aplicar_stock after insert on public.stock_movimientos
  for each row execute function public.tg_aplicar_stock_movimiento();

-- 3. TPV ---------------------------------------------------------------------
create table if not exists public.tpv_ventas (
  id            uuid primary key default uuid_generate_v4(),
  negocio_id    uuid not null references public.perfiles_negocio(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  cliente_id    uuid references public.clientes(id) on delete set null,

  mesa          text,                             -- opcional (restaurante)
  estado        text not null default 'abierta',  -- abierta|cerrada|anulada
  metodo_pago   text,

  subtotal      numeric(12,2) not null default 0,
  descuento     numeric(12,2) not null default 0,
  iva_total     numeric(12,2) not null default 0,
  total         numeric(12,2) not null default 0,

  notas         text,
  abierta_at    timestamptz not null default now(),
  cerrada_at    timestamptz,

  check (estado in ('abierta','cerrada','anulada'))
);

create index if not exists idx_tpv_ventas_estado on public.tpv_ventas(negocio_id, estado, abierta_at desc);

drop trigger if exists set_updated_at on public.tpv_ventas;
-- (no updated_at en tpv_ventas; usamos cerrada_at)

create table if not exists public.tpv_venta_items (
  id              uuid primary key default uuid_generate_v4(),
  negocio_id      uuid not null references public.perfiles_negocio(id) on delete cascade,
  venta_id        uuid not null references public.tpv_ventas(id) on delete cascade,
  producto_id     uuid not null references public.productos(id) on delete restrict,

  -- Snapshot del producto en el momento de añadirlo al ticket
  nombre          text not null,
  cantidad        numeric(12,3) not null default 1,
  precio_unit     numeric(12,2) not null default 0,
  iva_pct         numeric(5,2)  not null default 21,
  descuento_pct   numeric(5,2)  not null default 0,

  importe_linea   numeric(12,2) generated always as (
                    round(cantidad * precio_unit * (1 - descuento_pct/100), 2)
                  ) stored,

  ts              timestamptz not null default now(),

  check (cantidad > 0),
  check (precio_unit >= 0)
);

create index if not exists idx_tpv_items_venta on public.tpv_venta_items(venta_id);

-- 4. RPC: cerrar venta TPV ---------------------------------------------------
-- Recalcula totales, marca como cerrada y emite stock_movimientos automáticos
-- para cada item cuyo producto tenga stock_tracking=true.
create or replace function public.cerrar_venta_tpv(
  p_venta_id    uuid,
  p_metodo_pago text default 'efectivo'
) returns public.tpv_ventas
language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid := public.current_negocio_id();
  v_venta   public.tpv_ventas;
  v_subtotal numeric(12,2) := 0;
  v_iva      numeric(12,2) := 0;
  v_item     record;
begin
  if v_negocio is null then raise exception 'NO_TENANT'; end if;

  select * into v_venta from public.tpv_ventas
   where id = p_venta_id and negocio_id = v_negocio for update;
  if not found then raise exception 'VENTA_NO_ENCONTRADA'; end if;
  if v_venta.estado <> 'abierta' then raise exception 'VENTA_NO_ABIERTA: %', v_venta.estado; end if;

  -- Recalcular totales desde los items (fuente de la verdad)
  for v_item in
    select i.*, p.stock_tracking
      from public.tpv_venta_items i
      join public.productos p on p.id = i.producto_id
     where i.venta_id = p_venta_id
  loop
    v_subtotal := v_subtotal + v_item.importe_linea;
    v_iva      := v_iva + round(v_item.importe_linea * v_item.iva_pct / 100, 2);

    -- Generar movimiento de stock si procede
    if v_item.stock_tracking then
      insert into public.stock_movimientos
        (negocio_id, producto_id, tipo, cantidad, motivo, referencia, user_id)
      values
        (v_negocio, v_item.producto_id, 'venta_tpv', -v_item.cantidad,
         'Venta TPV ' || v_venta.id, v_venta.id::text, auth.uid());
    end if;
  end loop;

  if v_subtotal = 0 then
    raise exception 'VENTA_VACIA';
  end if;

  update public.tpv_ventas
     set estado = 'cerrada',
         metodo_pago = p_metodo_pago,
         subtotal = v_subtotal,
         iva_total = v_iva,
         total = v_subtotal + v_iva,
         cerrada_at = now()
   where id = p_venta_id
   returning * into v_venta;

  return v_venta;
end $$;

-- 5. RLS ---------------------------------------------------------------------
alter table public.productos          enable row level security;
alter table public.stock_movimientos  enable row level security;
alter table public.tpv_ventas         enable row level security;
alter table public.tpv_venta_items    enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'productos','stock_movimientos','tpv_ventas','tpv_venta_items'
  ] loop
    execute format('drop policy if exists tenant_isolation on public.%I;', t);
    execute format(
      'create policy tenant_isolation on public.%I
         for all
         using      (negocio_id = public.current_negocio_id())
         with check (negocio_id = public.current_negocio_id());', t);
  end loop;
end $$;

-- ============================================================================
-- >>> inventario_imagenes_ext.sql
-- ============================================================================
-- =============================================================================
-- R3ZON Business OS — Bucket de imágenes de productos
-- =============================================================================
-- Crea el bucket público "producto-imagenes" y políticas RLS:
--   · Lectura: pública (las URLs se incrustan en TPV y catálogo).
--   · Escritura: sólo usuarios autenticados Y dentro de la carpeta que
--                coincide con el negocio_id del que son dueños.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('producto-imagenes', 'producto-imagenes', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists prod_img_public_read on storage.objects;
drop policy if exists prod_img_owner_write on storage.objects;
drop policy if exists prod_img_owner_update on storage.objects;
drop policy if exists prod_img_owner_delete on storage.objects;

create policy prod_img_public_read on storage.objects
  for select using (bucket_id = 'producto-imagenes');

create policy prod_img_owner_write on storage.objects
  for insert with check (
    bucket_id = 'producto-imagenes'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = public.current_negocio_id()::text
  );

create policy prod_img_owner_update on storage.objects
  for update using (
    bucket_id = 'producto-imagenes'
    and (storage.foldername(name))[1] = public.current_negocio_id()::text
  );

create policy prod_img_owner_delete on storage.objects
  for delete using (
    bucket_id = 'producto-imagenes'
    and (storage.foldername(name))[1] = public.current_negocio_id()::text
  );

-- ============================================================================
-- >>> fichajes_ext.sql
-- ============================================================================
-- =============================================================================
-- R3ZON Business OS — Módulo de Fichajes (Registro de Jornada Laboral)
-- Ejecutar DESPUÉS de schema.sql + auth_extension.sql + team_ext.sql
-- =============================================================================
-- Cumplimiento Real Decreto-ley 8/2019, art. 34.9 ET y Ley 10/2021:
--   · Registro diario de jornada con hora exacta de inicio y fin.
--   · Conservación durante 4 años, accesible para el trabajador, sus
--     representantes legales y la Inspección de Trabajo.
--   · Inmutable: una vez registrado, NO se puede modificar ni borrar.
--     Las correcciones se realizan mediante un nuevo fichaje correctivo
--     que referencia al original (campo `corrige_a`).
--   · El timestamp lo fija el SERVIDOR (now()), no el cliente, para evitar
--     manipulación. Las coordenadas GPS se aceptan tal y como las envía el
--     dispositivo (junto con `gps_accuracy_m` que indica fiabilidad).
-- =============================================================================

-- 1. ENUM tipo de fichaje -----------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'tipo_fichaje') then
    create type public.tipo_fichaje as enum (
      'entrada',         -- inicio de jornada
      'inicio_descanso', -- pausa (comida, café, etc.)
      'fin_descanso',    -- reanudación tras pausa
      'salida'           -- fin de jornada
    );
  end if;
end $$;

-- 2. TABLA fichajes -----------------------------------------------------------
create table if not exists public.fichajes (
  id              uuid primary key default uuid_generate_v4(),
  negocio_id      uuid not null references public.perfiles_negocio(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete restrict,

  tipo            public.tipo_fichaje not null,

  -- Marca de tiempo OFICIAL del fichaje (servidor). Inmutable.
  ts              timestamptz not null default now(),

  -- Geolocalización del dispositivo en el momento del fichaje.
  gps_lat         double precision,
  gps_lng         double precision,
  gps_accuracy_m  double precision,

  -- Metadatos de auditoría.
  ip              inet,
  user_agent      text,

  -- Texto libre opcional (motivo, incidencia, etc.).
  observaciones   text,

  -- Si este fichaje corrige a otro previo, referencia al original.
  corrige_a       uuid references public.fichajes(id) on delete set null,
  corregido       boolean not null default false,

  created_at      timestamptz not null default now(),

  check (gps_lat  is null or (gps_lat  between -90  and 90)),
  check (gps_lng  is null or (gps_lng  between -180 and 180)),
  check (gps_accuracy_m is null or gps_accuracy_m >= 0)
);

create index if not exists idx_fichajes_user_ts
  on public.fichajes(user_id, ts desc);
create index if not exists idx_fichajes_negocio_ts
  on public.fichajes(negocio_id, ts desc);

-- 3. RLS ----------------------------------------------------------------------
alter table public.fichajes enable row level security;

-- El trabajador ve sus propios fichajes.
drop policy if exists fichajes_self_read on public.fichajes;
create policy fichajes_self_read on public.fichajes
  for select using (user_id = auth.uid());

-- El OWNER del negocio (empleador) ve todos los fichajes — obligatorio para
-- poder exhibirlos ante la Inspección de Trabajo (RD-ley 8/2019).
drop policy if exists fichajes_owner_read on public.fichajes;
create policy fichajes_owner_read on public.fichajes
  for select using (
    exists (
      select 1 from public.perfiles_negocio p
       where p.id = fichajes.negocio_id
         and p.user_id = auth.uid()
    )
  );

-- Solo el propio trabajador puede insertar su fichaje.
drop policy if exists fichajes_self_insert on public.fichajes;
create policy fichajes_self_insert on public.fichajes
  for insert with check (
    user_id = auth.uid()
    and (
      exists (select 1 from public.perfiles_negocio p
               where p.id = fichajes.negocio_id and p.user_id = auth.uid())
      or exists (select 1 from public.miembros_negocio m
                  where m.negocio_id = fichajes.negocio_id
                    and m.user_id = auth.uid()
                    and m.estado = 'activo')
    )
  );

-- NO hay políticas UPDATE ni DELETE: los fichajes son inmutables.

-- 4. RPC: registrar_fichaje --------------------------------------------------
-- Inserta un fichaje validando la máquina de estados (entrada → descanso →
-- fin descanso → salida). La marca temporal la fija el servidor.
create or replace function public.registrar_fichaje(
  p_tipo           public.tipo_fichaje,
  p_gps_lat        double precision default null,
  p_gps_lng        double precision default null,
  p_gps_accuracy_m double precision default null,
  p_ip             inet             default null,
  p_user_agent     text             default null,
  p_observaciones  text             default null
) returns public.fichajes
language plpgsql security definer set search_path = public as $$
declare
  v_user_id     uuid := auth.uid();
  v_negocio_id  uuid;
  v_ultimo      public.tipo_fichaje;
  v_resultado   public.fichajes;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  -- Resolver negocio: owner primero, luego miembro activo.
  select p.id into v_negocio_id
    from public.perfiles_negocio p
   where p.user_id = v_user_id
   limit 1;

  if v_negocio_id is null then
    select m.negocio_id into v_negocio_id
      from public.miembros_negocio m
     where m.user_id = v_user_id and m.estado = 'activo'
     limit 1;
  end if;

  if v_negocio_id is null then
    raise exception 'NO_NEGOCIO' using errcode = '42501';
  end if;

  -- Último fichaje del usuario para validar la transición.
  select tipo into v_ultimo
    from public.fichajes
   where user_id = v_user_id
   order by ts desc
   limit 1;

  -- Máquina de estados:
  --   (sin previo)    → entrada
  --   entrada         → inicio_descanso | salida
  --   inicio_descanso → fin_descanso
  --   fin_descanso    → inicio_descanso | salida
  --   salida          → entrada
  if v_ultimo is null then
    if p_tipo <> 'entrada' then
      raise exception 'TRANSICION_INVALIDA: primer fichaje debe ser entrada'
        using errcode = '22023';
    end if;
  elsif v_ultimo = 'entrada' then
    if p_tipo not in ('inicio_descanso','salida') then
      raise exception 'TRANSICION_INVALIDA: tras entrada solo inicio_descanso o salida'
        using errcode = '22023';
    end if;
  elsif v_ultimo = 'inicio_descanso' then
    if p_tipo <> 'fin_descanso' then
      raise exception 'TRANSICION_INVALIDA: tras inicio_descanso solo fin_descanso'
        using errcode = '22023';
    end if;
  elsif v_ultimo = 'fin_descanso' then
    if p_tipo not in ('inicio_descanso','salida') then
      raise exception 'TRANSICION_INVALIDA: tras fin_descanso solo inicio_descanso o salida'
        using errcode = '22023';
    end if;
  elsif v_ultimo = 'salida' then
    if p_tipo <> 'entrada' then
      raise exception 'TRANSICION_INVALIDA: tras salida solo entrada'
        using errcode = '22023';
    end if;
  end if;

  insert into public.fichajes
    (negocio_id, user_id, tipo, gps_lat, gps_lng, gps_accuracy_m, ip, user_agent, observaciones)
  values
    (v_negocio_id, v_user_id, p_tipo, p_gps_lat, p_gps_lng, p_gps_accuracy_m, p_ip, p_user_agent, p_observaciones)
  returning * into v_resultado;

  return v_resultado;
end $$;

grant execute on function public.registrar_fichaje(
  public.tipo_fichaje, double precision, double precision, double precision, inet, text, text
) to authenticated;

-- 5. VISTA: estado actual por usuario -----------------------------------------
create or replace view public.v_fichaje_estado_actual as
  select distinct on (f.user_id)
    f.user_id,
    f.negocio_id,
    f.tipo  as ultimo_tipo,
    f.ts    as ultimo_ts,
    f.id    as ultimo_id
  from public.fichajes f
  order by f.user_id, f.ts desc;

grant select on public.v_fichaje_estado_actual to authenticated;

-- ============================================================================
-- >>> fix_tenant_defaults.sql
-- ============================================================================
-- =============================================================================
-- R3ZON Business OS — Fix: rellenar negocio_id automáticamente
-- =============================================================================
-- Problema: las RLS `tenant_isolation` exigen `negocio_id = current_negocio_id()`
-- en cada INSERT. Si el cliente no envía `negocio_id`, el INSERT falla con
-- "new row violates row-level security policy".
--
-- Solución: trigger BEFORE INSERT en cada tabla tenant-scoped que rellena
-- `negocio_id` con `current_negocio_id()` cuando viene NULL. Mantiene la RLS
-- intacta (la WITH CHECK sigue validando) y no requiere tocar la app.
--
-- Idempotente. Se puede ejecutar sobre una BD existente sin perder datos.
-- =============================================================================

create or replace function public.tg_fill_negocio_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.negocio_id is null then
    NEW.negocio_id := public.current_negocio_id();
  end if;
  return NEW;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'agenda_eventos',
    'citas',
    'clientes',
    'comunicaciones',
    'config_keys',
    'consentimientos_rgpd',
    'contactos_cliente',
    'documentos',
    'fichajes',
    'finanzas',
    'gastos_proveedor',
    'google_connections',
    'kanban_columnas',
    'metodos_pago',
    'miembros_negocio',
    'pagos_stripe',
    'productos',
    'proveedores',
    'stock_movimientos',
    'tareas_kanban',
    'tpv_venta_items',
    'tpv_ventas'
  ] loop
    -- Sólo aplicamos si la tabla existe (algunas son extensiones opcionales).
    if exists (
      select 1 from information_schema.tables
       where table_schema = 'public' and table_name = t
    ) then
      execute format(
        'drop trigger if exists fill_negocio_id on public.%I;
         create trigger fill_negocio_id before insert on public.%I
         for each row execute function public.tg_fill_negocio_id();', t, t);
    end if;
  end loop;
end $$;

-- ============================================================================
-- >>> proveedores_ext.sql
-- ============================================================================
-- =============================================================================
-- R3ZON Business OS — Extensión Proveedores y Gastos
-- =============================================================================
-- Modelo:
--   · proveedores:       directorio de empresas a las que pagamos.
--   · gastos_proveedor:  registro polimórfico de gastos. Tres "tipos":
--       · general      → gasto puntual ya pagado (one-shot).
--       · previsto     → gasto futuro previsto, todavía no pagado.
--       · suscripcion  → gasto recurrente (mensual/trimestral/anual).
--     `recurrencia` y `proximo_cobro` sólo aplican a 'suscripcion'.
--   · RLS por tenant igual que el resto del esquema.
-- =============================================================================

-- 1. PROVEEDORES -------------------------------------------------------------
create table if not exists public.proveedores (
  id              uuid primary key default uuid_generate_v4(),
  negocio_id      uuid not null references public.perfiles_negocio(id) on delete cascade,

  nombre          text not null,
  cif             text,
  email           text,
  telefono        text,
  direccion       text,
  web             text,
  persona_contacto text,
  categoria       text,                  -- material, software, servicios, otros
  notas           text,
  activo          boolean not null default true,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_proveedores_negocio   on public.proveedores(negocio_id);
create index if not exists idx_proveedores_nombre    on public.proveedores(negocio_id, nombre);
create index if not exists idx_proveedores_categoria on public.proveedores(negocio_id, categoria);

drop trigger if exists set_updated_at on public.proveedores;
create trigger set_updated_at before update on public.proveedores
  for each row execute function public.tg_set_updated_at();

-- 2. GASTOS DE PROVEEDOR -----------------------------------------------------
create table if not exists public.gastos_proveedor (
  id              uuid primary key default uuid_generate_v4(),
  negocio_id      uuid not null references public.perfiles_negocio(id) on delete cascade,
  proveedor_id    uuid references public.proveedores(id) on delete set null,

  tipo            text not null default 'general',  -- general|previsto|suscripcion
  concepto        text not null,
  categoria       text,
  fecha           date not null default current_date,
  importe         numeric(12,2) not null default 0,
  iva_pct         numeric(5,2)  not null default 21,

  -- Sólo 'suscripcion':
  recurrencia     text,                                 -- mensual|trimestral|anual
  proximo_cobro   date,

  estado          text not null default 'pendiente',    -- pendiente|pagado|cancelado
  adjunto_url     text,
  notas           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  check (tipo in ('general','previsto','suscripcion')),
  check (estado in ('pendiente','pagado','cancelado')),
  check (recurrencia is null or recurrencia in ('mensual','trimestral','anual')),
  check (importe >= 0)
);

create index if not exists idx_gastos_negocio_tipo
  on public.gastos_proveedor(negocio_id, tipo);
create index if not exists idx_gastos_proveedor
  on public.gastos_proveedor(negocio_id, proveedor_id);
create index if not exists idx_gastos_fecha
  on public.gastos_proveedor(negocio_id, fecha desc);

drop trigger if exists set_updated_at on public.gastos_proveedor;
create trigger set_updated_at before update on public.gastos_proveedor
  for each row execute function public.tg_set_updated_at();

-- 3. RLS ----------------------------------------------------------------------
alter table public.proveedores       enable row level security;
alter table public.gastos_proveedor  enable row level security;

drop policy if exists tenant_isolation on public.proveedores;
create policy tenant_isolation on public.proveedores
  for all
  using      (negocio_id = public.current_negocio_id())
  with check (negocio_id = public.current_negocio_id());

drop policy if exists tenant_isolation on public.gastos_proveedor;
create policy tenant_isolation on public.gastos_proveedor
  for all
  using      (negocio_id = public.current_negocio_id())
  with check (negocio_id = public.current_negocio_id());

-- 4. Trigger fill_negocio_id (red de seguridad en INSERTs sin negocio_id) ----
do $$
declare t text;
begin
  foreach t in array array['proveedores','gastos_proveedor'] loop
    execute format(
      'drop trigger if exists fill_negocio_id on public.%I;
       create trigger fill_negocio_id before insert on public.%I
       for each row execute function public.tg_fill_negocio_id();', t, t);
  end loop;
end $$;

-- ============================================================================
-- >>> listado_ext.sql
-- ============================================================================
-- =============================================================================
-- R3ZON Business OS — Extensión Listado (Productos + Stock unificados)
-- =============================================================================
-- Añade el flag `stock_mode_enabled` a `perfiles_negocio` para que cada negocio
-- pueda desactivar el modo stock (oculta movimientos / etiquetas de inventario).
-- Idempotente.
-- =============================================================================

alter table public.perfiles_negocio
  add column if not exists stock_mode_enabled boolean not null default true;

-- ============================================================================
-- >>> perfil_usuario_ext.sql
-- ============================================================================
-- =============================================================================
-- R3ZON Business OS — Bucket de avatares de usuario
-- =============================================================================
-- Crea el bucket público "avatars" y políticas RLS para que cada usuario
-- pueda subir / sustituir / borrar SOLO los archivos dentro de la carpeta
-- que coincide con su user_id. Lectura pública (las URLs aparecen en el
-- menú lateral, perfil, etc.).
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- Limpieza por si se reaplica la migración.
drop policy if exists avatar_public_read on storage.objects;
drop policy if exists avatar_owner_insert on storage.objects;
drop policy if exists avatar_owner_update on storage.objects;
drop policy if exists avatar_owner_delete on storage.objects;

create policy avatar_public_read on storage.objects
  for select using (bucket_id = 'avatars');

create policy avatar_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatar_owner_update on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatar_owner_delete on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- >>> theme_ext.sql
-- ============================================================================
-- =============================================================================
-- R3ZON Business OS — Extensión de personalización (Theme Engine)
-- =============================================================================
-- Preferencias visuales por **usuario individual** (NO por negocio):
--   · Paleta, tipografías, tamaño base, radios.
--   · El payload se guarda como JSONB libre, validado por el schema de
--     `src/lib/theme/theme-schema.json` en el cliente.
--   · RLS estricta: cada usuario solo ve/escribe SU fila.
-- =============================================================================

create table if not exists public.user_preferences (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  theme       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create or replace function public.tg_user_prefs_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_user_prefs_touch on public.user_preferences;
create trigger trg_user_prefs_touch
  before update on public.user_preferences
  for each row execute function public.tg_user_prefs_touch();

alter table public.user_preferences enable row level security;

drop policy if exists user_prefs_owner on public.user_preferences;
create policy user_prefs_owner on public.user_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Helper opcional: upsert idempotente del tema (por si más adelante queremos
-- llamarlo desde RPC o desde una Edge Function).
create or replace function public.save_user_theme(p_theme jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_preferences (user_id, theme)
  values (auth.uid(), coalesce(p_theme, '{}'::jsonb))
  on conflict (user_id) do update
    set theme = excluded.theme,
        updated_at = now();
end $$;

grant execute on function public.save_user_theme(jsonb) to authenticated;

-- ============================================================================
-- >>> rgpd_ext.sql
-- ============================================================================
-- =============================================================================
-- R3ZON Business OS — Extensión RGPD (cumplimiento del titular del negocio)
-- Ejecutar DESPUÉS de schema.sql.
-- Idempotente.
-- =============================================================================
-- Modelo:
--   · La tabla `public.consentimientos_rgpd` ya existe en schema.sql.
--   · Aquí añadimos:
--       1. RPC `registrar_consentimiento` para que el propio titular (o su
--          equipo en onboarding) registre consentimientos con sello temporal,
--          IP y user-agent.
--       2. RPC `revocar_consentimiento` que marca `revocado_en` en la última
--          aceptación vigente de un tipo dado.
--       3. Vista `v_consentimientos_negocio` con el estado actual de cada
--          tipo de consentimiento del negocio.
-- =============================================================================

-- 1. RPC: registrar consentimiento del titular ---------------------------------
create or replace function public.registrar_consentimiento(
  p_tipo          text,
  p_version       text,
  p_aceptado      boolean,
  p_ip            inet default null,
  p_user_agent    text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid := public.current_negocio_id();
  v_id      uuid;
begin
  if v_negocio is null then raise exception 'No tenant'; end if;
  if p_tipo is null or length(p_tipo) = 0 then raise exception 'tipo requerido'; end if;
  if p_version is null or length(p_version) = 0 then raise exception 'version requerida'; end if;

  insert into public.consentimientos_rgpd
    (negocio_id, cliente_id, tipo, texto_version, aceptado, ip, user_agent)
  values
    (v_negocio, null, p_tipo, p_version, p_aceptado, p_ip, p_user_agent)
  returning id into v_id;

  return v_id;
end $$;

grant execute on function public.registrar_consentimiento(text, text, boolean, inet, text) to authenticated;

-- 2. RPC: revocar el consentimiento vigente de un tipo ------------------------
create or replace function public.revocar_consentimiento(p_tipo text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid := public.current_negocio_id();
  v_id      uuid;
begin
  if v_negocio is null then raise exception 'No tenant'; end if;

  update public.consentimientos_rgpd
     set revocado_en = now()
   where id = (
     select id from public.consentimientos_rgpd
      where negocio_id = v_negocio
        and cliente_id is null
        and tipo = p_tipo
        and aceptado = true
        and revocado_en is null
      order by fecha desc
      limit 1
   )
   returning id into v_id;

  return v_id;
end $$;

grant execute on function public.revocar_consentimiento(text) to authenticated;

-- 3. Vista: estado actual de cada tipo de consentimiento del negocio ----------
create or replace view public.v_consentimientos_negocio as
  select distinct on (c.negocio_id, c.tipo)
    c.id,
    c.negocio_id,
    c.tipo,
    c.texto_version,
    c.aceptado,
    c.fecha,
    c.ip,
    c.user_agent,
    c.revocado_en,
    (c.aceptado and c.revocado_en is null) as vigente
  from public.consentimientos_rgpd c
  where c.cliente_id is null
  order by c.negocio_id, c.tipo, c.fecha desc;

grant select on public.v_consentimientos_negocio to authenticated;

-- ============================================================================
-- >>> retention_ext.sql
-- ============================================================================
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

-- ============================================================================
-- >>> security_hardening.sql
-- ============================================================================
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

-- ============================================================================
-- >>> security_timing_hardening.sql
-- ============================================================================
-- =============================================================================
-- R3ZON Business OS — Hardening adicional: comparación timing-safe de tokens
-- =============================================================================
-- Sustituye la comparación `channel_token = p_channel_token` (texto, short-circuit
-- byte-a-byte) por una comparación de digest SHA-256 de longitud fija (32 bytes),
-- mitigando timing attacks contra el token del webhook de Google Calendar.
--
-- La función mantiene la misma firma y semántica: si el token no coincide,
-- no devuelve filas. Se ejecuta con SECURITY DEFINER porque el webhook llama
-- con service-role sin sesión de usuario.
--
-- Idempotente. Ejecutable cuantas veces se quiera.
-- Aplicar DESPUÉS de agenda_ext.sql.
-- =============================================================================

create extension if not exists pgcrypto;

create or replace function public.find_connection_by_channel(
  p_channel_id    text,
  p_channel_token text
) returns table (user_id uuid, negocio_id uuid)
language sql security definer set search_path = public, extensions as $$
  select user_id, negocio_id
    from public.google_connections
   where channel_id = p_channel_id
     -- Comparación de digests de longitud fija (32 bytes) → constante en tiempo.
     and digest(coalesce(channel_token, ''), 'sha256')
       = digest(coalesce(p_channel_token, ''), 'sha256')
     and (channel_expiration is null or channel_expiration > now())
   limit 1;
$$;

-- Re-aplicar restricciones de EXECUTE (en caso de reset de privilegios).
revoke all on function public.find_connection_by_channel(text, text) from public, anon, authenticated;
grant execute on function public.find_connection_by_channel(text, text) to service_role;
