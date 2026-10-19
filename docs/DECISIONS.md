# Decisions

Non-obvious choices, newest first. Change the stack only with an entry here.

## 2026-10-16: Real accounts, first-lesson requests and admin

- `NEXT_PUBLIC_SUPABASE_AUTH=1` switches to Supabase Auth (`@supabase/ssr`, added for
  cookie sessions). Without it the prototype's demo logins and mock screens run, as in
  local dev and CI. `src/proxy.ts` refreshes sessions and sends real accounts away from
  screens still on demo data (`/guardian`, `/teacher`, `/student`).
- Anyone can sign up, always as a parent: the signup trigger reads the role from
  server-only `app_metadata`, so the public API can't create teachers. Admins promote
  teachers (`admin_set_role`). `profiles.is_admin` is set by hand in SQL.
- Parents ask for a first lesson (`lesson_requests`); the admin schedules it with a
  free-text time ("Sat 5pm Sydney") to avoid time-zone bugs, and assigns a teacher.
- Email: Gmail SMTP via an app password, sign-in links and password reset through
  `/auth/confirm` (token hash, works across devices). Email confirmation is off for the
  pilot (`mailer_autoconfirm`), so sign-up needs no email.

## 2026-10-16: Pilot hosting (Vercel Hobby + Supabase Free, Singapore)

- Pilot for ~6-7 students runs free: Vercel Hobby (`sin1`) + Supabase Free (Singapore,
  roughly midway between India and Australia) + GitHub Actions. Steps in `docs/DEPLOY.md`.
- The hosted Supabase project was created in Tokyo, so Vercel functions run in `hnd1`
  to stay next to it. Singapore would be ~100 ms closer for India/Australia; fine for
  small sync events, can move later.
- Added `@supabase/supabase-js` (Realtime) and the `supabase` CLI (dev: local stack,
  migrations, pgTAP RLS tests). Requested by the user as part of "create the stack".
- Live sync uses Supabase Realtime Broadcast on public channel `room:<code>` when
  `NEXT_PUBLIC_SUPABASE_*` is set, else the same-browser BroadcastChannel. Nothing is
  stored; events queue while offline and full state resyncs on rejoin. Moving to
  private channels (RLS on `realtime.messages`) comes with Supabase Auth.
- Schema (`supabase/migrations`) follows datamodels.md with these choices:
  `profiles.id` *is* the auth user id (no separate `user_id`); `students.user_id` is the
  child's tablet identity, set only by the server; invites are a separate
  `class_invites` table (token hash only) redeemed by the guardian through
  `redeem_class_invite`, which approves straight away; `teacher_notes` added (readable
  by the guardian, who can export everything); child history survives class/teacher
  deletion (`set null`). PINs are bcrypt in Postgres with 5-try/60-second lockout,
  checked only by the server role.
- Tables are granted explicitly (`auto_expose_new_tables = false`, anon gets nothing);
  `pin_hash` and lockout columns aren't client-readable. RLS relationship checks are
  SECURITY DEFINER helpers in an unexposed `private` schema.
- Prototype login cookies are now HMAC-signed (`SESSION_SECRET`) instead of an
  in-memory map, so logins survive serverless instances.

## 2026-10-16: Renamed to Sabaq

- The app is now **Sabaq** (سبق, "lesson"), replacing the working name Lesson Sync.
  The brand shows both forms; package name, storage keys (`sabaq:*`) and the demo
  password (`sabaq-demo`) follow. Old `lesson-sync:*` browser data is simply ignored.

## 2026-10-16: Tappable words on Qaida pages (detected boxes, not retyped text)

- **Why not retype the Qaida as text?** Later pages contain Quran verses (hard rule 1),
  and retyping 39 pages by hand would be error-prone. The licensed page images stay the
  source of truth.
- **How.** `scripts/qaida-layout.py` (stdlib only) finds the page frame, the ruled
  lines, printed column dividers and gaps between words, and writes
  `src/lib/qaida/layout.json`: about 2,000 boxes (line, word right-to-left, rectangle as
  fractions). No text is extracted.
