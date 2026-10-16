-- Onboarding a request links the child to the teacher, who can then run and save lessons.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email, aud, role, raw_user_meta_data, raw_app_meta_data) values
  ('a2000000-0000-4000-8000-000000000001', 'par@test.invalid', 'authenticated', 'authenticated', '{"display_name":"Par"}', '{}'),
  ('a2000000-0000-4000-8000-000000000002', 'adm@test.invalid', 'authenticated', 'authenticated', '{"display_name":"Adm"}', '{}'),
  ('a2000000-0000-4000-8000-000000000003', 'tea@test.invalid', 'authenticated', 'authenticated', '{"display_name":"Tea"}', '{"role":"teacher"}');
update public.profiles set is_admin = true where id = 'a2000000-0000-4000-8000-000000000002';
insert into public.lesson_requests (id, guardian_id, child_nickname, book, preferred_times, timezone, teacher_id) values
  ('a2100000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'Zara', 'qaida', 'any', 'UTC',
   'a2000000-0000-4000-8000-000000000003'),
  ('a2100000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000001', 'Noor', 'qaida', 'any', 'UTC', null);

set local role authenticated;
set local request.jwt.claims to '{"sub":"a2000000-0000-4000-8000-000000000001"}';
select throws_ok($$select public.admin_onboard_request('a2100000-0000-4000-8000-000000000001')$$, '42501', null,
                 'a parent cannot onboard themselves');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"a2000000-0000-4000-8000-000000000002"}';
select throws_ok($$select public.admin_onboard_request('a2100000-0000-4000-8000-000000000002')$$, '22023', null,
                 'a request needs a teacher before onboarding');
select lives_ok($$select public.admin_onboard_request('a2100000-0000-4000-8000-000000000001')$$,
                'the admin onboards a request');
select is((select count(*)::int from public.admin_list_requests()
           where id = 'a2100000-0000-4000-8000-000000000001' and student_id is not null), 1,
          'the request is marked as onboarded');
select lives_ok($$select public.admin_onboard_request('a2100000-0000-4000-8000-000000000001')$$,
                'onboarding twice is harmless');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"a2000000-0000-4000-8000-000000000003"}';
select is((select nickname from public.students), 'Zara', 'the teacher now sees the child');
select lives_ok(
  $$insert into public.sessions (id, class_id, teacher_id, student_id, room_code, book, ended_at, pages_covered)
    select 'a2200000-0000-4000-8000-000000000001', m.class_id, 'a2000000-0000-4000-8000-000000000003', m.student_id,
           'ABCDEF', 'qaida', now(), '{1}'
    from public.class_members m where m.status = 'approved'$$,
  'the teacher saves a lesson');
select lives_ok(
  $$insert into public.marks (session_id, student_id, mark_type, book, page, x, y, created_by)
    select s.id, s.student_id, 'good', 'qaida', 1, 0.5, 0.5, 'a2000000-0000-4000-8000-000000000003'
    from public.sessions s where s.id = 'a2200000-0000-4000-8000-000000000001'$$,
  'and its marks');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"a2000000-0000-4000-8000-000000000001"}';
select is((select count(*)::int from public.marks), 1, 'the parent sees the saved lesson''s marks');
reset role;

select * from finish();
rollback;
