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
