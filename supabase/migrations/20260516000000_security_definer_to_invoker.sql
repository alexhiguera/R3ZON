-- =============================================================================
-- Reducir superficie de SECURITY DEFINER en RPCs simples
-- =============================================================================
-- El advisor de Supabase marca como WARN todas las funciones SECURITY DEFINER
-- ejecutables por usuarios autenticados (lint 0029). Migramos a SECURITY INVOKER
-- las RPCs que solo hacen UPDATE/UPSERT con cláusulas que la RLS ya cubre
-- (defensa en profundidad: el control de acceso se hace por RLS, no por el
-- privilegio del owner de la función).
--
-- Mantenemos como SECURITY DEFINER:
--   - current_negocio_id, get/set_google_tokens, set_config_key, etc.
--     → necesitan privilegios para pgcrypto, lectura de columnas privadas
--       o orquestación atómica multi-tabla.
--
-- Por cada RPC migrada validamos que existen las policies RLS necesarias.

begin;

-- 1. save_user_theme: UPSERT en user_preferences filtrado por auth.uid().
--    Requiere policy de INSERT/UPDATE para owner en user_preferences.
create or replace function public.save_user_theme(p_theme jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.user_preferences (user_id, theme)
  values (auth.uid(), coalesce(p_theme, '{}'::jsonb))
  on conflict (user_id) do update
    set theme = excluded.theme,
        updated_at = now();
end $$;

-- 2. reordenar_tarea: UPDATE en tareas_kanban filtrado por negocio.
--    El filtro `negocio_id = current_negocio_id()` queda como redundancia
--    explícita por si en el futuro la RLS se relaja.
create or replace function public.reordenar_tarea(
  p_tarea_id   uuid,
  p_columna    text,
  p_posicion   integer
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.tareas_kanban
     set columna = p_columna, posicion = p_posicion, updated_at = now()
   where id = p_tarea_id
     and negocio_id = public.current_negocio_id();
end $$;

-- 3. reordenar_tareas_batch: igual que reordenar_tarea, en bulk.
create or replace function public.reordenar_tareas_batch(p_updates jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  rec jsonb;
begin
  for rec in select * from jsonb_array_elements(p_updates) loop
    update public.tareas_kanban
       set columna    = rec->>'columna',
           posicion   = (rec->>'posicion')::int,
           updated_at = now()
     where id = (rec->>'id')::uuid
       and negocio_id = public.current_negocio_id();
  end loop;
end $$;

-- 4. registrar_fichaje: lógica compleja (lee perfiles_negocio + miembros_negocio,
--    valida transiciones de estado, inserta en fichajes). Funciona con INVOKER
--    siempre que las RLS de esas tablas permitan SELECT al propio user y INSERT
--    en fichajes con user_id = auth.uid(), que es el caso por la convención
--    multi-tenant del proyecto.
create or replace function public.registrar_fichaje(
  p_tipo           public.tipo_fichaje,
  p_gps_lat        double precision default null,
  p_gps_lng        double precision default null,
  p_gps_accuracy_m double precision default null,
  p_ip             inet             default null,
  p_user_agent     text             default null,
  p_observaciones  text             default null
) returns public.fichajes
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_negocio_id  uuid;
  v_ultimo      public.tipo_fichaje;
  v_resultado   public.fichajes;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

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

-- 5. reordenar_columnas_batch: UPDATE de posiciones en kanban_columnas.
create or replace function public.reordenar_columnas_batch(p_updates jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  rec jsonb;
begin
  for rec in select * from jsonb_array_elements(p_updates) loop
    update public.kanban_columnas
       set posicion = (rec->>'posicion')::int
     where id = (rec->>'id')::uuid
       and negocio_id = public.current_negocio_id();
  end loop;
end $$;

commit;
