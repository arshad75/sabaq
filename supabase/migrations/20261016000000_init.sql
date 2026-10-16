-- Sabaq initial schema. Mirrors datamodels.md. Quran text is never stored, only references.
-- Access control lives here (RLS + explicit grants), not in the UI. anon gets nothing.

-- ---- Types ------------------------------------------------------------------------

create type public.app_role as enum ('guardian', 'teacher');
create type public.book as enum ('quran', 'qaida');
create type public.login_method as enum ('pin', 'magic_link');
create type public.membership_status as enum ('invited', 'approved', 'revoked');
create type public.mark_type as enum ('repeat', 'pronunciation', 'tajweed', 'slip', 'good');
create type public.page_status as enum ('not_started', 'in_progress', 'needs_work', 'solid');
create type public.progress_source as enum ('derived', 'teacher_override');
create type public.assignment_kind as enum ('new', 'recent_revision', 'old_revision');
create type public.assignment_status as enum ('assigned', 'completed', 'needs_more_work');

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---- Tables -----------------------------------------------------------------------

-- One row per guardian/teacher auth user (id = auth.users.id). Students are not profiles.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null,
  display_name text not null check (char_length(display_name) between 1 and 80),
  locale text not null default 'en' check (char_length(locale) <= 16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Children: nickname only. No birthdate, photo, or free-text fields.
create table public.students (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  -- Auth identity used by the child's tablet session; set by the server, never by clients.
  user_id uuid unique references auth.users (id) on delete set null,
  nickname text not null check (char_length(nickname) between 1 and 40),
  login_method public.login_method not null default 'pin',
  pin_hash text,
  pin_failed_count int not null default 0,
  pin_locked_until timestamptz,
  recording_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.students (guardian_id);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  book public.book not null default 'quran',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.classes (teacher_id);

create table public.class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  status public.membership_status not null default 'invited',
  approved_by_guardian_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, student_id)
);
create index on public.class_members (student_id);

-- Shareable class invite links. Only the token's hash is stored.
create table public.class_invites (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.class_invites (class_id);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  -- Kept (as null) if the class or teacher is deleted: the history belongs to the child.
  class_id uuid references public.classes (id) on delete set null,
  teacher_id uuid references public.profiles (id) on delete set null,
  student_id uuid not null references public.students (id) on delete cascade,
  room_code text not null check (room_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'),
  book public.book not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  teacher_note text not null default '' check (char_length(teacher_note) <= 500),
  pages_covered int[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);
create unique index sessions_active_room_code on public.sessions (room_code) where ended_at is null;
create index on public.sessions (student_id, started_at desc);
create index on public.sessions (teacher_id, started_at desc);

create table public.marks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  mark_type public.mark_type not null,
  book public.book not null,
  page int not null check (page between 1 and 604),
  -- Word anchor (Quran) or point anchor as 0..1 of the page image (Qaida).
  surah int check (surah between 1 and 114),
  ayah int check (ayah between 1 and 286),
  word_index int check (word_index >= 1),
  x real check (x between 0 and 1),
  y real check (y between 0 and 1),
  note text check (char_length(note) <= 200),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (surah is not null and ayah is not null and word_index is not null)
    or (x is not null and y is not null)
  )
);
create index on public.marks (session_id);
create index on public.marks (student_id);

create table public.page_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  book public.book not null,
  page int not null check (page between 1 and 604),
  status public.page_status not null,
  source public.progress_source not null default 'derived',
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, book, page)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  teacher_id uuid references public.profiles (id) on delete set null,
  kind public.assignment_kind not null,
  book public.book not null,
  from_page int not null check (from_page between 1 and 604),
  to_page int not null check (to_page between 1 and 604),
  due_on date not null,
  status public.assignment_status not null default 'assigned',
  teacher_feedback text check (char_length(teacher_feedback) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (to_page >= from_page)
);
create index on public.assignments (student_id, due_on desc);

