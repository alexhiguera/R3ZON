-- =============================================================================
-- R3ZON Business OS — Esquema Multi-Tenant (Supabase / Postgres)
-- =============================================================================
-- Modelo de tenancy:
--   · auth.users (Supabase Auth) → 1 fila en perfiles_negocio (el "tenant")
--   · Todas las tablas de dominio referencian negocio_id (FK a perfiles_negocio)
--   · RLS aísla cada tenant: solo el dueño puede ver/editar sus filas.
--   · config_keys guarda credenciales cifradas (Stripe, Twilio…) con pgcrypto.
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
-- 2. CLIENTES
-- =============================================================================
create table if not exists public.clientes (
  id            uuid primary key default uuid_generate_v4(),
  negocio_id    uuid not null references public.perfiles_negocio(id) on delete cascade,
  nombre        text not null,
  apellidos     text,
  email         text,
  telefono      text,
  nif           text,
  direccion     text,
  notas         text,
  etiquetas     text[] default '{}',
  fecha_alta    timestamptz not null default now(),
  ultima_visita timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_clientes_negocio on public.clientes(negocio_id);
create index if not exists idx_clientes_email   on public.clientes(negocio_id, email);

-- =============================================================================
-- 3. CITAS (calendario / agenda)
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
  color          text,                                -- hex para UI
  precio         numeric(10,2),
  recordatorio_min int default 60,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (fin > inicio)
);
create index if not exists idx_citas_negocio_inicio on public.citas(negocio_id, inicio);
create index if not exists idx_citas_cliente on public.citas(cliente_id);

-- =============================================================================
-- 4. TAREAS_KANBAN
-- =============================================================================
create table if not exists public.tareas_kanban (
  id           uuid primary key default uuid_generate_v4(),
  negocio_id   uuid not null references public.perfiles_negocio(id) on delete cascade,
  cliente_id   uuid references public.clientes(id) on delete set null,
  titulo       text not null,
  descripcion  text,
  columna      text not null default 'pendiente',   -- pendiente|en_curso|revision|hecho
  prioridad    text not null default 'normal',      -- baja|normal|alta|urgente
  posicion     integer not null default 0,
  fecha_limite timestamptz,
  etiquetas    text[] default '{}',
  completada   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_kanban_negocio_columna on public.tareas_kanban(negocio_id, columna, posicion);

-- =============================================================================
-- 5. FINANZAS (ingresos/gastos con IVA + IRPF para España)
-- =============================================================================
create table if not exists public.finanzas (
  id              uuid primary key default uuid_generate_v4(),
  negocio_id      uuid not null references public.perfiles_negocio(id) on delete cascade,
  cliente_id      uuid references public.clientes(id) on delete set null,

  tipo            text not null,                  -- ingreso | gasto
  concepto        text not null,
  categoria       text,                           -- ej: 'suministros','servicios','ventas'
  fecha           date not null default current_date,

  -- Importes (en moneda del negocio)
  base_imponible  numeric(12,2) not null,         -- importe sin impuestos
  iva_porcentaje  numeric(5,2)  not null default 21.00,  -- 0, 4, 10, 21
  iva_importe     numeric(12,2) generated always as (round(base_imponible * iva_porcentaje / 100, 2)) stored,
  irpf_porcentaje numeric(5,2)  not null default 0.00,   -- 0, 7, 15, 19…
  irpf_importe    numeric(12,2) generated always as (round(base_imponible * irpf_porcentaje / 100, 2)) stored,
  total           numeric(12,2) generated always as (
                    round(base_imponible
                          + (base_imponible * iva_porcentaje  / 100)
                          - (base_imponible * irpf_porcentaje / 100), 2)
                  ) stored,

  -- Documentación
  numero_factura  text,
  metodo_pago     text,                           -- efectivo|tarjeta|transferencia|bizum
  estado_pago     text not null default 'pagado', -- pendiente|pagado|vencido
  archivo_url     text,                           -- ticket/factura subida (Supabase Storage)
  ocr_extraido    jsonb,                          -- payload del OCR client-side

  notas           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  check (tipo in ('ingreso','gasto')),
  check (base_imponible >= 0)
);
create index if not exists idx_finanzas_negocio_fecha on public.finanzas(negocio_id, fecha desc);
create index if not exists idx_finanzas_tipo on public.finanzas(negocio_id, tipo);

-- =============================================================================
-- 6. CONSENTIMIENTOS_RGPD (registro de consentimientos LOPD/GDPR)
-- =============================================================================
create table if not exists public.consentimientos_rgpd (
  id            uuid primary key default uuid_generate_v4(),
  negocio_id    uuid not null references public.perfiles_negocio(id) on delete cascade,
  cliente_id    uuid not null references public.clientes(id) on delete cascade,
  tipo          text not null,                    -- marketing|tratamiento_datos|imagen|cookies
  texto_version text not null,                    -- versión legal aceptada
  aceptado      boolean not null,
  fecha         timestamptz not null default now(),
  ip            inet,
  user_agent    text,
  firma_url     text,                             -- imagen de firma manuscrita opcional
  revocado_en   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_rgpd_cliente on public.consentimientos_rgpd(cliente_id);
create index if not exists idx_rgpd_negocio on public.consentimientos_rgpd(negocio_id);

-- =============================================================================
-- 7. CONFIG_KEYS (API keys cifradas con pgcrypto)
-- =============================================================================
-- IMPORTANTE: la clave maestra vive como "GUC" (app.config_master_key) configurada
-- en el proyecto Supabase como un Secret. Nunca se almacena en la BD.
-- =============================================================================
create table if not exists public.config_keys (
  id           uuid primary key default uuid_generate_v4(),
  negocio_id   uuid not null references public.perfiles_negocio(id) on delete cascade,
  servicio     text not null,                    -- 'stripe'|'twilio'|'openai'|...
  alias        text,                             -- nombre amigable
  valor_cifrado bytea not null,                  -- pgp_sym_encrypt output
  metadata     jsonb default '{}'::jsonb,        -- info no sensible
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (negocio_id, servicio, alias)
);
create index if not exists idx_config_negocio on public.config_keys(negocio_id);

-- Funciones para guardar/leer claves cifradas (usan GUC 'app.config_master_key').
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
-- 8. TRIGGER updated_at en todas las tablas
-- =============================================================================
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'perfiles_negocio','clientes','citas','tareas_kanban','finanzas','config_keys'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.tg_set_updated_at();', t, t);
  end loop;
end $$;

-- =============================================================================
-- 9. ROW LEVEL SECURITY (multi-tenant)
-- =============================================================================
alter table public.perfiles_negocio     enable row level security;
alter table public.clientes             enable row level security;
alter table public.citas                enable row level security;
alter table public.tareas_kanban        enable row level security;
alter table public.finanzas             enable row level security;
alter table public.consentimientos_rgpd enable row level security;
alter table public.config_keys          enable row level security;

-- Perfiles: solo el dueño
drop policy if exists perfiles_owner on public.perfiles_negocio;
create policy perfiles_owner on public.perfiles_negocio
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Resto de tablas: filtran por negocio_id == current_negocio_id()
do $$
declare t text;
begin
  foreach t in array array[
    'clientes','citas','tareas_kanban','finanzas','consentimientos_rgpd','config_keys'
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
-- 10. BOOTSTRAP: crear perfil_negocio al registrarse
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
