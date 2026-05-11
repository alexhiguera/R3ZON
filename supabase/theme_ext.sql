-- =============================================================================
-- R3ZON Business OS — Extensión de personalización (Theme Engine)
-- =============================================================================
-- Preferencias visuales por **usuario individual** (NO por negocio):
--   · Paleta, tipografías, tamaño base, radios.
--   · El payload se guarda como JSONB libre, validado por el schema de
--     `src/lib/theme/theme-schema.json` en el cliente.
--   · RLS estricta: cada usuario solo ve/escribe SU fila.
-- =============================================================================

create table if not exists public.user_preferences (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  theme       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create or replace function public.tg_user_prefs_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_user_prefs_touch on public.user_preferences;
create trigger trg_user_prefs_touch
  before update on public.user_preferences
  for each row execute function public.tg_user_prefs_touch();

alter table public.user_preferences enable row level security;

drop policy if exists user_prefs_owner on public.user_preferences;
create policy user_prefs_owner on public.user_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Helper opcional: upsert idempotente del tema (por si más adelante queremos
-- llamarlo desde RPC o desde una Edge Function).
create or replace function public.save_user_theme(p_theme jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_preferences (user_id, theme)
  values (auth.uid(), coalesce(p_theme, '{}'::jsonb))
  on conflict (user_id) do update
    set theme = excluded.theme,
        updated_at = now();
end $$;

grant execute on function public.save_user_theme(jsonb) to authenticated;
