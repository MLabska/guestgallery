-- GuestGallery - step 10: likes on challenge photos (SPEC 5.4, DESIGN.md sections 2 and 4).
-- Apply in the Supabase dashboard after 20261116000000_init_schema.sql.

-- Helper (security definer, like the other RLS helpers): the photo belongs to that event, is part
-- of a challenge and was not uploaded by the caller. Returns false for an unknown photo.
create function public.photo_likeable(pid uuid, eid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.photos p
    where p.id = pid
      and p.event_id = eid
      and p.challenge_id is not null
      and p.uploader_id <> auth.uid()
  );
$$;

revoke all on function public.photo_likeable(uuid, uuid) from public, anon;
grant execute on function public.photo_likeable(uuid, uuid) to authenticated;

create table public.photo_likes (
  photo_id   uuid not null references public.photos (id) on delete cascade,
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

create index photo_likes_event_id_idx on public.photo_likes (event_id);

alter table public.photo_likes enable row level security;

-- Like = insert, unlike = delete. Rows are never updated, so there is no update grant or policy.
revoke all on public.photo_likes from anon;
revoke update on public.photo_likes from authenticated;

create policy photo_likes_select on public.photo_likes
  for select to authenticated
  using (public.is_participant(event_id));
create policy photo_likes_insert on public.photo_likes
  for insert to authenticated
  with check (
    public.is_participant(event_id)
    and user_id = auth.uid()
    and public.photo_likeable(photo_id, event_id)
  );
create policy photo_likes_delete on public.photo_likes
  for delete to authenticated
  using (user_id = auth.uid());
