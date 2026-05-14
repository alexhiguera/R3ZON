-- =============================================================================
-- R3ZON Business OS — Fichajes: GPS obligatorio + horas objetivo
-- =============================================================================
-- · GPS pasa a ser obligatorio en el RPC `registrar_fichaje` (RD-ley 8/2019:
--   conviene acreditar localización para la Inspección de Trabajo).
-- · `perfiles_negocio.horas_objetivo_dia_default`: horas/día por defecto del
--   negocio (numeric(4,2), 0–24, default 8).
-- · `miembros_negocio.horas_objetivo_dia`: override por trabajador (nullable).
-- · Idempotente.
-- =============================================================================

begin;

-- 1) Columnas de horas objetivo ----------------------------------------------
alter table public.perfiles_negocio
  add column if not exists horas_objetivo_dia_default numeric(4,2)
    not null default 8.00
    check (horas_objetivo_dia_default >= 0 and horas_objetivo_dia_default <= 24);

alter table public.miembros_negocio
  add column if not exists horas_objetivo_dia numeric(4,2)
    check (horas_objetivo_dia is null
           or (horas_objetivo_dia >= 0 and horas_objetivo_dia <= 24));

-- 2) registrar_fichaje: GPS obligatorio --------------------------------------
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

  -- GPS obligatorio (RD-ley 8/2019, acreditación de presencia).
  if p_gps_lat is null or p_gps_lng is null then
    raise exception 'GPS_REQUERIDO' using errcode = '22023';
  end if;

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

  select tipo into v_ultimo
    from public.fichajes
   where user_id = v_user_id
   order by ts desc
   limit 1;

  if v_ultimo is null then
    if p_tipo <> 'entrada' then
      raise exception 'TRANSICION_INVALIDA: primer fichaje debe ser entrada'
        using errcode = '22023';
    end if;
  elsif v_ultimo = 'entrada' then
    if p_tipo not in ('inicio_descanso','salida') then
      raise exception 'TRANSICION_INVALIDA' using errcode = '22023';
    end if;
  elsif v_ultimo = 'inicio_descanso' then
    if p_tipo <> 'fin_descanso' then
      raise exception 'TRANSICION_INVALIDA' using errcode = '22023';
    end if;
  elsif v_ultimo = 'fin_descanso' then
    if p_tipo not in ('inicio_descanso','salida') then
      raise exception 'TRANSICION_INVALIDA' using errcode = '22023';
    end if;
  elsif v_ultimo = 'salida' then
    if p_tipo <> 'entrada' then
      raise exception 'TRANSICION_INVALIDA' using errcode = '22023';
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

-- 3) RPC: setear horas objetivo (solo owner) ----------------------------------
create or replace function public.set_horas_objetivo_default(
  p_horas numeric
) returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_result  numeric;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_horas is null or p_horas < 0 or p_horas > 24 then
    raise exception 'HORAS_FUERA_DE_RANGO' using errcode = '22023';
  end if;
  update public.perfiles_negocio
     set horas_objetivo_dia_default = p_horas
   where user_id = v_user_id
   returning horas_objetivo_dia_default into v_result;
  if v_result is null then
    raise exception 'NO_NEGOCIO' using errcode = '42501';
  end if;
  return v_result;
end $$;

grant execute on function public.set_horas_objetivo_default(numeric) to authenticated;

create or replace function public.set_horas_objetivo_miembro(
  p_miembro_id uuid,
  p_horas      numeric
) returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_result  numeric;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_horas is not null and (p_horas < 0 or p_horas > 24) then
    raise exception 'HORAS_FUERA_DE_RANGO' using errcode = '22023';
  end if;
  update public.miembros_negocio m
     set horas_objetivo_dia = p_horas
   where m.id = p_miembro_id
     and exists (
       select 1 from public.perfiles_negocio p
        where p.id = m.negocio_id and p.user_id = v_user_id
     )
   returning m.horas_objetivo_dia into v_result;
  -- v_result puede ser null si se está limpiando el override; comprobamos
  -- afectación por separado.
  if not found then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;
  return v_result;
end $$;

grant execute on function public.set_horas_objetivo_miembro(uuid, numeric) to authenticated;

commit;
