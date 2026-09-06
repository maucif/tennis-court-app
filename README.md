# Tennis Court Reservation App

12-court club reservation app. Members book a court/time slot, confirm 1 hour
before, then validate on-site via geolocation + a daily code known only to the
admin. Anyone who skips confirm/validate lands on a no-show list the admin can
use to charge a fee.

Stack: React + Vite + TypeScript + Tailwind CSS, Supabase (Postgres, Auth,
Row Level Security, Edge Functions, scheduled jobs), deployed via Vercel.

## Setup

```bash
npm install
cp .env.example .env.local
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase
# project settings (Project Settings -> API)
npm run dev
```

## Scripts

- `npm run dev` — local dev server
- `npm run build` — type-check and production build
- `npm run preview` — preview the production build locally

## Project structure

```
src/
  components/   shared UI (layout, nav, etc.)
  pages/        routed pages (Book, MyReservations, Admin, ...)
  lib/          supabase client, helpers
  context/      React context (auth/session, once added)
```

## Status

This is being built in small, confirmed steps. See the project's
"architecture-and-build-plan" doc for the full data model, security model,
and build order. Currently: Step 1 (project scaffold) complete.
