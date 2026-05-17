-- =============================================================================
-- R3ZON ANTARES — Onboarding wizard multi-paso + mini-tours por módulo
-- =============================================================================
-- Añade estado para retomar el wizard de bienvenida donde lo dejó el usuario
-- y para no repetir los mini-tours de cada módulo una vez vistos.
-- =============================================================================

alter table public.perfiles_negocio
  add column if not exists onboarding_paso int not null default 0,
  add column if not exists onboarding_datos jsonb not null default '{}'::jsonb,
  add column if not exists onboarding_modulos_vistos text[] not null default '{}';

-- RPC: guardar progreso del wizard. Hace UPSERT parcial en columnas reales
-- (p_parciales) + merge en el borrador (p_datos) + actualiza el paso actual.
-- Si p_finalizar=true marca onboarding_completado=true.
create or replace function public.guardar_paso_onboarding(
  p_paso        int,
  p_datos       jsonb default '{}'::jsonb,
  p_parciales   jsonb default '{}'::jsonb,
  p_finalizar   boolean default false
) returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_negocio uuid := public.current_negocio_id();
begin
  if v_negocio is null then raise exception 'No tenant'; end if;

  update public.perfiles_negocio
     set nombre_negocio = coalesce(nullif(p_parciales->>'nombre_negocio',''), nombre_negocio),
         cif_nif        = coalesce(nullif(p_parciales->>'cif_nif',''),        cif_nif),
         sector         = coalesce(nullif(p_parciales->>'sector',''),         sector),
         email_contacto = coalesce(nullif(p_parciales->>'email_contacto',''), email_contacto),
         telefono       = coalesce(nullif(p_parciales->>'telefono',''),       telefono),
         direccion      = coalesce(nullif(p_parciales->>'direccion',''),      direccion),
         logo_url       = coalesce(nullif(p_parciales->>'logo_url',''),       logo_url),
         moneda         = coalesce(nullif(p_parciales->>'moneda',''),         moneda),
         zona_horaria   = coalesce(nullif(p_parciales->>'zona_horaria',''),   zona_horaria),
         onboarding_datos          = onboarding_datos || coalesce(p_datos, '{}'::jsonb),
         onboarding_paso           = greatest(onboarding_paso, p_paso),
         onboarding_completado     = case when p_finalizar then true else onboarding_completado end,
         onboarding_completado_en  = case when p_finalizar then now() else onboarding_completado_en end,
         updated_at = now()
   where id = v_negocio;
end $$;

-- RPC: marcar un módulo como "tour visto" (idempotente).
create or replace function public.marcar_modulo_visto(p_modulo text)
returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_negocio uuid := public.current_negocio_id();
begin
  if v_negocio is null then raise exception 'No tenant'; end if;
  update public.perfiles_negocio
     set onboarding_modulos_vistos =
           case
             when p_modulo = any(onboarding_modulos_vistos) then onboarding_modulos_vistos
             else array_append(onboarding_modulos_vistos, p_modulo)
           end,
         updated_at = now()
   where id = v_negocio;
end $$;

-- Permite que registrar_onboarding pueda invocarse SIN finalizar el onboarding
-- (lo finalizará el último paso del wizard tras elegir plan).
create or replace function public.registrar_onboarding(
  p_consentimientos jsonb,
  p_ip inet default null,
  p_user_agent text default null,
  p_finalizar boolean default true
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_negocio   uuid := public.current_negocio_id();
  v_doc       jsonb;
  v_required  text[] := array['terminos','privacidad','cookies'];
  v_tipo      text;
  v_aceptado  boolean;
begin
  if v_negocio is null then raise exception 'No tenant'; end if;

  foreach v_tipo in array v_required loop
    select coalesce((d->>'aceptado')::boolean, false)
      into v_aceptado
      from jsonb_array_elements(p_consentimientos) d
     where d->>'tipo' = v_tipo
     limit 1;
    if v_aceptado is null or v_aceptado = false then
      raise exception 'Consentimiento obligatorio % no aceptado', v_tipo
        using errcode = 'check_violation';
    end if;
  end loop;

  for v_doc in select * from jsonb_array_elements(p_consentimientos) loop
    insert into public.consentimientos_rgpd (
      negocio_id, cliente_id, tipo, texto_version, aceptado, ip, user_agent
    ) values (
      v_negocio, null,
      v_doc->>'tipo',
      v_doc->>'version',
      coalesce((v_doc->>'aceptado')::boolean, false),
      p_ip, p_user_agent
    );
  end loop;

  if p_finalizar then
    update public.perfiles_negocio
       set onboarding_completado = true,
           onboarding_completado_en = now()
     where id = v_negocio;
  end if;

  return v_negocio;
end $$;
