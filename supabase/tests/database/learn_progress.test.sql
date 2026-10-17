-- Learning-journey progress: only the family (and the child, and a linked teacher read-only) can see it.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email, aud, role, raw_user_meta_data, raw_app_meta_data) values
  ('a4000000-0000-4000-8000-000000000001', 'mum@test.invalid', 'authenticated', 'authenticated', '{"full_name":"Maryam Khan"}', '{}'),
  ('a4000000-0000-4000-8000-000000000002', 'other@test.invalid', 'authenticated', 'authenticated', '{"display_name":"O"}', '{}'),
  ('a4000000-0000-4000-8000-000000000003', 'teach@test.invalid', 'authenticated', 'authenticated', '{"display_name":"T"}', '{"role":"teacher"}');
insert into public.students (id, guardian_id, nickname) values
  ('a4100000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'Sara'),
  ('a4100000-0000-4000-8000-000000000002', 'a4000000-0000-4000-8000-000000000002', 'Other kid');

select is((select display_name from public.profiles where id = 'a4000000-0000-4000-8000-000000000001'), 'Maryam Khan',
          'a Google sign-up is named from the Google profile');

set local role authenticated;
set local request.jwt.claims to '{"sub":"a4000000-0000-4000-8000-000000000001"}';
select lives_ok($$insert into public.learn_progress (student_id, color, data)
                  values ('a4100000-0000-4000-8000-000000000001', 'sky', '{"xp": 15}')$$,
                'a parent saves their child''s journey');
select is((select (data ->> 'xp')::int from public.learn_progress), 15, 'and reads it back');
select lives_ok($$update public.learn_progress set data = '{"xp": 30}' where student_id = 'a4100000-0000-4000-8000-000000000001'$$,
                'and updates it');
select throws_ok($$insert into public.learn_progress (student_id, data) values ('a4100000-0000-4000-8000-000000000002', '{}')$$,
                 '42501', null, 'but cannot write another family''s journey');
select throws_ok($$insert into public.learn_progress (student_id, data) values ('a4100000-0000-4000-8000-000000000001', '[]')$$,
                 null, null, 'progress must be an object');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"a4000000-0000-4000-8000-000000000002"}';
select is((select count(*)::int from public.learn_progress), 0, 'another parent sees nothing');
update public.learn_progress set data = '{"xp": 0}' where student_id = 'a4100000-0000-4000-8000-000000000001';
reset role;
select is((select (data ->> 'xp')::int from public.learn_progress where student_id = 'a4100000-0000-4000-8000-000000000001'), 30,
          'and cannot change it');

set local role authenticated;
set local request.jwt.claims to '{"sub":"a4000000-0000-4000-8000-000000000003"}';
select is((select count(*)::int from public.learn_progress), 0, 'an unlinked teacher sees nothing');
reset role;

set local role anon;
select throws_ok($$select * from public.learn_progress$$, '42501', null, 'anonymous visitors have no access');
reset role;

delete from public.students where id = 'a4100000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.learn_progress), 0, 'removing a child removes their journey');

select * from finish();
rollback;