- **In the app.** Each box is a button. The student's tap highlights her word on both
  screens; teacher marks colour the word and add a numbered badge. Taps and marks are
  still sent as points (the box centre), so no sync or storage change was needed;
  `nearestCell` maps older free-tap points onto boxes.
- **Known limits.** Detection is automatic: a few boxes split or merge oddly (e.g. a
  trailing letter split off, some headers and ornaments are tappable). The Urdu notes on
  page 37 form rough blocks. Rerun the script after any tweak; corrections could go in
  a small per-page override file later.

## 2026-10-16: Findings from the two-tab live lesson test

- **Numbered marks.** Each live mark gets a number (`n`), shown on its pin, in the marks
  list and in the saved summary. It stays the same when the mark's type changes. Qaida
  marks also show a rough location ("top left"). Tapping a list entry selects that pin.
- **Student screens need a signed-in child.** With no student session they show a
  "Who is reading?" sign-in prompt instead of falling back to a default child. The
  dev-only `?as=<id>` preview still works.
- **Saving live lessons.** Ending a lesson lets the teacher save it with a server action.
  It checks the teacher's session and that the student is theirs (like RLS), validates
  every field, and stores the lesson in memory alongside the sample data. Summaries
  and progress then include it. Rooms must be started from the dashboard (`&student=`)
  to be saveable. Shared state now also tracks `pages` covered and `startedAt`.
- **Resync after a dropped connection.** When a peer reappears after a gap, both sides
  swap state again, so a page turn made offline reaches the other side. Delayed sends
  are flushed before the channel closes.
- **Dev indicator off** (`devIndicators: false`): it covered the reading view's buttons.

## 2026-10-16: Prototype sign-in for teachers, guardians and students

- **Mock auth, real shape.** Until Supabase Auth (M3), `src/lib/mock/auth.ts` and
  `src/lib/auth/` run sign-in on the server with an httpOnly session cookie. Stores are
  in memory and reset when the dev server restarts. Demo logins: `amina@example.com`
  (teacher) and `sara@example.com` (guardian), password `sabaq-demo`; every child's
  PIN starts as `1234`.
- **Role comes from the account.** The old login form had no role field and always
  sent people to the guardian dashboard. Login now looks the role up server-side.
- **No account discovery.** Wrong email or password gives one message; the email-link
  reply is identical for unknown emails.
- **Tablet pairing.** `/login/student` lists children only on a browser a guardian has
  set up, so a public page never shows children's names.
- **PINs.** Stored hashed; 5 wrong tries lock that child for 60 s. A 4-digit PIN is
  weak offline, so the real `pin_hash` must use a slow KDF and server-side rate limits.
- **One-time links.** Spent only when the child presses "Start", so link previews in
  WhatsApp and similar apps can't use them up. 15-minute expiry.
- **Not yet enforced:** role layouts still render without a session so the prototype
  screens stay browsable. Guardian-only actions (PIN reset, sign-in link, tablet setup)
  do require a guardian session. Route protection arrives with RLS in M3.

## 2026-10-16: Qaida lessons use the licensed Noorani Qaida page images

- **Source.** Qamar Apps' Noorani Qaida (Indian edition), CC BY-SA 4.0 (see
  `DATA_LICENSES.md`). Pages are the original embedded images, extracted by
  `scripts/extract-qaida.py`, so a "Business Use Only" stamp added when the local copy
  was re-printed to PDF is not carried over.
- **Books.** A `Book` (`quran` | `qaida`) now sits on classes (default book), sessions,
  marks, page progress and assignments. The "Weekend Qaida" class uses `qaida`; a new
  mock learner, Sumayya (`s6`), is in it.
- **Marking images.** Qaida pages are images with no word data, so the student taps
  where she is reading and the teacher taps a spot to mark. Positions and marks carry a
  `point` (x, y as fractions of the page) instead of a word. Word marks are unchanged.
  Per-line or per-cell hit areas could come later from layout data.
- **Book in live sync.** The teacher's link sets the book; the student's link may omit
  it. `sync_request` now carries the sender's state, so whichever side joins second, both
  end up with the teacher's book.
- **Dev-only `?as=s6`** previews the student screens as the Qaida learner.

## 2026-10-16: Screens before data (prototype phase)

