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

-- Saved lessons so progress, badges and stars have something to show (local only).
-- Sumayya (Qaida, Ustadha Amina): one lesson a week for five weeks, pages advancing.
insert into public.sessions (id, class_id, teacher_id, student_id, room_code, book, started_at, ended_at, teacher_note, pages_covered)
select ('50000000-0000-4000-8000-00000000000' || w)::uuid,
       '40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
       '30000000-0000-4000-8000-000000000006', 'QAZDK' || (w + 1), 'qaida',
       now() - make_interval(days => 7 * (5 - w)) - interval '1 hour',
       now() - make_interval(days => 7 * (5 - w)) - interval '30 minutes',
       case w when 5 then 'Lovely reading today. Practise the joined letters once a day.' else '' end,
       array[w, w + 1]
from generate_series(1, 5) w;

insert into public.marks (session_id, student_id, mark_type, book, page, x, y, created_by)
select ('50000000-0000-4000-8000-00000000000' || w)::uuid, '30000000-0000-4000-8000-000000000006',
       (array['good','good','tajweed','good','repeat','good','pronunciation','good'])[1 + ((w + i) % 8)]::public.mark_type,
       'qaida', w + (i % 2), 0.2 + 0.1 * (i % 6), 0.25 + 0.08 * i, '10000000-0000-4000-8000-000000000001'
from generate_series(1, 5) w, generate_series(1, 6) i;

insert into public.assignments (student_id, teacher_id, kind, book, from_page, to_page, due_on, teacher_feedback)
values ('30000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'new', 'qaida', 6, 7,
        current_date + 5, 'Read each line three times, slowly.');
