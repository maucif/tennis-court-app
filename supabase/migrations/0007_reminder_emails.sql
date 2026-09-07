-- Confirmation reminder emails, sent ~60 minutes before each reservation.
--
-- Uses pg_net (Supabase's async-HTTP-from-SQL extension) to call Resend's
-- API directly from a scheduled Postgres function — no Edge Function
-- deployment needed, consistent with how the rest of this project has been
-- run entirely through the SQL Editor.
--
-- BEFORE running this file: store your Resend API key in Supabase's Vault
-- (do this once, it's not part of this migration on purpose — a secret
-- shouldn't sit in a file that gets committed to git):
--
--   select vault.create_secret('re_your_real_key_here', 'resend_api_key');
--
-- Get the key from resend.com -> API Keys, after signing up. Note: without
-- verifying your own sending domain in Resend, their sandbox sender
-- (onboarding@resend.dev, used below) can only deliver to the email address
-- you signed up to Resend with — fine for testing solo, but the rest of the
-- club won't receive anything until you verify a domain there.

create extension if not exists pg_net;

create or replace function public.send_reservation_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
  v_api_key text;
begin
  -- Same dual-caller pattern as run_no_show_sweep: pg_cron (no JWT) is
  -- allowed through, a logged-in caller must be an admin.
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can trigger reminder emails';
  end if;

  select decrypted_secret into v_api_key
  from vault.decrypted_secrets
  where name = 'resend_api_key';

  if v_api_key is null then
    raise exception 'resend_api_key not set — see the comment at the top of this migration';
  end if;

  for r in
    select res.id, res.start_time, p.email, p.full_name, c.number as court_number
    from public.reservations res
    join public.profiles p on p.id = res.member_id
    join public.courts c on c.id = res.court_id
    where res.status = 'booked'
      and res.reminder_sent_at is null
      and res.start_time > now()
      and res.start_time <= now() + interval '60 minutes'
  loop
    if r.email is not null then
      perform net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_api_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'from', 'Court Reserve <onboarding@resend.dev>',
          'to', jsonb_build_array(r.email),
          'subject', 'Confirm your court reservation — starting soon',
          'html', format(
            '<p>Hi %s,</p><p>Your reservation for Court %s at %s starts in less than an hour. Open the app and tap <strong>Confirm</strong> on My Reservations to keep your slot.</p>',
            coalesce(r.full_name, 'there'),
            r.court_number,
            to_char(r.start_time, 'FMDay FMMonth FMDD "at" HH12:MI AM')
          )
        )
      );
    end if;

    update public.reservations
    set reminder_sent_at = now()
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.send_reservation_reminders() to authenticated;

select cron.schedule(
  'reservation-reminders',
  '*/5 * * * *',
  $$ select public.send_reservation_reminders(); $$
);
