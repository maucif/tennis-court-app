-- Lets a member confirm their own reservation starting from 60 minutes
-- before its start time (the "confirmations need to be done an hour
-- before" requirement). Same pattern as cancel_reservation: a narrow
-- security-definer function instead of a general UPDATE policy, so a
-- member still can never set validated_at or jump straight to
-- 'completed'/'no_show' themselves.

create function public.confirm_reservation(p_reservation_id uuid)
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

  if v_member_id <> auth.uid() then
    raise exception 'Not authorized to confirm this reservation';
  end if;

  if v_status <> 'booked' then
    raise exception 'Reservation cannot be confirmed (status: %)', v_status;
  end if;

  if now() < v_start_time - interval '60 minutes' then
    raise exception 'Too early to confirm — check back within an hour of your reservation';
  end if;

  update public.reservations
  set status = 'confirmed', confirmed_at = now()
  where id = p_reservation_id;
end;
$$;

grant execute on function public.confirm_reservation(uuid) to authenticated;
