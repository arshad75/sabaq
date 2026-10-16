-- Public sign-up: parents ask for a first lesson; an admin schedules it and assigns a teacher.

alter table public.profiles add column is_admin boolean not null default false;

-- Public sign-ups are always parents. Only server-set app metadata can make a teacher, or mark
-- a child's tablet identity (which gets no profile). Admins promote teachers with admin_set_role.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r text := coalesce(new.raw_app_meta_data ->> 'role', 'guardian');
begin
  if r in ('guardian', 'teacher') then
    insert into public.profiles (id, role, display_name)
    values (
      new.id,
      r::public.app_role,
      coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 80), ''), split_part(new.email, '@', 1))
    );
  end if;
  return new;
end $$;

create type public.lesson_request_status as enum ('requested', 'scheduled', 'done', 'cancelled');

create table public.lesson_requests (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  child_nickname text not null check (char_length(child_nickname) between 1 and 40),
  book public.book not null default 'qaida',
  preferred_times text not null check (char_length(preferred_times) between 1 and 200),
  timezone text not null check (char_length(timezone) between 1 and 64),
  note text check (char_length(note) <= 300),
  status public.lesson_request_status not null default 'requested',
  -- Free text so the admin can write the time in the family's own words, e.g. "Sat 5pm Sydney".
  schedule_note text check (char_length(schedule_note) <= 200),
  teacher_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.lesson_requests (guardian_id, created_at desc);
create trigger touch_updated_at before update on public.lesson_requests
  for each row execute function public.touch_updated_at();

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin);
$$;

-- Parents may also see the name of the teacher assigned to their lesson request.
create or replace function private.can_see_profile(p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_profile = (select auth.uid())
    or exists (
      select 1 from public.classes c
      join public.class_members m on m.class_id = c.id
      join public.students s on s.id = m.student_id
      where c.teacher_id = p_profile and m.status <> 'revoked'
        and (s.guardian_id = (select auth.uid()) or s.user_id = (select auth.uid()))
    )
    or exists (
      select 1 from public.students s
      join public.class_members m on m.student_id = s.id
      join public.classes c on c.id = m.class_id
      where s.guardian_id = p_profile and m.status = 'approved' and c.teacher_id = (select auth.uid())
    )
    or exists (
      select 1 from public.lesson_requests r
      where r.teacher_id = p_profile and r.guardian_id = (select auth.uid())
    );
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

revoke all on public.lesson_requests from anon, authenticated;
grant select on public.lesson_requests to authenticated;
grant insert (child_nickname, book, preferred_times, timezone, note) on public.lesson_requests to authenticated;

alter table public.lesson_requests enable row level security;
create policy "parent reads own requests" on public.lesson_requests for select to authenticated
  using (guardian_id = (select auth.uid()) or (select private.is_admin()));
create policy "parent asks for a lesson" on public.lesson_requests for insert to authenticated
  with check (guardian_id = (select auth.uid()) and (select private.has_role('guardian')));

-- ---- Admin functions (each checks the caller is an admin) -------------------------

create function public.admin_list_requests()
returns table (
  id uuid, created_at timestamptz, guardian_name text, guardian_email text, child_nickname text,
  book public.book, preferred_times text, timezone text, note text, status public.lesson_request_status,
  schedule_note text, teacher_id uuid
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  return query
    select r.id, r.created_at, p.display_name, u.email::text, r.child_nickname, r.book, r.preferred_times,
           r.timezone, r.note, r.status, r.schedule_note, r.teacher_id
    from public.lesson_requests r
    join public.profiles p on p.id = r.guardian_id
    join auth.users u on u.id = r.guardian_id
    order by (r.status = 'requested') desc, r.created_at desc;
end $$;

create function public.admin_list_people()
returns table (id uuid, display_name text, email text, role public.app_role, is_admin boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  return query
    select p.id, p.display_name, u.email::text, p.role, p.is_admin, p.created_at
    from public.profiles p join auth.users u on u.id = p.id
    order by p.created_at desc;
end $$;

create function public.admin_update_request(
  p_id uuid, p_status public.lesson_request_status, p_schedule_note text, p_teacher uuid
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  if p_teacher is not null and not exists (select 1 from public.profiles where id = p_teacher and role = 'teacher') then
    raise exception 'not a teacher' using errcode = '22023';
  end if;
  update public.lesson_requests
     set status = p_status, schedule_note = nullif(left(trim(p_schedule_note), 200), ''), teacher_id = p_teacher
   where id = p_id;
  if not found then raise exception 'request not found' using errcode = 'P0002'; end if;
  insert into public.audit_log (actor_id, action, entity, entity_id)
  values ((select auth.uid()), 'update_request', 'lesson_requests', p_id);
end $$;

create function public.admin_set_role(p_profile uuid, p_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  update public.profiles set role = p_role where id = p_profile;
  if not found then raise exception 'person not found' using errcode = 'P0002'; end if;
  insert into public.audit_log (actor_id, action, entity, entity_id)
  values ((select auth.uid()), 'set_role_' || p_role::text, 'profiles', p_profile);
end $$;

revoke execute on function public.admin_list_requests() from public, anon;
revoke execute on function public.admin_list_people() from public, anon;
revoke execute on function public.admin_update_request(uuid, public.lesson_request_status, text, uuid) from public, anon;
revoke execute on function public.admin_set_role(uuid, public.app_role) from public, anon;
grant execute on function public.admin_list_requests() to authenticated;
grant execute on function public.admin_list_people() to authenticated;
grant execute on function public.admin_update_request(uuid, public.lesson_request_status, text, uuid) to authenticated;
grant execute on function public.admin_set_role(uuid, public.app_role) to authenticated;