- **Order change.** All screens in `pages.md` were built first as a clickable prototype
  on typed mock data (`screens-plan.md`), ahead of M1–M5 data work. Screens live in the
  real app so later milestones swap mocks for Supabase instead of rebuilding UI.
- **Next.js 16 + Cache Components.** The scaffold enables `cacheComponents` and
  `partialPrefetching`. Consequence: anything reading `params`, `searchParams` or
  `usePathname()` must sit inside `<Suspense>`. Pages follow one pattern: a sync
  `Page` that renders `<Suspense fallback={skeleton}>` around an async content component.
- **No Quran text yet.** `src/lib/quran/placeholder-source.ts` generates clearly fake
  Arabic tokens with realistic structure (604 pages, 15 lines, ayah numbering, 114
  surah starts). The reading view shows a "not Quran text" notice while the source is a
  placeholder. A unit test fails if two or more Arabic words appear anywhere in `src`
  outside `src/lib/quran/`.
- **No Quranic font yet.** The reading view uses a system Arabic font stack (no font
  file shipped). The real font is chosen with the text source in M1.
- **Mock data shaped like RLS.** `src/lib/mock/repo.ts` functions take the acting user
  and only return rows that user could see under the planned RLS rules (e.g. a teacher
  gets `undefined` for a student without an approved membership, which renders as 404).
  `repo.test.ts` mirrors the RLS tests M3 must add.
- **Local transport for live sync.** `src/lib/session/transport.ts` uses
  `BroadcastChannel` (tabs of one browser) behind a `SessionTransport` interface that
  Supabase Realtime Broadcast will implement in M2. `?latency=300` simulates delay.
- **Sync semantics.** Position is last-write-wins by timestamp. Marks have stable ids;
  a newer edit replaces an older one. Cleared mark ids are kept as tombstones so a late
  duplicate cannot bring a mark back. A rejoining client sends `sync_request` and merges
  the reply; each client also keeps state in `sessionStorage` so a refresh restores it.
- **One live mark per word.** Re-marking a word changes its type rather than stacking.
  The data model still allows several marks per word.
- **Room codes.** 6 characters from a 32-letter alphabet without I, O, 0, 1
  (about 1.07 billion codes). Rate limiting and expiry are M2/M6 work.
- **Dev-only state preview.** `?state=loading|empty|error` (plus session states
  `waiting|reconnecting|ended|invalid|expired`) forces a screen state. Disabled in
  production unless `NEXT_PUBLIC_SCREEN_PREVIEW=1`. Index at `/dev/screens`.
- **No UI or icon library.** Components are hand-built on Tailwind; icons are simple
  in-repo SVG paths.
- **Mock dates render in UTC** for deterministic output. Real data will use the viewer's
  time zone (teacher in India, student in Australia).
- **Guardian view of a session summary.** `pages.md` puts it at
  `/teacher/sessions/[id]` for both roles. Until auth exists, `?view=guardian` previews
  the read-only guardian version.

### Data model gaps found while building screens (to resolve before M3/M4)

- `sessions` needs a way to record pages covered (prototype uses `pagesCovered`),
  either a column or derived from persisted position events.
- Private teacher notes per student need a table (e.g. `teacher_student_notes`),
  readable only by the authoring teacher.
- Progress rule: a later read with 1–2 error marks is not specified; the prototype sets
  `in_progress`. Tune with teachers.
- Student "streak" needs a definition (prototype: distinct session days, capped at 7).

### Dev dependencies added

`vitest`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`,
`jsdom`, `@playwright/test`, `prettier`. All are on the agreed stack or directly support it.

### Learning journey (`/learn`)

- **One static page with hash routes** (`#/lesson/u1-1`, `#/review`, `#/me`). The whole journey
  works offline once the service worker has it, and there is no server state to secure.
- **Progress stays on the device** (`localStorage` key `sabaq:learn`), one record per learner with
  a nickname and a colour only. Nothing is sent. Syncing to a child account is a later, opt-in step.
- **Gentle by design: no hearts.** A wrong answer shows the right one and the question returns at the
  end of the lesson (at most twice). Stars come from first-try accuracy (95% three, 75% two).
