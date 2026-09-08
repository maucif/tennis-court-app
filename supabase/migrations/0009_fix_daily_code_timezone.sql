-- Fixes the daily code rolling over at the wrong time.
--
-- get_or_create_today_code() and validate_checkin() both used bare
-- `current_date`, which Postgres evaluates in the DATABASE'S session
-- timezone — UTC by default on Supabase. That made the "day" roll over at
-- UTC midnight, i.e. 5pm Pacific (4pm during daylight saving), not at the
-- club's actual local midnight. An admin opening the Overview page in the
-- evening could generate/see a code for what already felt like the next
-- day, and a member's on-site code entry could be checked against the
-- wrong day's code near that boundary.
--
-- Fix: introduce public.club_today(), a single place that defines what
-- "today" means for the club, and use it everywhere `current_date` was
-- being used for the daily code. If the club is ever in a different
-- timezone, change the constant below and re-run this file (it's a
-- `create or replace function`, safe to re-run).

create or replace function public.club_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Los_Angeles')::date;
$$;

create or replace function public.get_or_create_today_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can view the daily code';
  end if;

  insert into public.daily_codes (code_date, code, created_by)
  values (
    public.club_today(),
    upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
    auth.uid()
  )
  on conflict (code_date) do nothing;

  select code into v_code from public.daily_codes where code_date = public.club_today();

  return v_code;
end;
$$;

create or replace function public.validate_checkin(p_reservation_id uuid, p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_status text;
  v_start_time timestamptz;
  v_end_time timestamptz;
  v_expected_code text;
begin
  select member_id, status, start_time, end_time
  into v_member_id, v_status, v_start_time, v_end_time
  from public.reservations
  where id = p_reservation_id
  for update;

  if v_member_id is null then
    raise exception 'Reservation not found';
  end if;

  if v_member_id <> auth.uid() then
    raise exception 'Not authorized to check in for this reservation';
  end if;

  if v_status not in ('booked', 'confirmed') then
    raise exception 'This reservation cannot be checked in (status: %)', v_status;
  end if;

  if now() < v_start_time - interval '15 minutes' then
    raise exception 'Too early to check in — come back closer to your start time';
  end if;

  if now() > v_end_time then
    raise exception 'This reservation has already ended';
  end if;

  select code into v_expected_code
  from public.daily_codes
  where code_date = public.club_today();

  if v_expected_code is null then
    raise exception 'No code has been set for today — ask the admin';
  end if;

  if upper(trim(p_code)) <> upper(v_expected_code) then
    raise exception 'Incorrect code';
  end if;

  update public.reservations
  set validated_at = now(), status = 'completed'
  where id = p_reservation_id;
end;
$$;

grant execute on function public.club_today() to authenticated;
