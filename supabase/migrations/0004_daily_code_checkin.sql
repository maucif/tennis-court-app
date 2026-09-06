-- Daily code + on-site check-in (code only for now — GPS/location distance
-- check was intentionally deferred; can be added later as an extra
-- condition inside validate_checkin() without touching anything else).

-- Admin-only: returns today's code, creating one the first time it's asked
-- for each day. Defense in depth beyond the daily_codes RLS policy — this
-- function double-checks is_admin() itself before touching the table.
create function public.get_or_create_today_code()
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

  select code into v_code from public.daily_codes where code_date = current_date;

  if v_code is null then
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    insert into public.daily_codes (code_date, code, created_by)
    values (current_date, v_code, auth.uid());
  end if;

  return v_code;
end;
$$;

grant execute on function public.get_or_create_today_code() to authenticated;

-- Member-callable: checks the entered code against today's code and marks
-- the reservation validated + completed. Works whether or not the member
-- confirmed earlier (Step 5) — confirming is just an earlier heads-up,
-- checking in is what actually matters for no-show tracking (Step 7).
create function public.validate_checkin(p_reservation_id uuid, p_code text)
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
  where code_date = current_date;

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

grant execute on function public.validate_checkin(uuid, text) to authenticated;
