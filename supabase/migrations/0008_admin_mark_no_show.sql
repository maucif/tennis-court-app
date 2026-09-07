-- Lets an admin manually mark a specific reservation as a no-show right
-- now (e.g. they know for certain someone isn't coming), instead of
-- waiting for the automatic sweep at end_time. Mirrors the sweep's own
-- logic (mark no_show, insert a fee row, bump the member's count) but for
-- one reservation on demand.

create or replace function public.admin_mark_no_show(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can do this';
  end if;

  select member_id, status
  into v_member_id, v_status
  from public.reservations
  where id = p_reservation_id
  for update;

  if v_member_id is null then
    raise exception 'Reservation not found';
  end if;

  if v_status = 'no_show' then
    return;
  end if;

  if v_status in ('completed', 'cancelled') then
    raise exception 'Reservation is already %, cannot mark as no-show', v_status;
  end if;

  update public.reservations
  set status = 'no_show'
  where id = p_reservation_id;

  insert into public.no_show_fees (reservation_id, member_id)
  values (p_reservation_id, v_member_id);

  update public.profiles
  set no_show_count = no_show_count + 1
  where id = v_member_id;
end;
$$;

grant execute on function public.admin_mark_no_show(uuid) to authenticated;
