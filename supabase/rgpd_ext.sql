-- =============================================================================
-- R3ZON Business OS — Extensión RGPD (cumplimiento del titular del negocio)
-- Ejecutar DESPUÉS de schema.sql.
-- Idempotente.
-- =============================================================================
-- Modelo:
--   · La tabla `public.consentimientos_rgpd` ya existe en schema.sql.
--   · Aquí añadimos:
--       1. RPC `registrar_consentimiento` para que el propio titular (o su
--          equipo en onboarding) registre consentimientos con sello temporal,
--          IP y user-agent.
--       2. RPC `revocar_consentimiento` que marca `revocado_en` en la última
--          aceptación vigente de un tipo dado.
--       3. Vista `v_consentimientos_negocio` con el estado actual de cada
--          tipo de consentimiento del negocio.
-- =============================================================================

-- 1. RPC: registrar consentimiento del titular ---------------------------------
create or replace function public.registrar_consentimiento(
  p_tipo          text,
  p_version       text,
  p_aceptado      boolean,
  p_ip            inet default null,
  p_user_agent    text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid := public.current_negocio_id();
  v_id      uuid;
begin
  if v_negocio is null then raise exception 'No tenant'; end if;
  if p_tipo is null or length(p_tipo) = 0 then raise exception 'tipo requerido'; end if;
  if p_version is null or length(p_version) = 0 then raise exception 'version requerida'; end if;

  insert into public.consentimientos_rgpd
    (negocio_id, cliente_id, tipo, texto_version, aceptado, ip, user_agent)
  values
    (v_negocio, null, p_tipo, p_version, p_aceptado, p_ip, p_user_agent)
  returning id into v_id;

  return v_id;
end $$;

grant execute on function public.registrar_consentimiento(text, text, boolean, inet, text) to authenticated;

-- 2. RPC: revocar el consentimiento vigente de un tipo ------------------------
create or replace function public.revocar_consentimiento(p_tipo text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid := public.current_negocio_id();
  v_id      uuid;
begin
  if v_negocio is null then raise exception 'No tenant'; end if;

  update public.consentimientos_rgpd
     set revocado_en = now()
   where id = (
     select id from public.consentimientos_rgpd
      where negocio_id = v_negocio
        and cliente_id is null
        and tipo = p_tipo
        and aceptado = true
        and revocado_en is null
      order by fecha desc
      limit 1
   )
   returning id into v_id;

  return v_id;
end $$;

grant execute on function public.revocar_consentimiento(text) to authenticated;

-- 3. Vista: estado actual de cada tipo de consentimiento del negocio ----------
create or replace view public.v_consentimientos_negocio as
  select distinct on (c.negocio_id, c.tipo)
    c.id,
    c.negocio_id,
    c.tipo,
    c.texto_version,
    c.aceptado,
    c.fecha,
    c.ip,
    c.user_agent,
    c.revocado_en,
    (c.aceptado and c.revocado_en is null) as vigente
  from public.consentimientos_rgpd c
  where c.cliente_id is null
  order by c.negocio_id, c.tipo, c.fecha desc;

grant select on public.v_consentimientos_negocio to authenticated;
