-- Local development seed only (`supabase db reset`). Never pushed to the hosted project.
-- Demo logins match the prototype: amina@example.com / sara@example.com, password sabaq-demo.

create or replace function pg_temp.demo_user(p_id uuid, p_email text, p_role text, p_name text) returns void
language sql as $$
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
          extensions.crypt('sabaq-demo', extensions.gen_salt('bf')), now(),
          jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', p_role),
          jsonb_build_object('display_name', p_name), now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text, jsonb_build_object('sub', p_id::text, 'email', p_email),
          'email', now(), now(), now());
$$;

select pg_temp.demo_user('10000000-0000-4000-8000-000000000001', 'amina@example.com', 'teacher', 'Ustadha Amina');
select pg_temp.demo_user('10000000-0000-4000-8000-000000000002', 'bilal@example.com', 'teacher', 'Ustadh Bilal');
select pg_temp.demo_user('20000000-0000-4000-8000-000000000001', 'sara@example.com', 'guardian', 'Sara');
select pg_temp.demo_user('20000000-0000-4000-8000-000000000002', 'omar@example.com', 'guardian', 'Omar');
update public.profiles set is_admin = true where id = '20000000-0000-4000-8000-000000000001';

insert into public.students (id, guardian_id, nickname, login_method, pin_hash) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Maryam', 'pin', extensions.crypt('1234', extensions.gen_salt('bf', 8))),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Yusuf', 'magic_link', null),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'Huda', 'pin', extensions.crypt('1234', extensions.gen_salt('bf', 8))),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'Zayd', 'pin', extensions.crypt('1234', extensions.gen_salt('bf', 8))),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 'Ali', 'pin', extensions.crypt('1234', extensions.gen_salt('bf', 8))),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', 'Sumayya', 'pin', extensions.crypt('1234', extensions.gen_salt('bf', 8)));

insert into public.classes (id, teacher_id, name, book) values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Evening hifz group', 'quran'),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Weekend Qaida', 'qaida'),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'Morning recitation', 'quran');

insert into public.class_members (class_id, student_id, status, approved_by_guardian_at) values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'approved', now() - interval '60 days'),
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'approved', now() - interval '45 days'),
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'approved', now() - interval '30 days'),
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000005', 'invited', null),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000004', 'approved', now() - interval '20 days'),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'invited', null),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000006', 'approved', now() - interval '25 days');
