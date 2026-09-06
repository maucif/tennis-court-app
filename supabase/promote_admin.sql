-- Run this once, after you've signed up in the app with your own account,
-- to make yourself the club admin. Replace the email below with the one you
-- signed up with.

update public.profiles
set role = 'admin'
where email = 'you@example.com';
