-- Admin can delete a member: removes profile and auth user
create or replace function public.delete_member(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  -- Ensure the target is a member (not an admin)
  if not exists(select 1 from public.profiles where id = p_user and role = 'member') then
    raise exception 'Member not found';
  end if;
  -- Log before deletion
  perform public.log_action('member_deleted', 'profile', p_user);
  -- Delete the auth user (cascades to profiles and all related data)
  delete from auth.users where id = p_user;
end $$;

grant execute on function public.delete_member(uuid) to authenticated;