-- Teacher's notes about a student. Visible to the guardian too (they can export everything).
create table public.teacher_notes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.teacher_notes (student_id, created_at desc);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['profiles', 'students', 'classes', 'class_members', 'class_invites', 'sessions',
                           'marks', 'page_progress', 'assignments', 'teacher_notes'] loop
    execute format('create trigger touch_updated_at before update on public.%I
                    for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---- Access helpers ---------------------------------------------------------------
-- SECURITY DEFINER so policies can check relationships without recursive RLS.
-- The private schema is not exposed through the API.

create schema private;
grant usage on schema private to authenticated;

create function private.has_role(p_role public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = p_role);
$$;

create function private.is_guardian_of(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.students s where s.id = p_student and s.guardian_id = (select auth.uid()));
$$;

create function private.is_student(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.students s where s.id = p_student and s.user_id = (select auth.uid()));
$$;

-- Only approved memberships count: revoking one removes the teacher's access immediately.
create function private.is_teacher_of(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.class_members m join public.classes c on c.id = m.class_id
    where m.student_id = p_student and m.status = 'approved' and c.teacher_id = (select auth.uid())
  );
$$;

create function private.owns_class(p_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.classes c where c.id = p_class and c.teacher_id = (select auth.uid()));
$$;

create function private.is_approved_member(p_class uuid, p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.class_members m
    where m.class_id = p_class and m.student_id = p_student and m.status = 'approved'
  );
$$;

-- A guardian or child can see classes the child is (or is being) linked to.
create function private.family_sees_class(p_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.class_members m join public.students s on s.id = m.student_id
    where m.class_id = p_class and m.status <> 'revoked'
      and (s.guardian_id = (select auth.uid()) or s.user_id = (select auth.uid()))
  );
$$;

-- Display names: your own; your child's teachers; the guardians of your approved students.
create function private.can_see_profile(p_profile uuid) returns boolean
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
    );
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

-- ---- Grants (explicit; nothing for anon) ------------------------------------------

revoke all on all tables in schema public from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, locale) on public.profiles to authenticated;

-- pin_hash, lockout state and user_id are never readable or writable by clients.
grant select (id, guardian_id, nickname, login_method, recording_consent, created_at, updated_at)
  on public.students to authenticated;
grant insert (guardian_id, nickname, login_method, recording_consent) on public.students to authenticated;
grant update (nickname, login_method, recording_consent) on public.students to authenticated;
grant delete on public.students to authenticated;

grant select, insert, update, delete on public.classes to authenticated;
grant select, delete on public.class_members to authenticated;
grant update (status, approved_by_guardian_at) on public.class_members to authenticated;
grant select, insert, delete on public.class_invites to authenticated;
grant select, insert, delete on public.sessions to authenticated;
grant update (ended_at, teacher_note, pages_covered) on public.sessions to authenticated;
grant select, insert, update, delete on public.marks to authenticated;
grant select, insert, update, delete on public.page_progress to authenticated;
grant select, insert, update, delete on public.assignments to authenticated;
grant select, insert, update, delete on public.teacher_notes to authenticated;
grant select on public.audit_log to authenticated;

-- ---- Row Level Security -----------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.class_invites enable row level security;
alter table public.sessions enable row level security;
alter table public.marks enable row level security;
alter table public.page_progress enable row level security;
alter table public.assignments enable row level security;
alter table public.teacher_notes enable row level security;
alter table public.audit_log enable row level security;

-- profiles (rows are created by the signup trigger below)
create policy "see related profiles" on public.profiles for select to authenticated
  using ((select private.can_see_profile(id)));
create policy "edit own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- students
create policy "guardian, linked teacher or the child reads" on public.students for select to authenticated
  using (guardian_id = (select auth.uid()) or (select private.is_teacher_of(id)) or user_id = (select auth.uid()));
create policy "guardian adds own child" on public.students for insert to authenticated
  with check (guardian_id = (select auth.uid()) and (select private.has_role('guardian')));
create policy "guardian edits own child" on public.students for update to authenticated
  using (guardian_id = (select auth.uid())) with check (guardian_id = (select auth.uid()));
create policy "guardian deletes own child" on public.students for delete to authenticated
  using (guardian_id = (select auth.uid()));

-- classes
create policy "teacher or linked family reads" on public.classes for select to authenticated
  using (teacher_id = (select auth.uid()) or (select private.family_sees_class(id)));
create policy "teacher creates class" on public.classes for insert to authenticated
  with check (teacher_id = (select auth.uid()) and (select private.has_role('teacher')));
create policy "teacher edits own class" on public.classes for update to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy "teacher deletes own class" on public.classes for delete to authenticated
  using (teacher_id = (select auth.uid()));

-- class_members (created only through redeem_class_invite)
create policy "class teacher or guardian reads" on public.class_members for select to authenticated
  using ((select private.owns_class(class_id)) or (select private.is_guardian_of(student_id)));
