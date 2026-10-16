-- RLS tests (CLAUDE.md rule 4). Run with: pnpm db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

-- ---- Fixtures (as postgres) -------------------------------------------------------
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-000000000001', 'ta@test.invalid', 'authenticated', 'authenticated', '{"role":"teacher","display_name":"Teacher A"}'),
  ('a0000000-0000-4000-8000-000000000002', 'tb@test.invalid', 'authenticated', 'authenticated', '{"role":"teacher","display_name":"Teacher B"}'),
  ('b0000000-0000-4000-8000-000000000001', 'ga@test.invalid', 'authenticated', 'authenticated', '{"role":"guardian","display_name":"Guardian A"}'),
  ('b0000000-0000-4000-8000-000000000002', 'gb@test.invalid', 'authenticated', 'authenticated', '{"role":"guardian","display_name":"Guardian B"}'),
  -- A child's tablet identity: no role, so no profile.
  ('c0000000-0000-4000-8000-000000000001', 'kid@test.invalid', 'authenticated', 'authenticated', '{"role":"student"}');

insert into public.students (id, guardian_id, user_id, nickname) values
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'KidA1'),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', null, 'KidA2'),
  ('d0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', null, 'KidB1');

insert into public.classes (id, teacher_id, name) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Class A'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Class B');

insert into public.class_members (id, class_id, student_id, status) values
  ('f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'approved'),
  ('f0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'invited'),
  ('f0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003', 'approved');

insert into public.sessions (id, class_id, teacher_id, student_id, room_code, book) values
  ('10000000-aaaa-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'ABCDEF', 'quran'),
  ('10000000-aaaa-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003', 'GHJKLM', 'qaida');

insert into public.marks (session_id, student_id, mark_type, book, page, surah, ayah, word_index, x, y, created_by) values
  ('10000000-aaaa-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'tajweed', 'quran', 2, 2, 1, 1, null, null, 'a0000000-0000-4000-8000-000000000001'),
  ('10000000-aaaa-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003', 'repeat', 'qaida', 3, null, null, null, 0.5, 0.5, 'a0000000-0000-4000-8000-000000000002');

insert into public.assignments (student_id, teacher_id, kind, book, from_page, to_page, due_on) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'new', 'quran', 2, 3, current_date),
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'new', 'qaida', 3, 3, current_date);

insert into public.page_progress (student_id, book, page, status) values
  ('d0000000-0000-4000-8000-000000000001', 'quran', 2, 'in_progress'),
  ('d0000000-0000-4000-8000-000000000003', 'qaida', 3, 'needs_work');

-- ---- Signup trigger ---------------------------------------------------------------
select is((select role::text from public.profiles where id = 'a0000000-0000-4000-8000-000000000001'), 'teacher',
          'signup creates a teacher profile');
select is((select count(*)::int from public.profiles where id = 'c0000000-0000-4000-8000-000000000001'), 0,
          'a child identity gets no profile');

-- ---- Anonymous --------------------------------------------------------------------
set local role anon;
select throws_ok('select * from public.students', '42501', null, 'anon cannot read students');
select throws_ok('select * from public.sessions', '42501', null, 'anon cannot read sessions');
reset role;

-- ---- Teacher A --------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000001"}';

select results_eq('select id from public.students', array['d0000000-0000-4000-8000-000000000001'::uuid],
                  'teacher sees only their approved student (not invited, not another teacher''s)');
select is((select count(*)::int from public.students where id = 'd0000000-0000-4000-8000-000000000003'), 0,
          'teacher cannot read another teacher''s student');
select results_eq('select id from public.sessions', array['10000000-aaaa-4000-8000-000000000001'::uuid],
                  'teacher sees only their own sessions');
select is((select count(*)::int from public.marks where student_id = 'd0000000-0000-4000-8000-000000000003'), 0,
          'teacher cannot read another teacher''s marks');
select is((select count(*)::int from public.assignments), 1, 'teacher sees only their assignments');
select is((select count(*)::int from public.page_progress), 1, 'teacher sees only their students'' progress');
select is((select count(*)::int from public.profiles where id = 'a0000000-0000-4000-8000-000000000002'), 0,
          'teacher cannot see an unrelated teacher''s profile');
select throws_ok('select pin_hash from public.students', '42501', null, 'pin_hash is not readable');
select throws_ok($$select public.verify_student_pin('d0000000-0000-4000-8000-000000000001', '1234')$$, '42501', null,
                 'clients cannot call the server-only PIN check');
select throws_ok(
  $$insert into public.marks (session_id, student_id, mark_type, book, page, x, y, created_by)
    values ('10000000-aaaa-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003', 'good', 'qaida', 3, 0.1, 0.1,
            'a0000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'teacher cannot mark another teacher''s student');
select throws_ok(
  $$insert into public.sessions (class_id, teacher_id, student_id, room_code, book)
    values ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
            'd0000000-0000-4000-8000-000000000003', 'NPQRST', 'quran')$$,
  '42501', null, 'teacher cannot start a session for another teacher''s student');
select throws_ok(
  $$insert into public.sessions (class_id, teacher_id, student_id, room_code, book)
    values ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
            'd0000000-0000-4000-8000-000000000002', 'NPQRST', 'quran')$$,
  '42501', null, 'teacher cannot start a session before the guardian approves');
select throws_ok(
  $$update public.class_members set status = 'approved' where id = 'f0000000-0000-4000-8000-000000000002'$$,
  '42501', null, 'teacher cannot approve a membership themselves');
select lives_ok(
  $$insert into public.marks (session_id, student_id, mark_type, book, page, surah, ayah, word_index, created_by)
    values ('10000000-aaaa-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'good', 'quran', 2, 2, 1, 2,
            'a0000000-0000-4000-8000-000000000001')$$,
  'teacher can mark their own student in their own session');
select lives_ok(
  $$insert into public.class_invites (class_id, token_hash, expires_at)
    values ('e0000000-0000-4000-8000-000000000001', encode(extensions.digest('invite-token', 'sha256'), 'hex'),
            now() + interval '1 day')$$,
  'teacher can create an invite for their class');
select throws_ok(
  $$insert into public.class_invites (class_id, token_hash, expires_at)
    values ('e0000000-0000-4000-8000-000000000002', 'x', now() + interval '1 day')$$,
  '42501', null, 'teacher cannot create an invite for another teacher''s class');
reset role;

-- ---- Teacher B --------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000002"}';
select results_eq('select id from public.students', array['d0000000-0000-4000-8000-000000000003'::uuid],
                  'teacher B sees only their own student');
reset role;

-- ---- Guardian A -------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"b0000000-0000-4000-8000-000000000001"}';

select results_eq('select id from public.students order by id',
                  array['d0000000-0000-4000-8000-000000000001'::uuid, 'd0000000-0000-4000-8000-000000000002'::uuid],
                  'guardian sees only their own children');
select is((select count(*)::int from public.class_members), 2, 'guardian sees their children''s links only');
select is((select display_name from public.profiles where id = 'a0000000-0000-4000-8000-000000000001'), 'Teacher A',
          'guardian sees the name of their child''s teacher');
select is((select count(*)::int from public.profiles where id = 'a0000000-0000-4000-8000-000000000002'), 0,
          'guardian cannot see unrelated teachers');
select is((select count(*)::int from public.marks), 2, 'guardian sees their child''s marks only');
select throws_ok(
  $$insert into public.students (guardian_id, nickname) values ('b0000000-0000-4000-8000-000000000002', 'Sneaky')$$,
  '42501', null, 'guardian cannot add a child to another family');
select throws_ok($$select public.set_student_pin('d0000000-0000-4000-8000-000000000003', '1111')$$, '42501', null,
                 'guardian cannot set another family''s PIN');
select lives_ok($$select public.set_student_pin('d0000000-0000-4000-8000-000000000001', '4321')$$,
                'guardian sets their own child''s PIN');
select lives_ok($$select public.redeem_class_invite('invite-token', 'd0000000-0000-4000-8000-000000000002')$$,
                'guardian links their child with a teacher''s invite');
select throws_ok($$select public.redeem_class_invite('invite-token', 'd0000000-0000-4000-8000-000000000003')$$,
                 '42501', null, 'guardian cannot link another family''s child');
reset role;

-- ---- The child (tablet identity) ----------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"c0000000-0000-4000-8000-000000000001"}';
select results_eq('select id from public.students', array['d0000000-0000-4000-8000-000000000001'::uuid],
                  'a child sees only themselves');
