-- Onboarding: turn a scheduled lesson request into a child linked to the teacher's class.

alter table public.lesson_requests
  add column student_id uuid references public.students (id) on delete set null;

create function public.admin_onboard_request(p_request uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r public.lesson_requests;
  v_class uuid;
  v_child uuid;
begin
  if not private.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  select * into r from public.lesson_requests where id = p_request for update;
  if not found then raise exception 'request not found' using errcode = 'P0002'; end if;
  if r.teacher_id is null then raise exception 'assign a teacher first' using errcode = '22023'; end if;
  if r.student_id is not null then return r.student_id; end if;

  -- One class per teacher and book keeps things simple for the pilot.
  select c.id into v_class from public.classes c
   where c.teacher_id = r.teacher_id and c.book = r.book order by c.created_at limit 1;
  if v_class is null then
    insert into public.classes (teacher_id, name, book)
    values (r.teacher_id, case r.book when 'qaida' then 'Qaida students' else 'Quran students' end, r.book)
    returning id into v_class;
  end if;

  select s.id into v_child from public.students s
   where s.guardian_id = r.guardian_id and lower(s.nickname) = lower(r.child_nickname) limit 1;
  if v_child is null then
    insert into public.students (guardian_id, nickname) values (r.guardian_id, r.child_nickname)
    returning id into v_child;
  end if;

  insert into public.class_members (class_id, student_id, status, approved_by_guardian_at)
  values (v_class, v_child, 'approved', now())
  on conflict on constraint class_members_class_id_student_id_key
    do update set status = 'approved', approved_by_guardian_at = now();

  update public.lesson_requests set student_id = v_child where id = p_request;
  insert into public.audit_log (actor_id, action, entity, entity_id)
  values ((select auth.uid()), 'onboard', 'lesson_requests', p_request);
  return v_child;
end $$;

revoke execute on function public.admin_onboard_request(uuid) from public, anon;
grant execute on function public.admin_onboard_request(uuid) to authenticated;

-- The admin list also reports whether a request has been onboarded.
drop function public.admin_list_requests();
create function public.admin_list_requests()
returns table (
  id uuid, created_at timestamptz, guardian_name text, guardian_email text, child_nickname text,
  book public.book, preferred_times text, timezone text, note text, status public.lesson_request_status,
  schedule_note text, teacher_id uuid, student_id uuid
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  return query
    select r.id, r.created_at, p.display_name, u.email::text, r.child_nickname, r.book, r.preferred_times,
           r.timezone, r.note, r.status, r.schedule_note, r.teacher_id, r.student_id
    from public.lesson_requests r
    join public.profiles p on p.id = r.guardian_id
    join auth.users u on u.id = r.guardian_id
    order by (r.status = 'requested') desc, r.created_at desc;
end $$;
revoke execute on function public.admin_list_requests() from public, anon;
grant execute on function public.admin_list_requests() to authenticated;
