-- GuestGallery - RLS checks of the likes migration (DESIGN.md sections 4 and 11)
-- Run AFTER applying supabase/migrations/20261123120000_photo_likes.sql.
-- Paste this whole file into the Supabase SQL editor and press Run (same idea as rls_checks.sql).
--
-- Creates fake users and events, pretends to be each user (set local role authenticated + a fake
-- JWT) and tries things that must work or must be blocked. All test data is deleted at the end
-- (one DO block = one transaction, so an error leaves nothing behind).
-- Covers every cell of the photo_likes row of the DESIGN.md section 4 table (incl. the "-" cell).
-- Result: a table with one row per check; the column "pass" must be true everywhere.
--
-- Fake users:  H = host of event A, G = guest in A (uploads photos), L = guest in A (likes),
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
  u_h uuid := '00000000-0000-4000-8000-0000000000b1';
  u_g uuid := '00000000-0000-4000-8000-0000000000b2';
  u_l uuid := '00000000-0000-4000-8000-0000000000b3';
  u_o uuid := '00000000-0000-4000-8000-0000000000b4';
  u_x uuid := '00000000-0000-4000-8000-0000000000b5';
  r        jsonb;
  res      jsonb := '[]'::jsonb;
  ev_a     uuid;  code_a text;
  ev_b     uuid;
  ch_a     uuid := gen_random_uuid();   -- challenge in A
  ch_b     uuid := gen_random_uuid();   -- challenge in B
  ph_g     uuid := gen_random_uuid();   -- G's photo in challenge ch_a (likeable by L)
  ph_plain uuid := gen_random_uuid();   -- G's photo without a challenge
  ph_h     uuid := gen_random_uuid();   -- H's photo in challenge ch_a
  ph_o     uuid := gen_random_uuid();   -- O's photo in challenge ch_b (event B)
  n        int;
  msg      text;
