-- GuestGallery - manual RLS checks (DESIGN.md section 11, level 2)
-- Run AFTER applying supabase/migrations/20261116000000_init_schema.sql.
-- Paste this whole file into the Supabase SQL editor and press Run.
--
-- What it does: creates 4 fake users, then pretends to be each of them
-- (set local role authenticated + a fake JWT) and tries things that must work
-- or must be blocked. Every check has its expected outcome in a comment and in
-- the result table. At the end all test data is deleted again.
-- Result: a table with one row per check; the column "pass" must be true everywhere.
--
-- Fake users:  H = host of event A, G = guest in event A,
--              O = host of event B (a different event), X = signed in but not in any event.

drop table if exists pg_temp.rls_results;
create temp table rls_results (
  n          serial primary key,
  check_name text,
  expected   text,
  got        text,
  pass       boolean
);

do $$
declare
  u_h uuid := '00000000-0000-4000-8000-0000000000a1';
  u_g uuid := '00000000-0000-4000-8000-0000000000a2';
  u_o uuid := '00000000-0000-4000-8000-0000000000a3';
  u_x uuid := '00000000-0000-4000-8000-0000000000a4';
  r        jsonb;
  res      jsonb := '[]'::jsonb;
  ev_a     uuid;  code_a text;
  ev_b     uuid;  code_b text;
  ch_a     uuid := gen_random_uuid();   -- challenge in event A
  ch_b     uuid := gen_random_uuid();   -- challenge in event B
  ph_g     uuid := gen_random_uuid();   -- photo by G in A
  ph_h     uuid := gen_random_uuid();   -- photo by H in A
  ph_o     uuid := gen_random_uuid();   -- photo by O in B
  ph_late  uuid := gen_random_uuid();
  ph_g2    uuid := gen_random_uuid();   -- second storage object of G
  ph_x     uuid := gen_random_uuid();   -- throw-away id for photos that must be rejected
  ph_ev    uuid := gen_random_uuid();   -- event inserted directly by X
  n        int;
  msg      text;
  txt      text;
  i        int;
