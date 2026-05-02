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
