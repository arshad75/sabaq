# CLAUDE.md

Project context for Claude Code. Read this first, then `docs/PLAN.md`.

## What we're building

An open-source web app (PWA) for remote Quran lessons between a teacher and a child.
Today the teacher can only see the child's reading through a phone camera. This app
gives them a **shared reading session**: the child's tablet shows the text, her
position syncs live to the teacher, the teacher marks mistakes, and the marks feed a
per-student progress record. Voice/video calling stays on an external app
(WhatsApp/Meet) for now.

Name: **Sabaq** (سبق, "lesson"). Package and storage keys use `sabaq`.

## Users and roles

- **Guardian** (parent): owns the family account, creates child profiles, approves
  teacher links, can view/export/delete everything.
- **Teacher**: creates a class, invites students, runs live sessions, annotates,
  assigns homework, sees progress.
- **Student** (child): simple login (PIN or magic link from the guardian), sees
  today's assignment and the live reading view. Minimal data, no free-text profile.

## Stack (decisions made, change only with a note in docs/DECISIONS.md)

- Next.js (App Router) + TypeScript, Tailwind, installable PWA
- Supabase (self-hostable): Postgres, Auth, Row Level Security, Realtime Broadcast
  for live session sync
- Drizzle or Supabase migrations in `/supabase/migrations`
- Vitest for unit tests, Playwright for end-to-end
- Docker Compose for local dev and self-hosting
- Licence: Apache-2.0 for code. Text/font data licences documented in `docs/DATA_LICENSES.md`

## Hard rules

1. **Never retype, edit, or "fix" Quran text.** Load it only from a verified
   source through the data layer in `src/lib/quran/`. Store references (surah, ayah,
   word index, page), not copies of the text, wherever possible.
2. Verify the licence of any text, font, or page-image source before adding it.
   Record it in `docs/DATA_LICENSES.md`. If unsure, stop and ask.
3. **Children's data minimisation.** No birthdates, photos, or free-text personal
   fields for students. Recordings are off by default and need guardian opt-in.
   Everything must be exportable and deletable by the guardian.
4. All access control is enforced by Postgres Row Level Security, not only in the UI.
   Every new table ships with RLS policies and a test that proves a teacher cannot
   read another teacher's students.
5. Arabic text is RTL and needs a proper Quranic font. Test layouts in RTL and on a
   tablet-sized viewport (portrait and landscape) and a phone viewport.
6. Must work on weak connections (teacher is in India, student in Australia):
   sync only small JSON events, never video. Handle reconnects gracefully.

## Working agreement

- Before coding a milestone, write a short plan and wait for approval.
- Work one milestone task at a time, small commits, conventional commit messages.
- Add or update tests with every change. Don't leave failing tests.
- Keep `docs/PLAN.md` checkboxes up to date as tasks complete.
- Record non-obvious decisions in `docs/DECISIONS.md`.
- Ask before adding a new dependency or changing the stack.

## Commands (fill in as the repo is scaffolded)

```
pnpm dev          # run the app
pnpm test         # unit tests
pnpm test:e2e     # Playwright
pnpm db:reset     # rebuild local database from migrations
docker compose up # full local stack
```

## Docs map

- `docs/PLAN.md`: milestones and tasks
- `docs/PAGES.md`: every page/route, its purpose, states, and acceptance criteria
- `docs/DATA_MODEL.md`: tables, relationships, RLS rules