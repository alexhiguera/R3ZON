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
