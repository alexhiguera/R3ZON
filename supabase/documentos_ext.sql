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
