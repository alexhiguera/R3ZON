-- =============================================================================
-- R3ZON Business OS — Extensión CRM + Kanban
-- Ejecutar después de schema.sql y auth_extension.sql
-- =============================================================================

-- 1. COMUNICACIONES (historial de contacto por cliente)
create table if not exists public.comunicaciones (
  id          uuid primary key default uuid_generate_v4(),
  negocio_id  uuid not null references public.perfiles_negocio(id) on delete cascade,
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  tipo        text not null, -- nota|email_click|whatsapp_click|webhook_fire|llamada|cita
  asunto      text,
  contenido   text,
  metadata    jsonb default '{}',   -- url, status_code, etc.
  leido       boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_com_cliente   on public.comunicaciones(cliente_id);
create index if not exists idx_com_negocio   on public.comunicaciones(negocio_id, created_at desc);

alter table public.comunicaciones enable row level security;
drop policy if exists tenant_isolation on public.comunicaciones;
create policy tenant_isolation on public.comunicaciones
  for all using      (negocio_id = public.current_negocio_id())
  with check         (negocio_id = public.current_negocio_id());

-- 2. KANBAN_COLUMNAS (columnas personalizadas por negocio)
-- (Las columnas webhook_url / webhook_activo de clientes ya están en schema.sql)
create table if not exists public.kanban_columnas (
  id         uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references public.perfiles_negocio(id) on delete cascade,
  nombre     text not null,
  slug       text not null,   -- identificador estable usado en tareas_kanban.columna
  color      text not null default '#818cf8',
  posicion   integer not null default 0,
  created_at timestamptz not null default now(),
  unique (negocio_id, slug)
);
create index if not exists idx_columnas_negocio on public.kanban_columnas(negocio_id, posicion);

alter table public.kanban_columnas enable row level security;
drop policy if exists tenant_isolation on public.kanban_columnas;
create policy tenant_isolation on public.kanban_columnas
  for all using      (negocio_id = public.current_negocio_id())
  with check         (negocio_id = public.current_negocio_id());

-- Columnas por defecto al crear un negocio
create or replace function public.tg_seed_kanban_columnas()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.kanban_columnas (negocio_id, nombre, slug, color, posicion) values
    (new.id, 'Pendiente',    'pendiente',    '#818cf8', 0),
    (new.id, 'En curso',     'en_curso',     '#22d3ee', 1),
    (new.id, 'Revisión',     'revision',     '#fb923c', 2),
    (new.id, 'Completado',   'hecho',        '#34d399', 3)
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists seed_kanban on public.perfiles_negocio;
create trigger seed_kanban
  after insert on public.perfiles_negocio
  for each row execute function public.tg_seed_kanban_columnas();

-- 4. Añadir columna_id a tareas_kanban (mantenemos columna text para compatibilidad)
alter table public.tareas_kanban
  add column if not exists columna_id uuid references public.kanban_columnas(id) on delete set null;

-- 5. RPC: Reordenar tareas tras drag & drop
create or replace function public.reordenar_tarea(
  p_tarea_id   uuid,
  p_columna    text,
  p_posicion   integer
) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.tareas_kanban
     set columna = p_columna, posicion = p_posicion, updated_at = now()
   where id = p_tarea_id
     and negocio_id = public.current_negocio_id();
end $$;

-- 6. RPC: Batch — reordenar varias tareas en una sola llamada.
-- Cada item: { id: uuid, columna: text, posicion: int }
create or replace function public.reordenar_tareas_batch(p_updates jsonb)
returns void language plpgsql security definer set search_path = public as $$
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

-- 7. RPC: Batch — reordenar columnas tras drag & drop horizontal.
-- Cada item: { id: uuid, posicion: int }
create or replace function public.reordenar_columnas_batch(p_updates jsonb)
returns void language plpgsql security definer set search_path = public as $$
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
