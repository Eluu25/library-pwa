alter table public.books
  add column if not exists cover_url text;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'book-covers',
  'book-covers',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "book covers: public read" on storage.objects;
create policy "book covers: public read" on storage.objects for select
  using (bucket_id = 'book-covers');

drop policy if exists "book covers: admin upload" on storage.objects;
create policy "book covers: admin upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'book-covers' and public.is_admin());

drop policy if exists "book covers: admin update" on storage.objects;
create policy "book covers: admin update" on storage.objects for update to authenticated
  using (bucket_id = 'book-covers' and public.is_admin())
  with check (bucket_id = 'book-covers' and public.is_admin());

drop policy if exists "book covers: admin delete" on storage.objects;
create policy "book covers: admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'book-covers' and public.is_admin());