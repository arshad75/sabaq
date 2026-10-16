-- A parent can delete their account, and it takes their children's data with it.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email, aud, role, raw_user_meta_data, raw_app_meta_data) values
  ('a3000000-0000-4000-8000-000000000001', 'leaver@test.invalid', 'authenticated', 'authenticated', '{"display_name":"L"}', '{}'),
  ('a3000000-0000-4000-8000-000000000002', 'stayer@test.invalid', 'authenticated', 'authenticated', '{"display_name":"S"}', '{}');
insert into public.students (id, guardian_id, nickname) values
  ('a3100000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 'Kid'),
  ('a3100000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000002', 'Other');

set local role anon;
select throws_ok($$select public.delete_my_account()$$, '42501', null, 'anonymous visitors cannot call it');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"a3000000-0000-4000-8000-000000000001"}';
select lives_ok($$select public.delete_my_account()$$, 'a parent deletes their account');
reset role;

select is((select count(*)::int from public.students where id = 'a3100000-0000-4000-8000-000000000001'), 0,
          'their child''s data is gone');
select is((select count(*)::int from public.students where id = 'a3100000-0000-4000-8000-000000000002'), 1,
          'other families are untouched');

select * from finish();
rollback;