create policy "guardian approves or revokes" on public.class_members for update to authenticated
  using ((select private.is_guardian_of(student_id))) with check ((select private.is_guardian_of(student_id)));
create policy "teacher may only revoke" on public.class_members for update to authenticated
  using ((select private.owns_class(class_id))) with check ((select private.owns_class(class_id)) and status = 'revoked');
create policy "guardian removes link" on public.class_members for delete to authenticated
  using ((select private.is_guardian_of(student_id)));

-- class_invites
create policy "teacher manages invites" on public.class_invites for all to authenticated
  using ((select private.owns_class(class_id))) with check ((select private.owns_class(class_id)));

-- sessions
create policy "teacher, guardian or child reads" on public.sessions for select to authenticated
  using (
    (teacher_id = (select auth.uid()) and (select private.is_teacher_of(student_id)))
    or (select private.is_guardian_of(student_id))
    or (select private.is_student(student_id))
  );
create policy "teacher starts session for approved student" on public.sessions for insert to authenticated
  with check (
    teacher_id = (select auth.uid())
    and (select private.owns_class(class_id))
    and (select private.is_approved_member(class_id, student_id))
  );
create policy "teacher updates own session" on public.sessions for update to authenticated
  using (teacher_id = (select auth.uid()) and (select private.is_teacher_of(student_id)))
  with check (teacher_id = (select auth.uid()));
create policy "guardian deletes child session" on public.sessions for delete to authenticated
  using ((select private.is_guardian_of(student_id)));

-- marks
create policy "teacher, guardian or child reads" on public.marks for select to authenticated
  using (
    (select private.is_teacher_of(student_id))
    or (select private.is_guardian_of(student_id))
    or (select private.is_student(student_id))
  );
create policy "teacher marks in own session" on public.marks for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select private.is_teacher_of(student_id))
    and exists (
      select 1 from public.sessions s
      where s.id = session_id and s.teacher_id = (select auth.uid()) and s.student_id = marks.student_id
    )
  );
create policy "teacher edits own marks" on public.marks for update to authenticated
  using (created_by = (select auth.uid()) and (select private.is_teacher_of(student_id)))
  with check (created_by = (select auth.uid()) and (select private.is_teacher_of(student_id)));
create policy "teacher or guardian deletes" on public.marks for delete to authenticated
  using (
    (created_by = (select auth.uid()) and (select private.is_teacher_of(student_id)))
    or (select private.is_guardian_of(student_id))
  );

-- page_progress
create policy "teacher, guardian or child reads" on public.page_progress for select to authenticated
  using (
    (select private.is_teacher_of(student_id))
    or (select private.is_guardian_of(student_id))
    or (select private.is_student(student_id))
  );
create policy "teacher records progress" on public.page_progress for insert to authenticated
  with check ((select private.is_teacher_of(student_id)) and updated_by = (select auth.uid()));
create policy "teacher updates progress" on public.page_progress for update to authenticated
  using ((select private.is_teacher_of(student_id)))
  with check ((select private.is_teacher_of(student_id)) and updated_by = (select auth.uid()));
create policy "guardian deletes progress" on public.page_progress for delete to authenticated
  using ((select private.is_guardian_of(student_id)));

-- assignments
create policy "teacher, guardian or child reads" on public.assignments for select to authenticated
  using (
    (teacher_id = (select auth.uid()) and (select private.is_teacher_of(student_id)))
    or (select private.is_guardian_of(student_id))
    or (select private.is_student(student_id))
  );
create policy "teacher assigns" on public.assignments for insert to authenticated
  with check (teacher_id = (select auth.uid()) and (select private.is_teacher_of(student_id)));
create policy "teacher updates own assignment" on public.assignments for update to authenticated
  using (teacher_id = (select auth.uid()) and (select private.is_teacher_of(student_id)))
  with check (teacher_id = (select auth.uid()) and (select private.is_teacher_of(student_id)));
create policy "teacher or guardian deletes" on public.assignments for delete to authenticated
  using (
    (teacher_id = (select auth.uid()) and (select private.is_teacher_of(student_id)))
    or (select private.is_guardian_of(student_id))
  );

-- teacher_notes
create policy "author teacher or guardian reads" on public.teacher_notes for select to authenticated
  using (
    (teacher_id = (select auth.uid()) and (select private.is_teacher_of(student_id)))
    or (select private.is_guardian_of(student_id))
  );
