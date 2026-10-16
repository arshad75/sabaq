# Deploying the pilot

Stack: **Vercel Hobby** (app, Singapore) + **Supabase Free** (Postgres, Realtime, Singapore)
+ **GitHub Actions** (CI, nightly encrypted backup). All free. Vercel Hobby is for
non-commercial use; that fits a free pilot.

## What works once hosted

- Live lessons between two devices anywhere (Supabase Realtime Broadcast).
- Demo logins and the prototype screens.

Still prototype until the screens are moved onto the database (next milestone):
screens show demo data; saved lessons and PIN changes live in server memory and
can disappear on redeploy. **Don't enter real children's details yet.**

## 1. GitHub (repo + CI)

Use a personal account, not a work one.

```sh
gh auth login                       # personal account
gh repo create sabaq --private --source . --push
```

CI runs lint, types, unit tests, build, RLS tests and e2e on every push.

## 2. Supabase

1. Sign up at supabase.com → **New project**: name `sabaq`, region
   **Southeast Asia (Singapore)**, generate a strong DB password and keep it in a
   password manager.
2. Push the schema (the seed file is local-only and is not pushed):

   ```sh
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <project-ref>   # from the project URL
   pnpm exec supabase db push
   ```

3. **Realtime → Settings**: keep *Allow public access* on (rooms are joined by code
   for now).
4. **Project Settings → API Keys**: copy the Project URL and the *publishable* key.
   Never put the secret key in the app or in `NEXT_PUBLIC_*` variables.

## 3. Vercel

1. Sign up with GitHub (Hobby) → **Add New → Project** → import `sabaq`.
2. Environment variables (Production and Preview):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key |
   | `SESSION_SECRET` | output of `openssl rand -hex 32` |

3. Deploy. `vercel.json` pins functions to Singapore (`sin1`), next to the database.
4. Supabase → **Authentication → URL Configuration**: set Site URL to the Vercel URL.

## 4. Nightly backups

```sh
gh secret set SUPABASE_DB_URL      # Supabase → Connect → Session pooler string (IPv4)
gh secret set BACKUP_PASSPHRASE    # long random passphrase; also save it elsewhere
gh variable set BACKUPS_ENABLED --body true
gh workflow run backup.yml         # first run by hand, then nightly
```

Backups are GPG-encrypted artifacts kept 30 days. The nightly connection also stops
the free project pausing after 7 idle days. Restore steps are in
`.github/workflows/backup.yml`.

## 5. Smoke test

Teacher on a phone, student on a tablet (different networks): start a session,
join with the code, tap a word, mark it, toggle aeroplane mode on the tablet and
check the teacher catches up.

## Local development

```sh
pnpm db:start          # local Supabase in Docker; prints URL + publishable key
cp .env.example .env.local   # fill in the key
pnpm dev --port 3100
pnpm db:test           # RLS tests
pnpm db:reset          # rebuild from migrations + seed
```
