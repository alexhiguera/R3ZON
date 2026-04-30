-- =============================================================================
-- R3ZON Business OS — Módulo B2B: Empresas + Contactos jerárquicos
-- =============================================================================
-- Modelo:
--   · empresas            → cuentas B2B (cliente = empresa)
--   · contactos_empresa   → trabajadores/personas de cada empresa
--                            con relación autorreferencial (reports_to)
--                            para construir el organigrama.
-- =============================================================================

-- 1. EMPRESAS ----------------------------------------------------------------
create table if not exists public.empresas (
  id              uuid primary key default uuid_generate_v4(),
  negocio_id      uuid not null references public.perfiles_negocio(id) on delete cascade,

  nombre          text not null,
  cif             text,
  sector          text,
  sitio_web       text,
  email           text,
  telefono        text,
  direccion       text,
  ciudad          text,
  pais            text default 'España',
  codigo_postal   text,

  num_empleados   integer,
  facturacion_anual numeric(14,2),
  estado          text not null default 'activa',   -- activa | prospecto | inactiva
  notas           text,
  etiquetas       text[] default '{}',
  logo_url        text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  check (estado in ('activa','prospecto','inactiva'))
);
create index if not exists idx_empresas_negocio on public.empresas(negocio_id);
create index if not exists idx_empresas_nombre  on public.empresas(negocio_id, nombre);

-- 2. CONTACTOS DE EMPRESA ----------------------------------------------------
create table if not exists public.contactos_empresa (
  id              uuid primary key default uuid_generate_v4(),
  negocio_id      uuid not null references public.perfiles_negocio(id) on delete cascade,
  empresa_id      uuid not null references public.empresas(id)         on delete cascade,

  -- Jerarquía: a quién reporta este contacto (mismo empresa_id).
  reports_to      uuid references public.contactos_empresa(id) on delete set null,

  nombre          text not null,
  apellidos       text,
  email           text,
  telefono        text,
  puesto          text,                  -- ej. "Director Comercial"
  departamento    text,                  -- ej. "Ventas", "IT", "Finanzas"
  es_decisor      boolean not null default false,
  notas           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_contactos_empresa on public.contactos_empresa(empresa_id);
create index if not exists idx_contactos_negocio on public.contactos_empresa(negocio_id);
create index if not exists idx_contactos_reports on public.contactos_empresa(reports_to);

-- Evitar ciclos triviales (un contacto no puede reportar a sí mismo).
alter table public.contactos_empresa
  drop constraint if exists contactos_no_self_report;
alter table public.contactos_empresa
  add constraint contactos_no_self_report check (reports_to is null or reports_to <> id);

-- Garantizar que reports_to apunta a un contacto de la MISMA empresa.
create or replace function public.tg_check_reports_to_same_company()
returns trigger language plpgsql as $$
declare v_empresa uuid;
begin
  if new.reports_to is null then return new; end if;
  select empresa_id into v_empresa from public.contactos_empresa where id = new.reports_to;
  if v_empresa is null or v_empresa <> new.empresa_id then
    raise exception 'reports_to debe pertenecer a la misma empresa';
  end if;
  return new;
end $$;

drop trigger if exists check_reports_to_same_company on public.contactos_empresa;
create trigger check_reports_to_same_company
  before insert or update on public.contactos_empresa
  for each row execute function public.tg_check_reports_to_same_company();

-- 3. updated_at triggers -----------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['empresas','contactos_empresa'] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.tg_set_updated_at();', t, t);
  end loop;
end $$;

-- 4. ROW LEVEL SECURITY ------------------------------------------------------
alter table public.empresas          enable row level security;
alter table public.contactos_empresa enable row level security;

do $$
declare t text;
begin
  foreach t in array array['empresas','contactos_empresa'] loop
    execute format('drop policy if exists tenant_isolation on public.%I;', t);
    execute format(
      'create policy tenant_isolation on public.%I
         for all
         using      (negocio_id = public.current_negocio_id())
         with check (negocio_id = public.current_negocio_id());', t);
  end loop;
end $$;
