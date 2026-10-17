# Plan

Each milestone should be shippable and demoable. Work top to bottom. Tick boxes as
you go. Do not start a milestone until the previous one's acceptance criteria pass.

## M0: Foundations

- [ ] Scaffold Next.js + TypeScript + Tailwind, ESLint, Prettier, Vitest, Playwright
- [ ] Docker Compose with local Supabase (Postgres, Auth, Realtime)
- [ ] CI (GitHub Actions): lint, typecheck, unit tests, e2e
- [ ] Repo hygiene: LICENSE (Apache-2.0), README, CONTRIBUTING, CODE_OF_CONDUCT,
      `docs/DECISIONS.md`, `docs/DATA_LICENSES.md`
- [ ] PWA manifest and service worker (installable on tablet and phone)

**Done when:** `docker compose up` + `pnpm dev` gives a running app, CI is green,
and the app installs to a tablet home screen.

## M1: Data source and reading view (no accounts yet)

- [ ] Research and record licences for candidate text and page sources
      (Tanzil, Quran Foundation / Quran.com API, QUL) in `docs/DATA_LICENSES.md`.
      **Stop and get approval on the chosen source before building on it.**
- [ ] Data layer `src/lib/quran/`: get page, get ayah range, get word by index
- [ ] `ReadingView` component: RTL, correct font, page-based layout, tablet-friendly
- [ ] Tap a word to select it; selected word highlights
- [ ] Page navigation (next/previous/jump to surah or page)

**Done when:** a page of text renders correctly on tablet portrait and landscape,
and tapping a word highlights it. A test confirms text comes only from the data layer.

## M2: Live shared session (still no accounts)

- [ ] Session rooms by short code (e.g. 6 characters), expiring after inactivity
- [ ] Realtime channel per room (Supabase Realtime Broadcast)
- [ ] Event types: `position` (page + word index), `mark`, `clear_mark`, `presence`
- [ ] Teacher view follows student position live; connection status indicator
- [ ] Reconnect and resync: a rejoining client gets current page + marks
- [ ] Latency test under throttled network (simulate 300 ms RTT, 2% loss)

**Done when:** two browsers join one room, the student moves, the teacher sees it
within about a second on a throttled connection, and refreshing either side restores state.

## M3: Accounts, roles, and permissions

- [ ] Auth: guardian and teacher sign-up/login (email magic link or password)
- [ ] Guardian creates child profiles (first name or nickname only)
- [ ] Student login: PIN or magic link on the tablet, issued by the guardian
- [ ] Teacher creates a class; invites student via link; guardian approves
- [ ] RLS policies on every table plus tests (see `docs/DATA_MODEL.md`)
- [ ] Sessions are now tied to a teacher and a student; room code remains the join mechanism

**Done when:** a teacher can only ever read their own approved students; RLS tests
prove cross-tenant access fails; a student cannot see other students.

## M4: Annotations and progress

- [ ] Mark types: repeat, pronunciation, tajweed rule, memorisation slip, good
      (configurable list, colour-coded, with colour-independent icons)
- [ ] Marks persist to the student's record at session end
- [ ] Session summary page: pages covered, marks by type, teacher note
- [ ] Progress model per student per page: not started / in progress / needs work / solid,
      updated from marks plus teacher overrides
- [ ] Progress view for teacher and guardian (page grid heat map plus trend over weeks)

**Done when:** after a live session, the summary and progress view reflect the marks
without any manual entry.

## M5: Assignments and revision

- [ ] Teacher assigns work: new lesson, recent revision, old revision (page/ayah range, due date)
- [ ] Student home shows today's assignment and a "start reading" button
- [ ] Teacher marks assignments complete or needs more work after review
- [ ] Simple reminders (in-app first; email optional)

## M6: Privacy, export, and hardening

- [ ] Guardian data export (JSON) and full account deletion
- [ ] Optional recitation recording: off by default, guardian opt-in, retention limit, delete on request
- [ ] Privacy page and in-app plain-language explanation of what is stored
- [ ] Accessibility pass (large touch targets, contrast, screen reader labels)
- [ ] Security review: rate limiting, room code entropy, invite expiry, audit of RLS
- [ ] Self-hosting guide in `docs/SELF_HOSTING.md`

## Later ideas (not scheduled)

- Optional built-in audio/video via WebRTC
- Multiple mushaf layouts and reciter audio for the child to follow along
- Offline mode for the student's reading view
- Multi-language UI (Urdu, Hindi, Arabic, English)
- Export progress report as PDF for the guardian

## M7: Learning journey (self-paced, Duolingo-style)

- [x] `/learn`: 7 units, 31 short lessons in Qaida order (letters, look-alike dots, find it on the Qaida page, letter shapes, short vowels)
- [x] Lesson player: intro cards, hear/see/name choices, match pairs, tap-the-box on Qaida pages; mistakes return at the end
- [x] XP, stars, daily goal, day streak, badges, letter strength and weak-letter practice
- [x] Several learners per device; progress kept on the device only; works offline once loaded
- [ ] Teacher-recorded letter names and syllables (replace eSpeak clips; add audio to short vowels)
- [ ] Optional sync of learning progress to the child's account for parents and teachers (needs table + RLS)
- [ ] Native-speaker and teacher review of lesson wording and transliteration