- **Short vowels are visual only** (read "ba / bi / bu" from the marks). Synthetic voices can't be
  checked by ear here, so syllable audio waits for teacher recordings.
- **Only letter-level content.** Lessons use single letters, joining forms (letter + tatweel) and
  harakat marks from the letter table in `src/lib/qaida/letters.ts`; never Quran text.
- **Sound effects are synthesised** with Web Audio, so there are no audio assets to licence.
- Qaida page 2's test rows 6 and 7 are now mapped to letters (box centres checked against the
  printed 9-column grid; the thin alif in row 6 is not detected, so that box is skipped).
- **Only the letters being learned make speech.** Reading button and link labels aloud felt like a
  screen reader to families, so it was removed everywhere (owner's request). Speech is now limited to
  Arabic letter names (`speakLetter`), plus right/wrong chimes in lessons. `e2e/sounds.spec.ts`
  fails if any screen speaks anything else.

### Open sign-up with Google, and the journey saved to the account (2026-10-18)

- **"Continue with Google" is the way in** (`src/lib/auth/google.ts`, `/auth/callback`). Anyone can join;
  new Google users get a family (guardian) profile named from their Google name. No lesson request,
  approval or invite is needed. Email-link sign-in was removed. Email + password remains only as a
  fallback: shown when `NEXT_PUBLIC_GOOGLE_AUTH` isn't `1`, or at `/login?email=1` (for tests and staff).
- **The learning journey syncs to the family account.** Each learner is a `students` row; progress lives
  in `learn_progress` (one jsonb row per learner, RLS: family and the child read/write, a linked teacher
  reads). The device copy stays the working copy so it works offline; `src/lib/learn/sync.ts` merges on
  load and on reconnect (best of each lesson, latest view of each letter, union of days and badges).
  Signing out removes the account's learners from a shared device.
- Asking for a live teacher is optional and folded away on the family page; the admin flow is unchanged.
- **Signed in, the journey is simply there.** A new family account gets its first learner named from
  the account's first name (rename any time), so there's no nickname form. While the account's journey
  loads, `/learn` shows a loading state instead of the guest form, so nobody starts a duplicate learner.
- **One menu once signed in** (`accountNav` in `src/components/shell/nav-items.ts`): Home · Learn ·
  Qaida · Listen · Join · Account on every page, top bar on wide screens and a tab bar below 1024 px.
  The Qaida reader is called "Qaida" so it isn't confused with the journey's "Practise" tab.
- **Own visual identity for the journey** (not a Duolingo copy): eight-point star (khatam) lessons on a
  gold thread, arched "stations" with a girih lattice, Noor instead of XP, a crescent for days in a row,
  lamps instead of stars, rising lights instead of confetti, calm rounded buttons.
- Letter recordings are only played if the file exists at build time (`next.config.ts`).

### Recorded voice only; no robotic speech (2026-10-18)

- Letter names come only from the 29 recordings by Shaykh Jalal in `public/audio/letters/<id>.mp3`
  (used with the owner's permission, see `docs/DATA_LICENSES.md`). The device's text-to-speech voice,
  the eSpeak clips and the Azure TTS script were removed: families found them robotic and wrong.
- If a recording can't play (offline before it was cached), the Qaida page says so instead of speaking
  with another voice. The service worker precaches all 29 clips. A unit test fails if any letter lacks a
  recording, and `e2e/sounds.spec.ts` fails if anything other than a recording is heard.
- **Joined letters are spelled out** on Qaida pages 2 (joined forms) to 6 (murakkabat): tapping يتل
  plays Ya, Ta, Lam, as the Qaida is taught. Each box's letters were read from the page images and
  checked box by box (`READINGS` in `src/lib/qaida/letters.ts`). Page 6's test section is Quran
  words and pages 7+ need vowel sounds (ba/bi/bu) we have no recordings for, so they stay silent.
- **Spelled in one flow, not as a word.** Murakkabat are read by naming each letter in one breath
  ("Ta Ya Noon" for تين); the word itself isn't pronounced until the harakat lessons. Joined words
  play through Web Audio: clips are decoded up front, trimmed to their voiced part and scheduled
  back to back (50 ms apart), which also lets iPads play the later letters after one tap.
