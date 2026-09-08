# Tennis Court Reservation App — Dev & Operations Manual

## What this is

A reservation app for a 12-court club. Members book a slot, confirm it within
an hour of start time, then check in on-site with a daily code the admin
controls. Anyone who never checks in becomes a no-show the admin can charge
a fee for.

## Accounts this project depends on

- **GitHub** (`maucif/tennis-court-app`) — source code.
- **Supabase** (project ref `zlqrhudmkmvmmvewbucc`) — database, auth, and all
  server-side logic (everything here runs as Postgres functions, no separate
  backend server).
- **Vercel** — hosts the built frontend.
- **Resend** — sends reminder emails. Currently in sandbox mode, which only
  delivers to the email address you signed up to Resend with — see
  "Turning on real email delivery" below before relying on this for the club.

## Local development

```bash
git clone https://github.com/maucif/tennis-court-app.git
cd tennis-court-app
npm install
cp .env.example .env.local   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Get the two env values from the Supabase dashboard: Project Settings → API.
The anon/publishable key is safe to use client-side — it's not a secret.

**Only run `npm install`/`npm run dev`/`npm run build` on your actual Mac's
Terminal**, not through any bridge/remote tool — a mismatched CPU
architecture will corrupt `node_modules` (this happened once during
development; fixed with `rm -rf node_modules package-lock.json && npm
install`).

## Database changes

There's no ORM and no Supabase CLI in this project — every schema change is
a plain `.sql` file under `supabase/migrations/`, run once, in order,
through the Supabase SQL Editor (Dashboard → SQL Editor). The files are kept
in git as a historical record, but running them again on the same database
isn't needed or safe to repeat blindly (several `create table`/`create
extension` statements aren't idempotent) — they were each run exactly once
during the initial build.

To make a future schema change: write a new numbered file
(`0009_whatever.sql`), run it once in the SQL Editor, then commit it. Keep
using `create or replace function` for functions (safe to re-run) but plain
`create table`/`create policy` for anything new.

## Roles

There's no invite flow. Anyone can sign up and becomes a `member` by
default. To make someone an admin, run (as an existing admin, in the SQL
Editor):

```sql
update public.profiles set role = 'admin' where email = 'their@email.com';
```

Admins can also demote/promote from the app itself: Admin → Members tab, via
the role dropdown. Be careful not to demote your own only-admin account —
there's no self-recovery flow other than the SQL command above.

The **Members** tab's "Active" checkbox actually blocks a member's access
when unchecked (they get a "deactivated" screen and can't reach any page).

## Daily operations

- **The check-in code**: Admin → Overview shows today's code, created
  automatically the first time an admin opens that page each day. Share it
  with members in person at the club (a whiteboard, printed sheet,
  whatever) — it deliberately never appears anywhere a member's browser can
  read it.
- **No-shows**: a background job (`pg_cron`, every 5 minutes) automatically
  marks any reservation whose time slot has ended without a check-in as
  `no_show` and adds it to Admin → Overview's no-show fee list. From there,
  mark each one "charged" or "waived" (charging itself happens outside the
  app — cash, Venmo, whatever the club uses) and export the list to CSV
  anytime.
- **Reminder emails**: another 5-minute job emails anyone with an
  unconfirmed reservation starting within the hour, prompting them to
  confirm. See the Resend section below for the current sandbox limitation.
- **Manual overrides**: Admin → Reservations lets you confirm, check in,
  cancel, or mark a no-show for any member's reservation on any date — for
  edge cases like a dead phone at the club.
- **Editing courts**: Admin → Courts. Latitude/longitude fields only matter
  if GPS validation gets added later (see below) — safe to ignore for now.
- **Club hours**: hardcoded as a constant in `src/lib/scheduling.ts`
  (`OPEN_HOUR`/`CLOSE_HOUR`, currently 7am–9pm, 1-hour slots). Change those
  two numbers and redeploy if the club's actual hours differ.
- **Club timezone (daily code rollover)**: the daily check-in code's "day"
  is defined by the Postgres function `public.club_today()`
  (`supabase/migrations/0009_fix_daily_code_timezone.sql`), hardcoded to
  `America/Los_Angeles`. This exists because bare `current_date` in
  Postgres uses the database's session timezone (UTC on Supabase by
  default), which would roll the code over at 5pm Pacific instead of local
  midnight. If the club is ever in a different timezone, update the
  timezone string in that function (via `create or replace function` in
  the SQL Editor) — nothing else needs to change.

## Turning on real email delivery

Resend's sandbox sender (`onboarding@resend.dev`) can only email the address
you personally signed up to Resend with — nobody else will receive
reminders until you verify a real domain:

1. In Resend, go to Domains → Add Domain, enter a domain you own.
2. Add the DNS records Resend shows you, at wherever that domain is
   registered.
3. Once verified, update the `from` address in
   `supabase/migrations/0007_reminder_emails.sql`'s function (via `create or
   replace function` in the SQL Editor) to use your verified domain instead
   of `onboarding@resend.dev`.

## Adding GPS/location validation later

This was deliberately left out of the initial build (code-only check-in for
now). To add it: `validate_checkin()` in
`supabase/migrations/0004_daily_code_checkin.sql` is the one place to add a
distance check — compare the member's submitted lat/lng against the court's
`latitude`/`longitude` columns (already in the schema, currently placeholder
`0, 0` — update them to the club's real coordinates first via Admin →
Courts). The frontend would need to request the browser's Geolocation API
and send the coordinates alongside the code in `MyReservations.tsx`'s
check-in call.

## Known limitations / not built

- No payment processing — no-show fees are tracked, not charged, in-app.
- No password reset flow beyond what Supabase Auth provides by default.
- No mobile app — this is a responsive web app, works fine on a phone
  browser but isn't installable as a native app (a PWA manifest could be
  added later if wanted).

## Troubleshooting quick reference

- **"Cannot find native binding" / rolldown errors on `npm run dev`**: a
  platform mismatch in `node_modules`. Fix: `rm -rf node_modules
  package-lock.json && npm install`, run on your actual Mac, not through any
  remote/bridge tool.
- **`git push` asks for a password and rejects it**: GitHub requires a
  Personal Access Token, not your account password. Settings → Developer
  settings → Personal access tokens → Tokens (classic) → Generate new token
  (classic), `repo` scope. Paste the token when Terminal asks for a
  password.
- **Table Editor times look wrong**: Supabase's Table Editor displays
  `timestamptz` values in UTC (`+00`), not your local timezone — easy to
  misjudge by several hours. For test data, prefer SQL like `now() +
  interval '30 minutes'` over hand-typing a wall-clock time.
- **Checking what a `pg_net` HTTP call actually did** (e.g. debugging the
  reminder emails): `select id, status_code, content, created from
  net._http_response order by id desc limit 5;` in the SQL Editor shows the
  real response from Resend's API.
