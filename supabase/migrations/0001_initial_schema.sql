-- Tennis Court Reservation App — initial schema
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query),
-- then run seed.sql.

-- Needed for the reservations exclusion constraint (prevents double-booking a court)
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, holds the club role (member/admin)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'member' check (role in ('member', 'admin')),
  is_active boolean not null default true,
  no_show_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Helper used throughout RLS policies below
create function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- courts
-- ---------------------------------------------------------------------------
create table public.courts (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  is_active boolean not null default true
);

-- ---------------------------------------------------------------------------
-- reservations
-- ---------------------------------------------------------------------------
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts (id) on delete restrict,
  member_id uuid not null references public.profiles (id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'booked'
    check (status in ('booked', 'confirmed', 'completed', 'no_show', 'cancelled')),
  confirmed_at timestamptz,
  validated_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reservations_time_valid check (end_time > start_time),
  -- Makes double-booking a court physically impossible at the DB level.
  -- Cancelled reservations don't block the slot.
  exclude using gist (
    court_id with =,
    tstzrange(start_time, end_time) with &&
  ) where (status <> 'cancelled')
);

create index reservations_member_id_idx on public.reservations (member_id);
create index reservations_start_time_idx on public.reservations (start_time);

-- ---------------------------------------------------------------------------
-- daily_codes: one row per day, admin-only. The code itself must never be
-- exposed to member clients — on-site check-in (Step 6) will validate it via
-- a security-definer function instead of ever selecting it out to a member.
-- ---------------------------------------------------------------------------
create table public.daily_codes (
  id uuid primary key default gen_random_uuid(),
  code_date date not null unique,
  code text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- no_show_fees
-- ---------------------------------------------------------------------------
create table public.no_show_fees (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'charged', 'waived')),
  note text,
  created_at timestamptz not null default now(),
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.courts enable row level security;
alter table public.reservations enable row level security;
alter table public.daily_codes enable row level security;
alter table public.no_show_fees enable row level security;

-- profiles: read/update your own row; admins read/update everyone's
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- courts: everyone can read; only admins can write
create policy courts_select on public.courts
  for select using (true);

create policy courts_admin_write on public.courts
  for all using (public.is_admin()) with check (public.is_admin());

-- reservations: members can read their own and book new ones. Members do NOT
-- get a generic UPDATE policy here on purpose — confirm (Step 5), on-site
-- validation (Step 6), and cancel (Step 4) are added as narrow
-- security-definer functions later so a member can never set validated_at,
-- status, or someone else's reservation directly via the API. Admins can do
-- everything.
create policy reservations_select on public.reservations
  for select using (member_id = auth.uid() or public.is_admin());

create policy reservations_insert on public.reservations
  for insert with check (member_id = auth.uid() or public.is_admin());

create policy reservations_admin_update on public.reservations
  for update using (public.is_admin());

create policy reservations_admin_delete on public.reservations
  for delete using (public.is_admin());

-- daily_codes: admin only, full stop (select included — members never read this table)
create policy daily_codes_admin_only on public.daily_codes
  for all using (public.is_admin()) with check (public.is_admin());

-- no_show_fees: members can see their own entries; only admins can write
create policy no_show_fees_select on public.no_show_fees
  for select using (member_id = auth.uid() or public.is_admin());

create policy no_show_fees_admin_write on public.no_show_fees
  for insert with check (public.is_admin());

create policy no_show_fees_admin_update on public.no_show_fees
  for update using (public.is_admin());
