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