begin
  -- ---------- setup (superuser) ----------
  delete from auth.users where id in (u_h, u_g, u_l, u_o, u_x);   -- leftovers of an earlier run
  insert into auth.users (id, aud, role, is_anonymous)
  select x, 'authenticated', 'authenticated', true from unnest(array[u_h, u_g, u_l, u_o, u_x]) as x;

  perform set_config('request.jwt.claims', json_build_object('sub', u_h, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  r := public.create_event('Likes test A', current_date, 'Hosty');
  ev_a := (r ->> 'id')::uuid;  code_a := r ->> 'code';
  insert into public.challenges (id, event_id, title, position) values (ch_a, ev_a, 'Best selfie', 1);

  perform set_config('request.jwt.claims', json_build_object('sub', u_o, 'role', 'authenticated')::text, true);
  r := public.create_event('Likes test B', current_date, 'Other');
  ev_b := (r ->> 'id')::uuid;
  insert into public.challenges (id, event_id, title, position) values (ch_b, ev_b, 'Challenge B', 1);

  perform set_config('request.jwt.claims', json_build_object('sub', u_g, 'role', 'authenticated')::text, true);
  perform public.join_event(code_a, 'Gina');
  perform set_config('request.jwt.claims', json_build_object('sub', u_l, 'role', 'authenticated')::text, true);
  perform public.join_event(code_a, 'Liker');

  execute 'reset role';
  insert into public.photos (id, event_id, uploader_id, challenge_id, path, thumb_path) values
    (ph_g,     ev_a, u_g, ch_a, ev_a || '/' || ph_g || '.jpg',     ev_a || '/' || ph_g || '_thumb.jpg'),
    (ph_plain, ev_a, u_g, null, ev_a || '/' || ph_plain || '.jpg', ev_a || '/' || ph_plain || '_thumb.jpg'),
    (ph_h,     ev_a, u_h, ch_a, ev_a || '/' || ph_h || '.jpg',     ev_a || '/' || ph_h || '_thumb.jpg'),
    (ph_o,     ev_b, u_o, ch_b, ev_b || '/' || ph_o || '.jpg',     ev_b || '/' || ph_o || '_thumb.jpg');

  -- =============== L (guest of A) : insert ===============
  perform set_config('request.jwt.claims', json_build_object('sub', u_l, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.photo_likes (photo_id, event_id, user_id) values (ph_g, ev_a, u_l);
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.4 participant likes a challenge photo of someone else',
    'e', '1 row inserted', 'g', n || ' rows', 'p', n = 1));

  insert into public.photo_likes (photo_id, event_id, user_id) values (ph_h, ev_a, u_l);   -- the host's photo
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.4 participant likes the host''s challenge photo', 'e', 'no error', 'g', 'no error', 'p', true));

  msg := 'no error';
  begin insert into public.photo_likes (photo_id, event_id, user_id) values (ph_g, ev_a, u_l);
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.4 liking the same photo twice (one like per person per photo)',
    'e', 'error: duplicate key', 'g', msg, 'p', msg like '%duplicate key%'));

  msg := 'no error';
  begin insert into public.photo_likes (photo_id, event_id, user_id) values (ph_plain, ev_a, u_l);
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.4 liking a photo that is not in a challenge',
    'e', 'error: row-level security policy', 'g', msg, 'p', msg like '%row-level security%'));

  msg := 'no error';
  begin insert into public.photo_likes (photo_id, event_id, user_id) values (ph_o, ev_b, u_l);
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.4 liking a photo of an event I am not in',
    'e', 'error: row-level security policy', 'g', msg, 'p', msg like '%row-level security%'));

  msg := 'no error';
  begin insert into public.photo_likes (photo_id, event_id, user_id) values (ph_o, ev_a, u_l);
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.4 liking a photo of event B with event_id of A (mismatch)',
    'e', 'error: row-level security policy', 'g', msg, 'p', msg like '%row-level security%'));

  msg := 'no error';
  begin insert into public.photo_likes (photo_id, event_id, user_id) values (ph_g, ev_a, u_g);
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.4 liking on behalf of another user (user_id <> auth.uid())',
    'e', 'error: row-level security policy', 'g', msg, 'p', msg like '%row-level security%'));

  -- ---------- select ----------
  select count(*) into n from public.photo_likes where event_id = ev_a;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.4 participant reads the likes of own event', 'e', '2 rows', 'g', n || ' rows', 'p', n = 2));

  -- ---------- update (the "-" cell) ----------
  msg := 'no error';
  begin update public.photo_likes set user_id = u_g where photo_id = ph_g;
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.4 updating a like is not allowed', 'e', 'error: permission denied',
    'g', msg, 'p', msg like 'permission denied%'));

  -- =============== G (uploader of ph_g) ===============
  perform set_config('request.jwt.claims', json_build_object('sub', u_g, 'role', 'authenticated')::text, true);

  msg := 'no error';
  begin insert into public.photo_likes (photo_id, event_id, user_id) values (ph_g, ev_a, u_g);
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.4 liking my own photo', 'e', 'error: row-level security policy',
    'g', msg, 'p', msg like '%row-level security%'));

  delete from public.photo_likes where photo_id = ph_g and user_id = u_l;   -- L's like
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.4 deleting another person''s like (also as the photo''s uploader)',
    'e', '0 rows affected', 'g', n || ' rows', 'p', n = 0));

  -- =============== H (host of A) ===============
  perform set_config('request.jwt.claims', json_build_object('sub', u_h, 'role', 'authenticated')::text, true);

  select count(*) into n from public.photo_likes where event_id = ev_a;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.4 host reads the likes of own event', 'e', '2 rows', 'g', n || ' rows', 'p', n = 2));

  delete from public.photo_likes where photo_id = ph_g and user_id = u_l;
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.4 host deletes a guest''s like', 'e', '0 rows affected', 'g', n || ' rows', 'p', n = 0));

  -- =============== O (host of B) and X (outsider) ===============
  perform set_config('request.jwt.claims', json_build_object('sub', u_o, 'role', 'authenticated')::text, true);
  select count(*) into n from public.photo_likes where event_id = ev_a;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.4 host of another event cannot read the likes of A', 'e', '0 rows', 'g', n || ' rows', 'p', n = 0));

  perform set_config('request.jwt.claims', json_build_object('sub', u_x, 'role', 'authenticated')::text, true);
  select count(*) into n from public.photo_likes;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.4 outsider cannot read any likes', 'e', '0 rows', 'g', n || ' rows', 'p', n = 0));

  msg := 'no error';
  begin insert into public.photo_likes (photo_id, event_id, user_id) values (ph_g, ev_a, u_x);
  exception when others then msg := sqlerrm; end;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.4 outsider likes a photo of A', 'e', 'error: row-level security policy',
    'g', msg, 'p', msg like '%row-level security%'));

  -- =============== L : delete own like ===============
  perform set_config('request.jwt.claims', json_build_object('sub', u_l, 'role', 'authenticated')::text, true);
  delete from public.photo_likes where photo_id = ph_g and user_id = u_l;
  get diagnostics n = row_count;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.4 participant removes own like (unlike)', 'e', '1 row affected', 'g', n || ' rows', 'p', n = 1));

  -- like again, then the photo is deleted: its likes go with it (cascade)
  insert into public.photo_likes (photo_id, event_id, user_id) values (ph_g, ev_a, u_l);
  execute 'reset role';
  delete from public.photos where id = ph_g;
  select count(*) into n from public.photo_likes where photo_id = ph_g;
  res := res || jsonb_build_array(jsonb_build_object(
    'c', '5.4 deleting a photo deletes its likes', 'e', '0 rows', 'g', n || ' rows', 'p', n = 0));

  -- ---------- cleanup (superuser) ----------
  delete from public.events where id in (ev_a, ev_b);   -- cascades participants, challenges, photos, likes
  delete from auth.users where id in (u_h, u_g, u_l, u_o, u_x);

  insert into rls_results (check_name, expected, got, pass)
  select e ->> 'c', e ->> 'e', e ->> 'g', (e ->> 'p')::boolean
  from jsonb_array_elements(res) as e;
end;
$$;

-- Expected: every row has pass = true. If the script stops with an error instead,
-- read the message: it points at the statement that failed unexpectedly.
select n, pass, check_name, expected, got from rls_results order by n;
