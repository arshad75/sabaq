-- Lesson requests and admin functions. Run with: pnpm db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('a1000000-0000-4000-8000-000000000001', 'parent1@test.invalid', 'authenticated', 'authenticated', '{"role":"guardian","display_name":"P1"}'),
  ('a1000000-0000-4000-8000-000000000002', 'parent2@test.invalid', 'authenticated', 'authenticated', '{"role":"guardian","display_name":"P2"}'),
  ('a1000000-0000-4000-8000-000000000003', 'admin@test.invalid', 'authenticated', 'authenticated', '{"role":"guardian","display_name":"Admin"}'),
  ('a1000000-0000-4000-8000-000000000004', 'teach@test.invalid', 'authenticated', 'authenticated', '{"role":"guardian","display_name":"Soon teacher"}');
update public.profiles set is_admin = true where id = 'a1000000-0000-4000-8000-000000000003';

-- Parent 1
set local role authenticated;
set local request.jwt.claims to '{"sub":"a1000000-0000-4000-8000-000000000001"}';
select lives_ok(
  $$insert into public.lesson_requests (child_nickname, book, preferred_times, timezone)
    values ('Kid', 'qaida', 'Weekday evenings', 'Australia/Sydney')$$,
  'a parent can ask for a lesson');
select throws_ok(
  $$insert into public.lesson_requests (guardian_id, child_nickname, preferred_times, timezone)
    values ('a1000000-0000-4000-8000-000000000002', 'X', 'any', 'UTC')$$,
  '42501', null, 'a parent cannot ask on someone else''s behalf');
select throws_ok(
  $$insert into public.lesson_requests (child_nickname, preferred_times, timezone, status)
    values ('X', 'any', 'UTC', 'scheduled')$$,
  '42501', null, 'a parent cannot set the status');
select throws_ok($$select public.admin_list_requests()$$, '42501', null, 'a parent cannot list all requests');
select throws_ok($$select public.admin_set_role('a1000000-0000-4000-8000-000000000001', 'teacher')$$, '42501', null,
                 'a parent cannot make themselves a teacher');
select throws_ok($$update public.profiles set is_admin = true where id = 'a1000000-0000-4000-8000-000000000001'$$,
                 '42501', null, 'a parent cannot make themselves an admin');
reset role;

-- Parent 2 sees nothing of parent 1
set local role authenticated;
set local request.jwt.claims to '{"sub":"a1000000-0000-4000-8000-000000000002"}';
select is((select count(*)::int from public.lesson_requests), 0, 'parents cannot see each other''s requests');
reset role;

-- Admin
set local role authenticated;
set local request.jwt.claims to '{"sub":"a1000000-0000-4000-8000-000000000003"}';
select is((select count(*)::int from public.admin_list_requests() where guardian_email = 'parent1@test.invalid'), 1,
          'the admin sees every request with the parent''s email');
select lives_ok($$select public.admin_set_role('a1000000-0000-4000-8000-000000000004', 'teacher')$$,
                'the admin can make someone a teacher');
select lives_ok(
  $$select public.admin_update_request(
      (select id from public.lesson_requests where guardian_id = 'a1000000-0000-4000-8000-000000000001'), 'scheduled', 'Sat 5pm Sydney',
      'a1000000-0000-4000-8000-000000000004')$$,
  'the admin schedules a request with a teacher');
reset role;

-- Parent 1 sees the schedule and the teacher's name
set local role authenticated;
set local request.jwt.claims to '{"sub":"a1000000-0000-4000-8000-000000000001"}';
select is((select status::text || '|' || schedule_note from public.lesson_requests), 'scheduled|Sat 5pm Sydney',
          'the parent sees the scheduled time');
select is((select display_name from public.profiles where id = 'a1000000-0000-4000-8000-000000000004'), 'Soon teacher',
          'the parent sees the assigned teacher''s name');
reset role;

select * from finish();
rollback;
