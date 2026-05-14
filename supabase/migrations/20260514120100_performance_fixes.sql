-- =============================================================================
-- R3ZON Business OS — Performance fixes (Supabase Database Linter)
-- =============================================================================
-- Resuelve:
--   A) auth_rls_initplan: envuelve auth.uid() en (select auth.uid()) para que
--      Postgres lo evalúe UNA vez por query, no por fila.
--   B) multiple_permissive_policies: consolida pares de policies permisivas
--      duplicadas en una sola con OR.
--   C) unindexed_foreign_keys: crea índices sobre columnas FK donde faltan.
--   D) unused_index: elimina índices marcados como nunca usados por el linter.
--
-- Idempotente: todos los drop/create usan IF EXISTS / IF NOT EXISTS.
-- =============================================================================

begin;

-- =============================================================================
-- A) Wrapping de auth.uid() en políticas RLS
-- =============================================================================

-- A.1) public.perfiles_negocio -----------------------------------------------
drop policy if exists perfiles_owner on public.perfiles_negocio;
create policy perfiles_owner on public.perfiles_negocio
  for all
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A.2) public.dispositivos_conocidos -----------------------------------------
drop policy if exists devices_owner on public.dispositivos_conocidos;
create policy devices_owner on public.dispositivos_conocidos
  for all
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A.3) public.google_connections ---------------------------------------------
drop policy if exists google_owner on public.google_connections;
create policy google_owner on public.google_connections
  for all
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A.4) public.pagos_stripe ---------------------------------------------------
drop policy if exists pagos_owner on public.pagos_stripe;
create policy pagos_owner on public.pagos_stripe
  for select using (
    exists (
      select 1 from public.perfiles_negocio p
       where p.id = pagos_stripe.negocio_id
         and p.user_id = (select auth.uid())
    )
  );

-- A.5) public.user_preferences -----------------------------------------------
drop policy if exists user_prefs_owner on public.user_preferences;
create policy user_prefs_owner on public.user_preferences
  for all
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- =============================================================================
-- B) Consolidación de políticas permisivas duplicadas
-- =============================================================================

-- B.1) public.fichajes --------------------------------------------------------
-- Las policies originales fichajes_self_read (user_id = auth.uid()) y
-- fichajes_owner_read (owner del negocio_id) son ambas SELECT permisivas para
-- authenticated → el planner las evalúa por separado. Consolidamos en una
-- sola policy con OR. fichajes_self_insert se queda intacta (es INSERT, no
-- entra en el multiple_permissive_policies), pero también se reenvuelve con
-- (select auth.uid()).
drop policy if exists fichajes_self_read   on public.fichajes;
drop policy if exists fichajes_owner_read  on public.fichajes;
drop policy if exists fichajes_read        on public.fichajes;
create policy fichajes_read on public.fichajes
  for select using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.perfiles_negocio p
       where p.id = fichajes.negocio_id
         and p.user_id = (select auth.uid())
    )
  );

drop policy if exists fichajes_self_insert on public.fichajes;
create policy fichajes_self_insert on public.fichajes
  for insert with check (
    user_id = (select auth.uid())
    and (
      exists (select 1 from public.perfiles_negocio p
               where p.id = fichajes.negocio_id
                 and p.user_id = (select auth.uid()))
      or exists (select 1 from public.miembros_negocio m
                  where m.negocio_id = fichajes.negocio_id
                    and m.user_id = (select auth.uid())
                    and m.estado = 'activo')
    )
  );

-- B.2) public.miembros_negocio ------------------------------------------------
-- miembros_owner (FOR ALL, owner del negocio) + miembros_self_read (SELECT,
-- la propia fila) generan duplicado permissive en SELECT. Consolidamos la
-- lectura en miembros_read y mantenemos miembros_write para INSERT/UPDATE/DELETE.
drop policy if exists miembros_owner     on public.miembros_negocio;
drop policy if exists miembros_self_read on public.miembros_negocio;
drop policy if exists miembros_read      on public.miembros_negocio;
drop policy if exists miembros_write     on public.miembros_negocio;

create policy miembros_read on public.miembros_negocio
  for select using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.perfiles_negocio p
       where p.id = miembros_negocio.negocio_id
         and p.user_id = (select auth.uid())
    )
  );

create policy miembros_write on public.miembros_negocio
  for all
  using (
    exists (
      select 1 from public.perfiles_negocio p
       where p.id = miembros_negocio.negocio_id
         and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.perfiles_negocio p
       where p.id = miembros_negocio.negocio_id
         and p.user_id = (select auth.uid())
    )
  );

-- B.3) public.terminos_versiones ---------------------------------------------
-- terminos_versiones es una tabla de "documentos legales" global. Habilitamos
-- RLS (estaba sin RLS) y dejamos UNA policy de SELECT para authenticated +
-- una policy de escritura sólo para admin_global. Separamos escritura por
-- acción para evitar enmascarar la lectura.
alter table public.terminos_versiones enable row level security;

