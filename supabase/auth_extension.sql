-- =============================================================================
-- R3ZON Business OS — Extensión Auth / RGPD / Devices
-- Ejecutar DESPUÉS de schema.sql
-- =============================================================================

-- 1. VERSIONES DE TÉRMINOS LEGALES (control de versionado RGPD/LOPDGDD)
create table if not exists public.terminos_versiones (
  id           uuid primary key default uuid_generate_v4(),
  documento    text not null,                   -- 'privacidad'|'cookies'|'terminos'|'aviso_legal'
  version      text not null,                   -- '2026-04-28' o 'v1.0'
  url          text,
  contenido_md text,                            -- snapshot del contenido legal
  vigente_desde timestamptz not null default now(),
  unique (documento, version)
);

insert into public.terminos_versiones (documento, version, url) values
  ('privacidad',  '2026-04-28', '/legal/privacidad'),
  ('cookies',     '2026-04-28', '/legal/cookies'),
  ('terminos',    '2026-04-28', '/legal/terminos'),
  ('aviso_legal', '2026-04-28', '/legal/aviso-legal')
on conflict do nothing;

-- 2. DISPOSITIVOS CONOCIDOS (para notificar nuevo inicio de sesión)
create table if not exists public.dispositivos_conocidos (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  device_hash    text not null,                 -- SHA-256 de UA + plataforma + zona horaria
  device_name    text,                          -- 'Chrome en macOS' (humano)
  ip             inet,
  user_agent     text,
  pais           text,
  primer_login   timestamptz not null default now(),
  ultimo_login   timestamptz not null default now(),
  notificado     boolean not null default false,
  unique (user_id, device_hash)
);
create index if not exists idx_devices_user on public.dispositivos_conocidos(user_id);

alter table public.dispositivos_conocidos enable row level security;
drop policy if exists devices_owner on public.dispositivos_conocidos;
create policy devices_owner on public.dispositivos_conocidos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3. ESTADO DE ONBOARDING en perfiles_negocio
alter table public.perfiles_negocio
  add column if not exists onboarding_completado boolean not null default false,
  add column if not exists onboarding_completado_en timestamptz;

-- 4. RPC: registrar consentimientos RGPD durante onboarding
-- Acepta un array de documentos { tipo, version }
create or replace function public.registrar_onboarding(
  p_consentimientos jsonb,    -- [{tipo:'privacidad',version:'2026-04-28',aceptado:true}, ...]
  p_ip inet default null,
  p_user_agent text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid := public.current_negocio_id();
  v_cliente uuid;
  v_doc     jsonb;
begin
  if v_negocio is null then raise exception 'No tenant'; end if;

  -- En onboarding inicial, el "cliente" es el propio negocio (representante legal).
  -- Creamos una fila cliente self-reference si no existe.
  select id into v_cliente from public.clientes
   where negocio_id = v_negocio and email = (select email from auth.users where id = auth.uid())
   limit 1;

  if v_cliente is null then
    insert into public.clientes (negocio_id, nombre, email, notas)
    values (v_negocio, 'Titular del negocio',
            (select email from auth.users where id = auth.uid()),
            'Auto-generado durante onboarding')
    returning id into v_cliente;
  end if;

  for v_doc in select * from jsonb_array_elements(p_consentimientos) loop
    insert into public.consentimientos_rgpd (
      negocio_id, cliente_id, tipo, texto_version, aceptado, ip, user_agent
    ) values (
      v_negocio, v_cliente,
      v_doc->>'tipo',
      v_doc->>'version',
      coalesce((v_doc->>'aceptado')::boolean, false),
      p_ip, p_user_agent
    );
  end loop;

  update public.perfiles_negocio
     set onboarding_completado = true,
         onboarding_completado_en = now()
   where id = v_negocio;

  return v_negocio;
end $$;

-- 5. RPC: registrar dispositivo y devolver si es NUEVO
create or replace function public.registrar_dispositivo(
  p_device_hash text,
  p_device_name text default null,
  p_user_agent  text default null,
  p_ip          inet default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_existe boolean;
begin
  select exists(
    select 1 from public.dispositivos_conocidos
     where user_id = auth.uid() and device_hash = p_device_hash
  ) into v_existe;

  if v_existe then
    update public.dispositivos_conocidos
       set ultimo_login = now()
     where user_id = auth.uid() and device_hash = p_device_hash;
    return false;          -- conocido
  else
    insert into public.dispositivos_conocidos
      (user_id, device_hash, device_name, user_agent, ip, notificado)
    values (auth.uid(), p_device_hash, p_device_name, p_user_agent, p_ip, false);
    return true;           -- NUEVO → la Edge Function debe enviar email
  end if;
end $$;