create policy "teacher writes notes" on public.teacher_notes for insert to authenticated
  with check (teacher_id = (select auth.uid()) and (select private.is_teacher_of(student_id)));
create policy "teacher edits own notes" on public.teacher_notes for update to authenticated
  using (teacher_id = (select auth.uid()) and (select private.is_teacher_of(student_id)))
  with check (teacher_id = (select auth.uid()));
create policy "teacher or guardian deletes" on public.teacher_notes for delete to authenticated
  using (teacher_id = (select auth.uid()) or (select private.is_guardian_of(student_id)));

-- audit_log (written only by SECURITY DEFINER functions or the server)
create policy "read own audit entries" on public.audit_log for select to authenticated
  using (actor_id = (select auth.uid()));

-- ---- Functions --------------------------------------------------------------------

-- Signup creates the profile. Only guardian/teacher are accepted; other users (e.g. a
-- child's tablet identity created by the server) get no profile.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r text := new.raw_user_meta_data ->> 'role';
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

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Guardian sets a 4-digit PIN for their own child. Only a bcrypt hash is kept.
create function public.set_student_pin(p_student uuid, p_pin text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be 4 digits' using errcode = '22023';
  end if;
  update public.students
     set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 8)),
         pin_failed_count = 0,
         pin_locked_until = null
   where id = p_student and guardian_id = (select auth.uid());
  if not found then
    raise exception 'not your child' using errcode = '42501';
  end if;
  insert into public.audit_log (actor_id, action, entity, entity_id)
  values ((select auth.uid()), 'set_pin', 'students', p_student);
end $$;

-- Server-only PIN check with lockout: 5 wrong tries lock the child out for 60 seconds.
create function public.verify_student_pin(p_student uuid, p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.students;
begin
  select * into s from public.students where id = p_student for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'wrong', 'attempts_left', 0);
  end if;
  if s.pin_locked_until > now() then
    return jsonb_build_object('ok', false, 'reason', 'locked',
      'retry_in_s', ceil(extract(epoch from s.pin_locked_until - now())));
  end if;
  if s.pin_hash is not null and p_pin ~ '^[0-9]{4}$' and extensions.crypt(p_pin, s.pin_hash) = s.pin_hash then
    update public.students set pin_failed_count = 0, pin_locked_until = null where id = p_student;
    return jsonb_build_object('ok', true);
  end if;
  if s.pin_failed_count + 1 >= 5 then
    update public.students set pin_failed_count = 0, pin_locked_until = now() + interval '60 seconds'
     where id = p_student;
    return jsonb_build_object('ok', false, 'reason', 'locked', 'retry_in_s', 60);
  end if;
  update public.students set pin_failed_count = s.pin_failed_count + 1 where id = p_student;
  return jsonb_build_object('ok', false, 'reason', 'wrong', 'attempts_left', 5 - (s.pin_failed_count + 1));
end $$;

-- Guardian links their child to a class using a teacher's invite token.
-- The guardian is the one acting, so the link is approved straight away.
create function public.redeem_class_invite(p_token text, p_student uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  inv public.class_invites;
  member_id uuid;
begin
  if not private.is_guardian_of(p_student) then
    raise exception 'not your child' using errcode = '42501';
  end if;
  select * into inv from public.class_invites
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and expires_at > now();
  if not found then
    raise exception 'invite expired or not found' using errcode = 'P0002';
  end if;
  insert into public.class_members (class_id, student_id, status, approved_by_guardian_at)
  values (inv.class_id, p_student, 'approved', now())
  on conflict (class_id, student_id)
    do update set status = 'approved', approved_by_guardian_at = now()
  returning id into member_id;
  insert into public.audit_log (actor_id, action, entity, entity_id)
  values ((select auth.uid()), 'approve_teacher', 'class_members', member_id);
  return member_id;
end $$;

revoke execute on function public.set_student_pin(uuid, text) from public, anon;
revoke execute on function public.verify_student_pin(uuid, text) from public, anon, authenticated;
revoke execute on function public.redeem_class_invite(text, uuid) from public, anon;
grant execute on function public.set_student_pin(uuid, text) to authenticated;
grant execute on function public.redeem_class_invite(text, uuid) to authenticated;
grant execute on function public.verify_student_pin(uuid, text) to service_role;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
