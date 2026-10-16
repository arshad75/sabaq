# Data model

Postgres via Supabase. Every table has `id uuid pk`, `created_at`, `updated_at`.
Every table has RLS enabled. Quran text is **not** stored here; only references to it.

## Tables

### profiles
`user_id` (auth.users), `role` (guardian | teacher), `display_name`, `locale`.
Students are not auth users by default; see `students`.

### students
`guardian_id` -> profiles, `nickname` (first name or nickname only),
`login_method` (pin | magic_link), `pin_hash`, `recording_consent` (bool, default false).
No birthdate, no photo, no free-text fields.

### classes
`teacher_id` -> profiles, `name`, `book` (quran | qaida, default book for sessions).

### class_members
`class_id`, `student_id`, `status` (invited | approved | revoked),
`approved_by_guardian_at`, `invite_token_hash`, `invite_expires_at`.

### sessions
`class_id`, `teacher_id`, `student_id`, `room_code` (unique while active), `book`,
`started_at`, `ended_at`, `teacher_note`.

### marks
`session_id`, `student_id`, `mark_type` (repeat | pronunciation | tajweed | slip | good),
`book`, `page`, then either a word anchor (`surah`, `ayah`, `word_index`; Quran) or a
point anchor (`x`, `y` as 0..1 of the page image; Qaida), `note` (short, optional), `created_by`.

### page_progress
`student_id`, `book`, `page`, `status` (not_started | in_progress | needs_work | solid),
`source` (derived | teacher_override), `updated_by`, `updated_at`.
Unique on (`student_id`, `book`, `page`).

### assignments
`student_id`, `teacher_id`, `kind` (new | recent_revision | old_revision), `book`,
`from_page`, `to_page` (or ayah range), `due_on`, `status`
(assigned | completed | needs_more_work), `teacher_feedback`.

### recordings (optional, M6)
`session_id`, `student_id`, `storage_path`, `expires_at`.
Only creatable when `students.recording_consent = true`.

### audit_log
`actor_id`, `action`, `entity`, `entity_id`, `at`. For data export, deletion, and
approvals.

## Relationships (summary)

guardian -> students -> class_members <- classes <- teacher
sessions, marks, page_progress, assignments all hang off student + teacher.

## RLS rules (each needs a test)

- **Guardian:** read/write own `students` and everything about them; approve or
  revoke `class_members`; can delete all child data.
- **Teacher:** read/write only rows for students with an `approved` membership in
  their own classes. Cannot read students of other teachers. Loses access
  immediately when membership is revoked.
- **Student session:** can read own assignments, own page progress, and write
  `position` events only to a session they belong to. Cannot read other students.
- **Anonymous (M2 only):** may join a room by code for live sync; no database
  reads of student data.

## Realtime events (Broadcast, not stored unless noted)

```
position     { page, word | point, at }
mark         { mark_type, page, word | point }   # also persisted
clear_mark   { mark_id }
presence     { role, connected }
sync_request / sync_state   # rejoin: send current page + marks
```

Events are small JSON. Never send audio or video through this channel.

## Progress derivation (starting rule, tune with the teacher)

- First read of a page -> `in_progress`
- A session with 3 or more `repeat`/`pronunciation`/`tajweed`/`slip` marks on a page
  -> `needs_work`
- A later session on that page with only `good` marks or none -> `solid`
- Teacher override always wins and is flagged as `teacher_override`