select is((select count(*)::int from public.assignments), 1, 'a child sees only their own assignments');
select is((select count(*)::int from public.marks where student_id <> 'd0000000-0000-4000-8000-000000000001'), 0,
          'a child cannot read other students'' marks');
reset role;

-- ---- PIN lockout (server role) -----------------------------------------------------
select is(public.verify_student_pin('d0000000-0000-4000-8000-000000000001', '4321') ->> 'ok', 'true',
          'the new PIN works');
do $$
begin
  for i in 1..4 loop
    perform public.verify_student_pin('d0000000-0000-4000-8000-000000000001', '0000');
  end loop;
end $$;
select is(public.verify_student_pin('d0000000-0000-4000-8000-000000000001', '0000') ->> 'reason', 'locked',
          'five wrong PINs lock the child out');

-- ---- Invite took effect; revoking removes access immediately -------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000001"}';
select is((select count(*)::int from public.students), 2, 'teacher sees the newly linked child');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"b0000000-0000-4000-8000-000000000001"}';
update public.class_members set status = 'revoked' where class_id = 'e0000000-0000-4000-8000-000000000001';
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000001"}';
select is((select count(*)::int from public.students) + (select count(*)::int from public.sessions)
          + (select count(*)::int from public.marks), 0,
          'after the guardian revokes, the teacher reads nothing about the children');
reset role;

select * from finish();
rollback;
