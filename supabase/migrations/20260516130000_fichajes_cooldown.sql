-- Anti-spam de fichajes: cooldown mínimo entre fichajes consecutivos del
-- mismo usuario. Evita que un trabajador pueda fichar/desfichar en bucle.
--
-- 60 s es suficiente para distinguir una acción humana legítima (corregir un
-- error pulsando dos botones seguidos) de un abuso. El servidor es la fuente
-- de verdad porque el cliente puede manipularse.

create or replace function public.registrar_fichaje(
  p_tipo           public.tipo_fichaje,
  p_gps_lat        double precision default null,
  p_gps_lng        double precision default null,
  p_gps_accuracy_m double precision default null,
  p_ip             inet             default null,
  p_user_agent     text             default null,
  p_observaciones  text             default null
) returns public.fichajes
language plpgsql security invoker set search_path = public as $$
declare
  v_user_id       uuid := auth.uid();
  v_negocio_id    uuid;
  v_ultimo        public.tipo_fichaje;
  v_ultimo_ts     timestamptz;
  v_segundos      numeric;
  v_cooldown_s    int := 60;
  v_resultado     public.fichajes;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
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

  select tipo, ts into v_ultimo, v_ultimo_ts
    from public.fichajes
   where user_id = v_user_id
   order by ts desc
   limit 1;

  if v_ultimo_ts is not null then
    v_segundos := extract(epoch from (now() - v_ultimo_ts));
    if v_segundos < v_cooldown_s then
      raise exception 'COOLDOWN_ACTIVO: espera % s antes del siguiente fichaje',
        ceil(v_cooldown_s - v_segundos)
        using errcode = '22023';
    end if;
  end if;

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