begin
  -- ---------- setup (as the SQL editor's superuser role) ----------
  delete from auth.users where id in (u_h, u_g, u_o, u_x);   -- leftovers of an earlier run
  insert into auth.users (id, aud, role, is_anonymous)
  select x, 'authenticated', 'authenticated', true from unnest(array[u_h, u_g, u_o, u_x]) as x;
  perform set_config('storage.allow_delete_query', 'true', true); -- storage blocks raw DELETEs otherwise

  -- =============== H (host of A) ===============
  perform set_config('request.jwt.claims', json_build_object('sub', u_h, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  r := public.create_event('RLS test A', current_date, 'Hosty');
  ev_a := (r ->> 'id')::uuid;  code_a := r ->> 'code';
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '1.1 create_event returns a 6-char code from the allowed alphabet',
    'e', 'code matches ^[A-HJ-NP-Z2-9]{6}$', 'g', code_a,
    'p', code_a ~ '^[A-HJ-NP-Z2-9]{6}$'));

  select count(*) into n from public.participants where event_id = ev_a and user_id = u_h and nickname = 'Hosty';
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '1.1 create_event also creates the host participant row',
    'e', '1 row', 'g', n || ' rows', 'p', n = 1));

  select count(*) into n from public.events
   where id = ev_a and uploads_close_at = ((current_date + 8)::timestamp at time zone 'UTC');
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '3.4 uploads_close_at = end of event_date + 7 days (UTC)',
    'e', '1 row', 'g', n || ' rows', 'p', n = 1));

  -- host adds challenges
  insert into public.challenges (id, event_id, title, position) values (ch_a, ev_a, 'Best selfie', 1);
  select count(*) into n from public.challenges where id = ch_a;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.1 host can insert a challenge in own event',
    'e', '1 row', 'g', n || ' rows', 'p', n = 1));

  -- H photo
  insert into public.photos (id, event_id, uploader_id, path, thumb_path)
  values (ph_h, ev_a, u_h, ev_a || '/' || ph_h || '.jpg', ev_a || '/' || ph_h || '_thumb.jpg');

  -- storage: H uploads an object (needed for the storage checks below)
  insert into storage.objects (bucket_id, name, owner_id)
  values ('event-photos', ev_a || '/' || ph_h || '.jpg', u_h::text);

  -- =============== O (host of B) ===============
  perform set_config('request.jwt.claims', json_build_object('sub', u_o, 'role', 'authenticated')::text, true);
  r := public.create_event('RLS test B', current_date, null);
  ev_b := (r ->> 'id')::uuid;  code_b := r ->> 'code';
  select nickname into txt from public.participants where event_id = ev_b and user_id = u_o;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '1.1 create_event with empty host nickname falls back to "Host"',
    'e', 'Host', 'g', txt, 'p', txt = 'Host'));

  insert into public.challenges (event_id, title) values (ev_b, 'Challenge in B');
  select id into ch_b from public.challenges where event_id = ev_b;
  insert into public.photos (id, event_id, uploader_id, path, thumb_path)
  values (ph_o, ev_b, u_o, ev_b || '/' || ph_o || '.jpg', ev_b || '/' || ph_o || '_thumb.jpg');

  -- =============== G (guest of A) ===============
  perform set_config('request.jwt.claims', json_build_object('sub', u_g, 'role', 'authenticated')::text, true);

  select count(*) into n from public.events where id = ev_a;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '2.x before joining, a non-participant cannot read the event',
    'e', '0 rows', 'g', n || ' rows', 'p', n = 0));

  -- lower-case code with spaces must work (SPEC 2.2)
  r := public.join_event('  ' || lower(substr(code_a, 1, 3)) || ' ' || lower(substr(code_a, 4)) || ' ', 'Guesty');
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '2.2 join_event accepts lower-case code with spaces',
    'e', 'returns the event of code A', 'g', r ->> 'code', 'p', (r ->> 'id')::uuid = ev_a));

  r := public.join_event(code_a, 'Guesty');   -- same device, same nickname again
  select count(*) into n from public.participants where event_id = ev_a and user_id = u_g;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '2.3 re-join from the same device with the same nickname',
    'e', 'no error, still exactly 1 participant row', 'g', n || ' rows', 'p', n = 1));

  msg := 'no error';
  begin perform public.join_event('ZZZZZZ', 'Whoever'); exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '2.2 unknown code', 'e', 'EVENT_NOT_FOUND', 'g', msg, 'p', msg = 'EVENT_NOT_FOUND'));

  select count(*) into n from public.events where id = ev_a;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '4.x participant can read the event', 'e', '1 row', 'g', n || ' rows', 'p', n = 1));

  select count(*) into n from public.events where id = ev_b;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'participant of A cannot read event B', 'e', '0 rows', 'g', n || ' rows', 'p', n = 0));

  -- direct insert into participants is not allowed (only via join_event)
  msg := 'no error';
  begin insert into public.participants (event_id, user_id, nickname) values (ev_b, u_g, 'Sneaky');
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'direct insert into participants', 'e', 'error: row-level security policy',
    'g', msg, 'p', msg like '%row-level security%'));

  -- guest cannot add challenges
  msg := 'no error';
  begin insert into public.challenges (event_id, title) values (ev_a, 'Guest challenge');
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.1 guest inserts a challenge', 'e', 'error: row-level security policy',
    'g', msg, 'p', msg like '%row-level security%'));

  update public.challenges set title = 'hacked' where id = ch_a;
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.1 guest updates a challenge', 'e', '0 rows affected', 'g', n || ' rows', 'p', n = 0));

  delete from public.challenges where id = ch_a;
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.1 guest deletes a challenge', 'e', '0 rows affected', 'g', n || ' rows', 'p', n = 0));

  update public.events set name = 'hacked' where id = ev_a;
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'guest updates the event', 'e', '0 rows affected', 'g', n || ' rows', 'p', n = 0));

  update public.participants set nickname = 'Guesty2' where event_id = ev_a and user_id = u_g;
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '2.3 guest renames self',
    'e', '1 row affected', 'g', n || ' rows', 'p', n = 1));
  update public.participants set nickname = 'Guesty' where event_id = ev_a and user_id = u_g;   -- back to the original
  update public.participants set nickname = 'Hijacked' where event_id = ev_a and user_id = u_h;
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '2.3 guest renames another participant',
    'e', '0 rows affected', 'g', n || ' rows', 'p', n = 0));
  msg := 'no error';
  begin update public.participants set nickname = 'HOSTY' where event_id = ev_a and user_id = u_g;
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '2.3 guest takes a nickname already used (other case) in the same event',
    'e', 'error: unique violation', 'g', msg, 'p', msg like '%duplicate key%'));
  msg := 'no error';
  begin update public.participants set event_id = ev_b where user_id = u_g;
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'guest changes participants.event_id',
    'e', 'error: permission denied', 'g', msg, 'p', msg like 'permission denied%'));
  msg := 'no error';
  begin delete from public.participants where user_id = u_g;
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'participants delete is not allowed (guest)',
    'e', 'error: permission denied', 'g', msg, 'p', msg like 'permission denied%'));
  msg := 'no error';
  begin delete from public.events where id = ev_a;
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'events delete is not allowed (guest)',
    'e', 'error: permission denied', 'g', msg, 'p', msg like 'permission denied%'));

  -- guest uploads a photo (ok)
  insert into public.photos (id, event_id, uploader_id, challenge_id, path, thumb_path)
  values (ph_g, ev_a, u_g, ch_a, ev_a || '/' || ph_g || '.jpg', ev_a || '/' || ph_g || '_thumb.jpg');
  select count(*) into n from public.photos where id = ph_g;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '3.1 participant inserts own photo (with a challenge of the same event)',
    'e', '1 row', 'g', n || ' rows', 'p', n = 1));

  msg := 'no error';
  begin insert into public.photos (id, event_id, uploader_id, path, thumb_path)
        values (ph_x, ev_a, u_g, ev_a || '/' || ph_h || '.jpg', ev_a || '/' || ph_x || '_thumb.jpg');   -- path of H's photo
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '3.1 insert a photo whose path points at another photo',
    'e', 'error: check constraint photos_paths_match_id', 'g', msg, 'p', msg like '%photos_paths_match_id%'));
  msg := 'no error';
  begin insert into public.photos (id, event_id, uploader_id, path, thumb_path)
        values (ph_x, ev_a, u_g, ev_a || '/' || ph_x || '.jpg', ev_a || '/' || ph_h || '_thumb.jpg');   -- thumb of H's photo
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '3.1 insert a photo whose thumb_path points at another photo',
    'e', 'error: check constraint photos_paths_match_id', 'g', msg, 'p', msg like '%photos_paths_match_id%'));
  msg := 'no error';
  begin insert into public.photos (id, event_id, uploader_id, path, thumb_path)
        values (ph_x, ev_a, u_g, 'x.jpg', 'x_thumb.jpg');
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '3.1 insert a photo with paths outside the layout',
    'e', 'error: check constraint photos_paths_match_id', 'g', msg, 'p', msg like '%photos_paths_match_id%'));

  msg := 'no error';
  begin insert into public.photos (id, event_id, uploader_id, path, thumb_path)
        values (ph_x, ev_a, u_h, ev_a || '/' || ph_x || '.jpg', ev_a || '/' || ph_x || '_thumb.jpg');   -- pretending to be H
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '3.1 insert a photo with somebody else''s uploader_id', 'e', 'error: row-level security policy',
    'g', msg, 'p', msg like '%row-level security%'));

  msg := 'no error';
  begin insert into public.photos (id, event_id, uploader_id, challenge_id, path, thumb_path)
        values (ph_x, ev_a, u_g, ch_b, ev_a || '/' || ph_x || '.jpg', ev_a || '/' || ph_x || '_thumb.jpg');   -- challenge of event B
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.2 insert a photo with a challenge from another event', 'e', 'error: row-level security policy',
    'g', msg, 'p', msg like '%row-level security%'));

  msg := 'no error';
  begin insert into public.photos (id, event_id, uploader_id, path, thumb_path)
        values (ph_x, ev_b, u_g, ev_b || '/' || ph_x || '.jpg', ev_b || '/' || ph_x || '_thumb.jpg');   -- G is not in event B
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'insert a photo into an event I did not join', 'e', 'error: row-level security policy',
    'g', msg, 'p', msg like '%row-level security%'));

  msg := 'no error';
  begin update public.photos set path = 'changed.jpg' where id = ph_g;
        get diagnostics n = row_count; msg := n || ' rows updated';
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'nobody can update a photo', 'e', 'error: permission denied (or 0 rows updated)',
    'g', msg, 'p', msg like 'permission denied%' or msg = '0 rows updated'));

  select count(*) into n from public.photos_with_author where event_id = ev_a and author_nickname is not null;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '4.1 photos_with_author shows photos of A with nicknames', 'e', '2 rows (H and G photos)',
    'g', n || ' rows', 'p', n = 2));

  select count(*) into n from public.photos_with_author where event_id = ev_b;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'photos_with_author hides photos of event B', 'e', '0 rows', 'g', n || ' rows', 'p', n = 0));

  delete from public.photos where id = ph_h;   -- H's photo
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '3.3 guest deletes somebody else''s photo', 'e', '0 rows affected', 'g', n || ' rows', 'p', n = 0));

  -- storage as G
  insert into storage.objects (bucket_id, name, owner_id)
  values ('event-photos', ev_a || '/' || ph_g || '.jpg', u_g::text);
  select count(*) into n from storage.objects where bucket_id = 'event-photos' and name like ev_a || '/%';
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'storage: participant uploads into own event folder and sees its files',
    'e', '2 objects visible (H''s and G''s)', 'g', n || ' objects', 'p', n = 2));

  insert into storage.objects (bucket_id, name, owner_id)
  values ('event-photos', ev_a || '/' || ph_g2 || '.jpg', u_g::text);
  delete from storage.objects where bucket_id = 'event-photos' and name = ev_a || '/' || ph_g2 || '.jpg';
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'storage: uploader deletes own file',
    'e', '1 row affected', 'g', n || ' rows', 'p', n = 1));

  msg := 'no error';
  begin insert into storage.objects (bucket_id, name, owner_id)
        values ('event-photos', ev_b || '/' || gen_random_uuid() || '.jpg', u_g::text);
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'storage: upload into the folder of an event I did not join', 'e', 'error: row-level security policy',
    'g', msg, 'p', msg like '%row-level security%'));

  msg := 'no error';
  begin insert into storage.objects (bucket_id, name, owner_id)
        values ('event-photos', ev_a || '/not-a-photo.txt', u_g::text);
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'storage: upload with a path outside the layout', 'e', 'error: row-level security policy',
    'g', msg, 'p', msg like '%row-level security%'));

  delete from storage.objects where bucket_id = 'event-photos' and name = ev_a || '/' || ph_h || '.jpg';
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'storage: guest deletes the file of somebody else', 'e', '0 rows affected', 'g', n || ' rows', 'p', n = 0));

  -- =============== X (signed in, in no event) ===============
  perform set_config('request.jwt.claims', json_build_object('sub', u_x, 'role', 'authenticated')::text, true);

  select count(*) into n from public.photos where event_id = ev_a;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'non-participant reads photos of A', 'e', '0 rows', 'g', n || ' rows', 'p', n = 0));

  select count(*) into n from public.participants where event_id = ev_a;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'non-participant reads participants of A', 'e', '0 rows', 'g', n || ' rows', 'p', n = 0));

  select count(*) into n from storage.objects where bucket_id = 'event-photos' and name like ev_a || '/%';
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'storage: non-participant lists files of A', 'e', '0 objects', 'g', n || ' objects', 'p', n = 0));

  msg := 'no error';
  begin insert into public.photos (id, event_id, uploader_id, path, thumb_path)
        values (ph_x, ev_a, u_x, ev_a || '/' || ph_x || '.jpg', ev_a || '/' || ph_x || '_thumb.jpg');
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'non-participant inserts a photo into A', 'e', 'error: row-level security policy',
    'g', msg, 'p', msg like '%row-level security%'));

  msg := 'no error';
  begin insert into public.events (id, code, name, event_date, host_id, uploads_close_at)
        values (ph_ev, 'RLSTE5', 'Direct insert', current_date, u_x, now() + interval '1 day');
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '4.x direct insert into events with host_id = own id',
    'e', 'no error', 'g', msg, 'p', msg = 'no error'));
  msg := 'no error';
  begin insert into public.events (code, name, event_date, host_id, uploads_close_at)
        values ('RLSTE6', 'Forged host', current_date, u_o, now() + interval '1 day');
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '4.x direct insert into events with another user''s host_id',
    'e', 'error: row-level security policy', 'g', msg, 'p', msg like '%row-level security%'));

  msg := 'no error';
  begin perform public.join_event(code_a, 'GUESTY');   -- same nickname as G, different case
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '2.3 nickname taken (case-insensitive)', 'e', 'NICKNAME_TAKEN', 'g', msg, 'p', msg = 'NICKNAME_TAKEN'));

  select count(*) into n from public.participants where event_id = ev_a;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '2.3 failed join left no participant row for X', 'e', '0 rows visible to X', 'g', n || ' rows', 'p', n = 0));

  -- =============== O again: host of ANOTHER event ===============
  perform set_config('request.jwt.claims', json_build_object('sub', u_o, 'role', 'authenticated')::text, true);
  delete from storage.objects where bucket_id = 'event-photos' and name = ev_a || '/' || ph_h || '.jpg';
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '6.1 host of event B deletes a file of event A (storage)',
    'e', '0 rows affected', 'g', n || ' rows', 'p', n = 0));

  -- =============== H again: host powers ===============
  perform set_config('request.jwt.claims', json_build_object('sub', u_h, 'role', 'authenticated')::text, true);

  select count(*) into n from public.participants where event_id = ev_a;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '2.3 participants of A after G joined twice and X failed', 'e', '2 rows (H and G)',
    'g', n || ' rows', 'p', n = 2));

  update public.events set name = 'RLS test A renamed' where id = ev_a;
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '2.1 host updates the event name',
    'e', '1 row affected', 'g', n || ' rows', 'p', n = 1));
  msg := 'no error';
  begin update public.events set host_id = u_o where id = ev_a;
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'host updates events.host_id',
    'e', 'error: permission denied', 'g', msg, 'p', msg like 'permission denied%'));
  msg := 'no error';
  begin update public.events set code = 'RLSTE7' where id = ev_a;
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'host updates events.code',
    'e', 'error: permission denied', 'g', msg, 'p', msg like 'permission denied%'));
  msg := 'no error';
  begin update public.events set uploads_close_at = now() + interval '100 years' where id = ev_a;
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'host updates events.uploads_close_at',
    'e', 'error: permission denied', 'g', msg, 'p', msg like 'permission denied%'));
  msg := 'no error';
  begin delete from public.events where id = ev_a;
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'events delete is not allowed (host)',
    'e', 'error: permission denied', 'g', msg, 'p', msg like 'permission denied%'));
  msg := 'no error';
  begin delete from public.participants where event_id = ev_a and user_id = u_g;
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', 'participants delete is not allowed (host)',
    'e', 'error: permission denied', 'g', msg, 'p', msg like 'permission denied%'));
  update public.challenges set title = 'Best selfie!' where id = ch_a;
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.1 host updates own challenge',
    'e', '1 row affected', 'g', n || ' rows', 'p', n = 1));

  delete from public.photos where id = ph_o;   -- photo in event B
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '6.1 host deletes a photo in ANOTHER event', 'e', '0 rows affected', 'g', n || ' rows', 'p', n = 0));

  delete from storage.objects where bucket_id = 'event-photos' and name = ev_a || '/' || ph_g || '.jpg';
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '6.1 host deletes a guest''s file in own event (storage)', 'e', '1 row affected', 'g', n || ' rows', 'p', n = 1));

  -- challenge delete keeps photos (SPEC 5.1)
  delete from public.challenges where id = ch_a;
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.1 host deletes own challenge', 'e', '1 row affected', 'g', n || ' rows', 'p', n = 1));
  select count(*) into n from public.photos where id = ph_g and challenge_id is null;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.1 photo survives, challenge_id set to null', 'e', '1 row', 'g', n || ' rows', 'p', n = 1));

  delete from public.photos where id = ph_g;   -- G's photo, deleted by host
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '6.1 host deletes a guest''s photo in own event', 'e', '1 row affected', 'g', n || ' rows', 'p', n = 1));

  -- G deletes own photo (3.3): needs a fresh one
  perform set_config('request.jwt.claims', json_build_object('sub', u_g, 'role', 'authenticated')::text, true);
  insert into public.photos (id, event_id, uploader_id, path, thumb_path)
  values (ph_g, ev_a, u_g, ev_a || '/' || ph_g || '.jpg', ev_a || '/' || ph_g || '_thumb.jpg');
  delete from public.photos where id = ph_g;
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '3.3 guest deletes own photo', 'e', '1 row affected', 'g', n || ' rows', 'p', n = 1));

  -- =============== upload window (3.4) ===============
  execute 'reset role';
  update public.events set uploads_close_at = now() - interval '1 minute' where id = ev_a;
  execute 'set local role authenticated';

  msg := 'no error';
  begin insert into public.photos (id, event_id, uploader_id, path, thumb_path)
        values (ph_late, ev_a, u_g, ev_a || '/' || ph_late || '.jpg', ev_a || '/' || ph_late || '_thumb.jpg');
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '3.4 photo insert after uploads_close_at', 'e', 'error: row-level security policy',
    'g', msg, 'p', msg like '%row-level security%'));

  msg := 'no error';
  begin insert into storage.objects (bucket_id, name, owner_id)
        values ('event-photos', ev_a || '/' || ph_late || '.jpg', u_g::text);
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '3.4 storage upload after uploads_close_at', 'e', 'error: row-level security policy',
    'g', msg, 'p', msg like '%row-level security%'));

  -- reading still works after the window closed
  select count(*) into n from public.events where id = ev_a;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '3.4 gallery stays readable after the window closed', 'e', '1 row', 'g', n || ' rows', 'p', n = 1));

  -- ---------- cleanup (back to superuser) ----------
  execute 'reset role';
  delete from storage.objects where bucket_id = 'event-photos' and (name like ev_a || '/%' or name like ev_b || '/%');
  delete from public.events where id in (ev_a, ev_b);   -- cascades participants, challenges, photos
  delete from auth.users where id in (u_h, u_g, u_o, u_x);

  insert into rls_results (check_name, expected, got, pass)
  select e ->> 'c', e ->> 'e', e ->> 'g', (e ->> 'p')::boolean
  from jsonb_array_elements(res) as e;
end;
$$;

-- Expected: every row has pass = true. If the script stops with an error instead,
-- read the message: it points at the statement that failed unexpectedly.
select n, pass, check_name, expected, got from rls_results order by n;
