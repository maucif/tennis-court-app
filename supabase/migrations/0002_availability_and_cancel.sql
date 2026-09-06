-- Adds what the booking grid needs beyond Step 2's schema:
--
-- 1. court_availability: a view exposing which (court, time) slots are taken,
--    WITHOUT exposing who booked them. Members only have a SELECT policy on
--    their own rows in `reservations` (Step 2, on purpose), so without this
--    they'd have no way to see that a slot is taken by someone else. Views
--    run with the privileges of the role that created them (the Supabase SQL
--    Editor runs as an owner role that bypasses RLS) unless marked
--    security_invoker, so this view intentionally sees every reservation
--    while only ever returning court/time columns — never member_id.
--
-- 2. cancel_reservation(): lets a member cancel their own upcoming booking
--    without giving them a general UPDATE policy on `reservations` (which
--    would also let them tamper with validated_at/status directly).

create view public.court_availability as
select court_id, start_time, end_time
from public.reservations
where status <> 'cancelled';

grant select on public.court_availability to authenticated;

create function public.cancel_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_status text;
  v_start_time timestamptz;
begin
  select member_id, status, start_time
  into v_member_id, v_status, v_start_time
  from public.reservations
  where id = p_reservation_id
  for update;

  if v_member_id is null then
    raise exception 'Reservation not found';
  end if;

  if v_member_id <> auth.uid() and not public.is_admin() then
    raise exception 'Not authorized to cancel this reservation';
  end if;

  if v_status not in ('booked', 'confirmed') then
    raise exception 'Reservation cannot be cancelled (status: %)', v_status;
  end if;

  if v_start_time <= now() then
    raise exception 'Cannot cancel a reservation that has already started';
  end if;

  update public.reservations
  set status = 'cancelled'
  where id = p_reservation_id;
end;
$$;

grant execute on function public.cancel_reservation(uuid) to authenticated;
