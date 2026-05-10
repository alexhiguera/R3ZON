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
