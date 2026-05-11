-- =============================================================================
-- R3ZON Business OS — Bucket de imágenes de productos
-- =============================================================================
-- Crea el bucket público "producto-imagenes" y políticas RLS:
--   · Lectura: pública (las URLs se incrustan en TPV y catálogo).
--   · Escritura: sólo usuarios autenticados Y dentro de la carpeta que
--                coincide con el negocio_id del que son dueños.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('producto-imagenes', 'producto-imagenes', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists prod_img_public_read on storage.objects;
drop policy if exists prod_img_owner_write on storage.objects;
drop policy if exists prod_img_owner_update on storage.objects;
drop policy if exists prod_img_owner_delete on storage.objects;

create policy prod_img_public_read on storage.objects
  for select using (bucket_id = 'producto-imagenes');

create policy prod_img_owner_write on storage.objects
  for insert with check (
    bucket_id = 'producto-imagenes'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = public.current_negocio_id()::text
  );

create policy prod_img_owner_update on storage.objects
  for update using (
    bucket_id = 'producto-imagenes'
    and (storage.foldername(name))[1] = public.current_negocio_id()::text
  );

create policy prod_img_owner_delete on storage.objects
  for delete using (
    bucket_id = 'producto-imagenes'
    and (storage.foldername(name))[1] = public.current_negocio_id()::text
  );
