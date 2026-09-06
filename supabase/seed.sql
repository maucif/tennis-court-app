-- Seeds the 12 courts. Run this after 0001_initial_schema.sql.
--
-- NOTE: latitude/longitude are placeholders (0, 0) below. Before Step 6
-- (GPS on-site validation) these need to be the real coordinates of each
-- court at your club, so update them then — either by re-running an update
-- statement like:
--   update public.courts set latitude = ..., longitude = ... where number = 1;
-- or from the admin UI once it's built.

insert into public.courts (number, name, latitude, longitude) values
  (1, 'Court 1', 0, 0),
  (2, 'Court 2', 0, 0),
  (3, 'Court 3', 0, 0),
  (4, 'Court 4', 0, 0),
  (5, 'Court 5', 0, 0),
  (6, 'Court 6', 0, 0),
  (7, 'Court 7', 0, 0),
  (8, 'Court 8', 0, 0),
  (9, 'Court 9', 0, 0),
  (10, 'Court 10', 0, 0),
  (11, 'Court 11', 0, 0),
  (12, 'Court 12', 0, 0);
