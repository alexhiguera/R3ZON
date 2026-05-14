-- =============================================================================
-- R3ZON Business OS — Hardening de Storage y `admin_global`
-- =============================================================================
-- Aplica DESPUÉS de:
--   - documentos_recibo_logos_ext.sql
--   - perfil_usuario_ext.sql
--   - inventario_imagenes_ext.sql
--   - roles_ext.sql
--
-- Idempotente: ejecuta todas las veces que quieras.
--
-- Cierra 3 hallazgos detectados en la auditoría:
--   1) Bucket `logos`: lectura totalmente pública (cualquier anónimo leía logos
--      de cualquier tenant). Pasa a lectura sólo para miembros del negocio.
--      Para mostrar logos en documentos compartidos externamente (factura
--      enviada a un cliente), genera **Signed URLs** desde la app:
--         supabase.storage.from('logos').createSignedUrl(path, ttlSeconds)
--   2) Buckets `avatars` y `producto-imagenes`: misma fuga, mismo fix.
--   3) `admin_global.admin_global_self_read`: permitía a un admin leer las filas
--      de los demás admins. Pasa a `user_id = auth.uid()`.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0. Helper: dado un path de Storage cuya primera carpeta es un negocio_id,
--    determina si el usuario actual pertenece a ese negocio (titular o miembro).
-- -----------------------------------------------------------------------------
create or replace function public.storage_path_is_in_my_negocio(p_name text)
returns boolean
language sql stable security definer set search_path = public as $$
  with first_folder as (
    select (storage.foldername(p_name))[1] as ng
  )
  select exists (
    select 1
      from first_folder f
      join public.perfiles_negocio pn on pn.id::text = f.ng
     where pn.user_id = auth.uid()
    union all
    select 1
      from first_folder f
      join public.miembros_negocio mn on mn.negocio_id::text = f.ng
     where mn.user_id = auth.uid()
       and coalesce(mn.estado, 'activo') = 'activo'
  );
$$;

revoke all on function public.storage_path_is_in_my_negocio(text) from public, anon;
grant execute on function public.storage_path_is_in_my_negocio(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 1. Bucket `logos`  →  sólo lectura para miembros del negocio dueño.
--    El bucket sigue marcado como público=true porque el cliente puede leer
--    el objeto vía signed URL; las policies son las que aplican para acceso
--    autenticado directo.
-- -----------------------------------------------------------------------------
drop policy if exists "logos public read"            on storage.objects;
drop policy if exists "logos read own negocio"       on storage.objects;
create policy "logos read own negocio" on storage.objects
  for select using (
    bucket_id = 'logos'
    and auth.role() = 'authenticated'
    and public.storage_path_is_in_my_negocio(name)
  );

-- -----------------------------------------------------------------------------
-- 2. Bucket `producto-imagenes`  →  sólo lectura para miembros del negocio.
-- -----------------------------------------------------------------------------
drop policy if exists prod_img_public_read     on storage.objects;
drop policy if exists prod_img_read_own_negocio on storage.objects;
create policy prod_img_read_own_negocio on storage.objects
  for select using (
    bucket_id = 'producto-imagenes'
    and auth.role() = 'authenticated'
    and public.storage_path_is_in_my_negocio(name)
  );

-- -----------------------------------------------------------------------------
-- 3. Bucket `avatars`  →  lectura sólo para usuarios autenticados.
--    (Path convention: `<auth.uid()>/<file>`. No es estrictamente per-tenant
--    porque el avatar es del usuario, no del negocio; pero como mínimo
--    cerramos el acceso anónimo.)
-- -----------------------------------------------------------------------------
drop policy if exists avatar_public_read        on storage.objects;
drop policy if exists avatar_authenticated_read on storage.objects;
create policy avatar_authenticated_read on storage.objects
  for select using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  );

-- -----------------------------------------------------------------------------
-- 4. `admin_global` →  cada admin sólo se ve a sí mismo.
--    (Antes: si eras admin podías leer las filas de los demás admins.)
-- -----------------------------------------------------------------------------
drop policy if exists admin_global_self_read on public.admin_global;
create policy admin_global_self_read on public.admin_global
  for select using ( user_id = auth.uid() );

commit;
