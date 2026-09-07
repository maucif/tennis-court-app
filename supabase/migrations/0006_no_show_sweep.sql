-- No-show sweep: anyone who never validated (checked in with the code) by
-- the time their slot ends is marked a no-show and gets a row in
-- no_show_fees for the admin to act on. Cutoff is end_time (not
-- start_time + grace) because Step 6's check-in window already runs all
-- the way through end_time — using an earlier cutoff would mark someone a
-- no-show while validate_checkin() would still have accepted their code.

create or replace function public.run_no_show_sweep()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
begin
  -- Callable two ways: by pg_cron (no JWT, auth.uid() is null — allowed
  -- through) and by an admin from the app (auth.uid() set — must be admin).
  -- A logged-in non-admin gets rejected either way.
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can run the no-show sweep';
  end if;

  for r in
    select id, member_id
    from public.reservations
    where status in ('booked', 'confirmed')
      and end_time < now()
      and validated_at is null
    for update skip locked
  loop
    update public.reservations
    set status = 'no_show'
    where id = r.id;

    insert into public.no_show_fees (reservation_id, member_id)
    values (r.id, r.member_id);

    update public.profiles
    set no_show_count = no_show_count + 1
    where id = r.member_id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.run_no_show_sweep() to authenticated;

-- Run it automatically every 5 minutes.
--
-- If `create extension` below fails with a permissions error, enable
-- pg_cron instead via Dashboard -> Database -> Extensions -> search
-- "pg_cron" -> Enable, then just run the `select cron.schedule(...)` part.
create extension if not exists pg_cron;

select cron.schedule(
  'no-show-sweep',
  '*/5 * * * *',
  $$ select public.run_no_show_sweep(); $$
);