drop policy if exists terminos_owner_write on public.terminos_versiones;
drop policy if exists terminos_read_all    on public.terminos_versiones;
drop policy if exists terminos_admin_insert on public.terminos_versiones;
drop policy if exists terminos_admin_update on public.terminos_versiones;
drop policy if exists terminos_admin_delete on public.terminos_versiones;

create policy terminos_read_all on public.terminos_versiones
  for select to authenticated using ( true );

create policy terminos_admin_insert on public.terminos_versiones
  for insert to authenticated with check (
    exists (select 1 from public.admin_global a
             where a.user_id = (select auth.uid()))
  );

create policy terminos_admin_update on public.terminos_versiones
  for update to authenticated
  using (
    exists (select 1 from public.admin_global a
             where a.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.admin_global a
             where a.user_id = (select auth.uid()))
  );

create policy terminos_admin_delete on public.terminos_versiones
  for delete to authenticated using (
    exists (select 1 from public.admin_global a
             where a.user_id = (select auth.uid()))
  );

-- =============================================================================
-- C) Índices faltantes en foreign keys
-- =============================================================================
-- Todas las columnas listadas existen en el esquema actual (verificado en los
-- .sql fuente). No se omite ninguna.

create index if not exists idx_documentos_cliente_id
  on public.documentos(cliente_id);
create index if not exists idx_documentos_finanza_id
  on public.documentos(finanza_id);

create index if not exists idx_finanzas_cliente_id
  on public.finanzas(cliente_id);

create index if not exists idx_tareas_kanban_cliente_id
  on public.tareas_kanban(cliente_id);
create index if not exists idx_tareas_kanban_columna_id
  on public.tareas_kanban(columna_id);

create index if not exists idx_tpv_ventas_cliente_id
  on public.tpv_ventas(cliente_id);
create index if not exists idx_tpv_ventas_user_id
  on public.tpv_ventas(user_id);

create index if not exists idx_tpv_venta_items_negocio_id
  on public.tpv_venta_items(negocio_id);
create index if not exists idx_tpv_venta_items_producto_id
  on public.tpv_venta_items(producto_id);

create index if not exists idx_stock_movimientos_user_id
  on public.stock_movimientos(user_id);

create index if not exists idx_gastos_proveedor_proveedor_id
  on public.gastos_proveedor(proveedor_id);

create index if not exists idx_miembros_negocio_invited_by
  on public.miembros_negocio(invited_by);

create index if not exists idx_fichajes_corrige_a
  on public.fichajes(corrige_a);

-- =============================================================================
-- D) Drop de índices no usados
-- =============================================================================

drop index if exists public.idx_clientes_negocio;
drop index if exists public.idx_contactos_negocio;
drop index if exists public.idx_config_negocio;
drop index if exists public.idx_pagos_negocio;
drop index if exists public.idx_google_negocio;
drop index if exists public.idx_productos_negocio_activo;
drop index if exists public.idx_miembros_user;
drop index if exists public.idx_stock_mov_producto;
drop index if exists public.idx_gastos_negocio_tipo;
drop index if exists public.idx_gastos_proveedor;
drop index if exists public.idx_proveedores_negocio;
drop index if exists public.idx_proveedores_categoria;

-- Índices de las tablas *_archivo creadas con `LIKE ... INCLUDING ALL`.
-- Postgres autogenera nombres a partir de las columnas del índice del padre.
-- Listamos cada candidato por separado con IF EXISTS para que sea seguro
-- aunque alguno no exista en una instalación dada.

-- fichajes_archivo (clonado de fichajes: idx_fichajes_user_ts, idx_fichajes_negocio_ts)
drop index if exists public.idx_fichajes_archivo_user_ts;
drop index if exists public.idx_fichajes_archivo_negocio_ts;
drop index if exists public.fichajes_archivo_user_id_ts_idx;
drop index if exists public.fichajes_archivo_negocio_id_ts_idx;

-- stock_movimientos_archivo (clonado: idx_stock_mov_producto, idx_stock_mov_negocio)
drop index if exists public.idx_stock_movimientos_archivo_producto;
drop index if exists public.idx_stock_movimientos_archivo_negocio;
drop index if exists public.stock_movimientos_archivo_producto_id_ts_idx;
drop index if exists public.stock_movimientos_archivo_negocio_id_ts_idx;

-- tpv_ventas_archivo (clonado: idx_tpv_ventas_estado)
drop index if exists public.idx_tpv_ventas_archivo_estado;
drop index if exists public.tpv_ventas_archivo_negocio_id_estado_abierta_at_idx;

-- tpv_venta_items_archivo (clonado: idx_tpv_items_venta)
drop index if exists public.idx_tpv_venta_items_archivo_venta;
drop index if exists public.tpv_venta_items_archivo_venta_id_idx;

commit;
