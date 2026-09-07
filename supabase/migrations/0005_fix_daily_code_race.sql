-- Fixes a race in get_or_create_today_code(): React's StrictMode (and just
-- two people opening the Admin page at the same moment) can fire two calls
-- at once. Both would see "no code yet" and both try to INSERT, and the
-- second one hits daily_codes_code_date_key. Using `on conflict do nothing`
-- makes the insert atomic instead of check-then-insert.

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
    current_date,
    upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
    auth.uid()
  )
  on conflict (code_date) do nothing;

  select code into v_code from public.daily_codes where code_date = current_date;

  return v_code;
end;
$$;
