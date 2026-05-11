-- =============================================================================
-- R3ZON Business OS — Bucket de avatares de usuario
-- =============================================================================
-- Crea el bucket público "avatars" y políticas RLS para que cada usuario
-- pueda subir / sustituir / borrar SOLO los archivos dentro de la carpeta
-- que coincide con su user_id. Lectura pública (las URLs aparecen en el
-- menú lateral, perfil, etc.).
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- Limpieza por si se reaplica la migración.
drop policy if exists avatar_public_read on storage.objects;
drop policy if exists avatar_owner_insert on storage.objects;
drop policy if exists avatar_owner_update on storage.objects;
drop policy if exists avatar_owner_delete on storage.objects;

create policy avatar_public_read on storage.objects
  for select using (bucket_id = 'avatars');

create policy avatar_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatar_owner_update on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatar_owner_delete on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
