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
