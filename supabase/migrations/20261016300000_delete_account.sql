-- Self-service account deletion. Deleting the auth user cascades to the profile, the
-- family's children and everything about them (lessons, marks, progress, homework, requests).
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  insert into public.audit_log (actor_id, action, entity, entity_id) values (null, 'delete_account', 'profiles', me);
  delete from auth.users where id = me;
end $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
