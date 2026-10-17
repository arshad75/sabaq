-- Self-paced learning journey, synced to the family account. One row per learner (a student),
-- holding the same progress record the app keeps offline. Open sign-up: Google users get a
-- guardian profile named from their Google name.

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
      coalesce(
        nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 80), ''),
        nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 80), ''),
        nullif(left(trim(new.raw_user_meta_data ->> 'name'), 80), ''),
        split_part(new.email, '@', 1)
      )
    );
  end if;
  return new;
end $$;

create table public.learn_progress (
  student_id uuid primary key references public.students (id) on delete cascade,
  color text not null default 'mint' check (color in ('mint', 'sky', 'peach', 'lilac', 'sun', 'rose')),
  -- XP, days, lessons, letter strengths and badges; shape is checked by the app, size here.
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 65536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger learn_progress_touch before update on public.learn_progress
  for each row execute function public.touch_updated_at();

alter table public.learn_progress enable row level security;
revoke all on public.learn_progress from anon, authenticated;
grant select, delete on public.learn_progress to authenticated;
grant insert (student_id, color, data) on public.learn_progress to authenticated;
grant update (color, data) on public.learn_progress to authenticated;

create policy "family, the child or their teacher reads" on public.learn_progress for select to authenticated
  using (private.is_guardian_of(student_id) or private.is_student(student_id) or private.is_teacher_of(student_id));
create policy "family or the child saves" on public.learn_progress for insert to authenticated
  with check (private.is_guardian_of(student_id) or private.is_student(student_id));
create policy "family or the child updates" on public.learn_progress for update to authenticated
  using (private.is_guardian_of(student_id) or private.is_student(student_id))
  with check (private.is_guardian_of(student_id) or private.is_student(student_id));
create policy "family deletes" on public.learn_progress for delete to authenticated
  using (private.is_guardian_of(student_id));
