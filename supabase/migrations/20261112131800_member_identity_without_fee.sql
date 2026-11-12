insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'fayda-ids',
  'fayda-ids',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "files: upload to own folder" on storage.objects;
create policy "files: upload to own folder" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('fayda-ids', 'payment-proofs')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "files: read own or admin" on storage.objects;
create policy "files: read own or admin" on storage.objects for select to authenticated
  using (
    bucket_id in ('fayda-ids', 'payment-proofs')
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "files: admin delete" on storage.objects;
create policy "files: admin delete" on storage.objects for delete to authenticated
  using (
    bucket_id in ('fayda-ids', 'payment-proofs')
    and public.is_admin()
  );

create or replace function public.submit_member_verification(p_fayda text) returns void
language plpgsql security definer set search_path = public, storage as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in before submitting identity verification';
  end if;

  if p_fayda is null or (storage.foldername(p_fayda))[1] <> auth.uid()::text then
    raise exception 'Fayda ID path must belong to the signed-in user';
  end if;

  if not exists (
    select 1 from storage.objects
     where bucket_id = 'fayda-ids' and name = p_fayda
  ) then
    raise exception 'Fayda ID file was not found in private storage';
  end if;

  update public.profiles
     set fayda_path = p_fayda,
         status = 'pending',
         reject_reason = null
   where id = auth.uid()
     and role = 'member'
     and status <> 'approved';

  if not found then
    raise exception 'Member profile not found or already approved';
  end if;

  perform public.log_action('identity_submitted', 'profile', auth.uid());
end
$$;

revoke all on function public.submit_member_verification(text) from public, anon;
grant execute on function public.submit_member_verification(text) to authenticated;

drop function if exists public.submit_membership(text, text, text);

delete from public.settings where key = 'membership_fee';