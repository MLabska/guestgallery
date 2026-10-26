# GuestGallery – Design Document

> **How** the app described in [SPEC.md](SPEC.md) will be built: architecture, data model, API, screens and project structure. Feature numbers (e.g. *1.1*) refer to SPEC.md. No implementation code yet – this document is reviewed and approved first.

## 1. Architecture overview

```
┌──────────────────────────┐          ┌─────────────────────────────────────┐
│  Expo app (iPhone,       │  HTTPS   │  Supabase                           │
│  Expo Go)                │ ───────► │  ├─ Auth      (anonymous sign-in)   │
│                          │          │  ├─ Postgres  (tables + RLS + RPC)  │
│  Expo Router screens     │          │  ├─ Storage   (bucket event-photos) │
│  └─ api/  (supabase-js)  │ ◄─────── │  └─ Realtime  (photo INSERT/DELETE) │
└──────────────────────────┘ websocket└─────────────────────────────────────┘
```

- **No custom server.** The app talks directly to Supabase through `supabase-js`. All permission rules live in the database as **Row Level Security (RLS)** policies, so they hold even if someone calls the API directly (SPEC 6.1).
- **Identity:** on first launch the app calls anonymous sign-in. The session is persisted on the device (AsyncStorage), so the same `auth.uid()` is used every time the app opens. That `uid` is what makes someone a host or a participant.

## 2. Data model

All tables live in the `public` schema. `uuid` primary keys default to `gen_random_uuid()`, timestamps default to `now()`.

### `events`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `code` | text, unique, not null | 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `O/0/I/1`). Generated in the database. |
| `name` | text, not null | 1–60 chars (check constraint) |
| `event_date` | date, not null | |
| `host_id` | uuid, not null → `auth.users.id` | Device that created the event |
| `uploads_close_at` | timestamptz, not null | Set by `create_event` to the end of `event_date + 7 days` (SPEC 3.4). A column instead of a hard-coded rule, so a configurable window can be added later without changing policies. |
| `created_at` | timestamptz | |

### `participants`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `event_id` | uuid → `events.id` (on delete cascade) | |
| `user_id` | uuid → `auth.users.id` | |
| `nickname` | text, not null | 1–30 chars |
| `joined_at` | timestamptz | |
| | **unique (`event_id`, `user_id`)** | One row per device per event (SPEC 2.3) |
| | **unique (`event_id`, `lower(nickname)`)** | Nicknames unique per event, case-insensitive (SPEC 2.3) |

The host gets a participant row too (nickname asked on event creation, default "Host").

### `challenges`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `event_id` | uuid → `events.id` (on delete cascade) | |
| `title` | text, not null | max 60 chars |
| `description` | text, null | max 200 chars |
| `position` | int | Display order |
| `created_at` | timestamptz | |

### `photos`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Generated **on the client** so the file path is known before the row is inserted |
| `event_id` | uuid → `events.id` (on delete cascade) | |
| `uploader_id` | uuid → `auth.users.id` | |
| `challenge_id` | uuid → `challenges.id` (**on delete set null**), null | SPEC 5.1: deleting a challenge keeps its photos |
| `path` | text, not null | Full image in Storage |
| `thumb_path` | text, not null | Thumbnail in Storage |
| `width`, `height` | int | For correct aspect ratio in the viewer |
| `created_at` | timestamptz | Index on (`event_id`, `created_at desc`) |

The uploader's nickname is read by joining `participants` on (`event_id`, `uploader_id`) – a view `photos_with_author` exposes it so the app makes one query.

### Relationships

```
events 1 ─── * participants
events 1 ─── * challenges
events 1 ─── * photos * ─── 0..1 challenges
```

## 3. Storage

- Bucket **`event-photos`**, **private** (photos of a private event must not be reachable by guessing a URL).
- Paths: `{event_id}/{photo_id}.jpg` and `{event_id}/{photo_id}_thumb.jpg`.
- The app shows images through **signed URLs** (valid e.g. 1 hour), requested in batches for the visible gallery page.
- Image pipeline before upload (`expo-image-manipulator`):
  - full image: long edge **1600 px**, JPEG quality **0.7** (≈ 300–500 KB)
  - thumbnail: long edge **400 px**, JPEG quality **0.6** (≈ 30–50 KB)
  - Two files are uploaded because Supabase's on-the-fly image resizing is not available on the free tier.

## 4. Security (RLS)

Helper SQL functions (security definer): `is_participant(event_id)`, `is_host(event_id)` (both checking `auth.uid()`) and `uploads_open(event_id)` (`now() < uploads_close_at`).

| Table / object | Select | Insert | Update | Delete |
|---|---|---|---|---|
| `events` | participant | any signed-in user, `host_id = auth.uid()` | host | – (not in v1) |
| `participants` | participant of the same event | **only via `join_event` RPC** | own row (nickname) | – |
| `challenges` | participant | host | host | host |
| `photos` | participant | participant, `uploader_id = auth.uid()`, challenge (if set) belongs to the same event, **`uploads_open`** | – | own photo **or** host |
| Storage `event-photos/{event_id}/…` | participant of `event_id` | participant of `event_id`, **`uploads_open`** | – | uploader of the photo or host |

Why an RPC for joining: before joining, a guest is not a participant and therefore cannot read the `events` row – so looking up an event by code is done by a security-definer function that reveals only that one event.

## 5. API

All calls go through `supabase-js`. Grouped by feature:

| Feature | Operation |
|---|---|
| App start | `auth.signInAnonymously()` if there is no stored session |
| 1.1 Create event | RPC **`create_event(name, event_date, host_nickname)`** → generates a unique code, inserts the event and the host's participant row in one transaction, returns `{ id, code }` |
| 1.4 My events | select `participants` where `user_id = me`, joined with `events`, order by `joined_at desc` |
| 2.1 / 2.2 Join | RPC **`join_event(code, nickname)`** → normalises the code (upper-case, strip spaces), returns the event or an error `EVENT_NOT_FOUND` / `NICKNAME_TAKEN`; upserts the participant row (no duplicates). Re-joining from the same device with the same nickname is not "taken". |
| 3.4 Upload window | the app reads `uploads_close_at` with the event and hides upload buttons + shows the banner when it has passed; the server rejects late uploads via RLS |
| 3.1 / 3.2 Upload | 1) compress → 2) upload full + thumb to Storage → 3) insert into `photos`. If step 3 fails, delete the uploaded files. |
| 3.3 / 6.1 Delete photo | delete the `photos` row, then remove both files from Storage (RLS decides who may) |
| 4.1 Gallery | select from `photos_with_author` where `event_id`, order `created_at desc`, paged by 30 (infinite scroll) |
| 4.1 Live updates | Realtime channel `event:{id}` – `postgres_changes` on `photos` filtered by `event_id`, events **INSERT** (prepend) and **DELETE** (remove) |
| 5.1 Challenges | select / insert / update / delete on `challenges` |
| 5.3 Challenge list | select `challenges` with photo count; separate query for "challenges I submitted to" |
| 5.3 Challenge gallery | same as 4.1 with an extra `challenge_id` filter |

### QR code content

`guestgallery://join/{CODE}` (e.g. `guestgallery://join/K7P4QX`). The in-app scanner accepts only strings matching this pattern and extracts the code. A custom scheme is used because the app runs in Expo Go, where real deep links into the app are not available; opening the link from the native Camera app is therefore not supported in v1 (SPEC §6).

## 6. Screens and navigation

Expo Router (file-based). Event screens use a tab bar.

```
Home (My events)  ──►  Create event ──► Add challenges ──► QR screen ──► Event
       │
       └─────────►  Scan QR ──► Nickname ──► Event
                       └─► Enter code ─┘

Event (tabs)
 ├─ Gallery ──► Photo viewer
 │     └─ [+] ──► Camera / Library ──► Upload preview (pick challenge)
 ├─ Challenges ──► Challenge gallery ──► Camera (challenge pre-selected)
 └─ Event info (QR, share, manage challenges – host only)
```

| Screen | Route | SPEC |
|---|---|---|
| Home – my events | `app/index.tsx` | 1.4 |
| Create event | `app/create.tsx` | 1.1, 5.1 |
| Scan QR | `app/join/scan.tsx` | 2.1 |
| Enter code | `app/join/code.tsx` | 2.2 |
| Nickname | `app/join/nickname.tsx` | 2.3 |
| Gallery (tab) | `app/event/[id]/(tabs)/index.tsx` | 4.1 |
| Challenges (tab) | `app/event/[id]/(tabs)/challenges.tsx` | 5.3 |
| Event info (tab) | `app/event/[id]/(tabs)/info.tsx` | 1.2, 1.3, 5.1 |
| Challenge gallery | `app/event/[id]/challenge/[challengeId].tsx` | 5.3 |
| Camera | `app/event/[id]/camera.tsx` | 3.1 |
| Upload preview | `app/event/[id]/upload.tsx` | 3.1, 3.2, 5.2 |
| Photo viewer | `app/event/[id]/photo/[photoId].tsx` | 4.2, 4.3, 3.3, 6.1 |

## 7. Project structure

```
/
├─ app/                     Expo Router screens (see table above)
├─ src/
│  ├─ lib/
│  │  └─ supabase.ts        client + session persistence (AsyncStorage)
│  ├─ api/                  one file per area, thin wrappers over supabase-js
│  │  ├─ events.ts
│  │  ├─ challenges.ts
│  │  └─ photos.ts          compress → upload → insert, delete, signed URLs
│  ├─ hooks/
│  │  ├─ useSession.ts      anonymous sign-in on start
│  │  ├─ useEventPhotos.ts  paged query + realtime subscription
│  │  └─ useIsHost.ts
│  ├─ components/           PhotoGrid, PhotoTile, ChallengeCard, EmptyState, UploadProgress…
│  ├─ constants/
│  │  └─ challengeSuggestions.ts
│  └─ types/
│     └─ database.ts        generated by `supabase gen types typescript`
├─ supabase/
│  └─ migrations/           SQL: tables, RLS policies, RPC functions, storage policies
├─ SPEC.md
├─ DESIGN.md
└─ project.md
```

State management: no extra library – React state + hooks; the Supabase query/realtime layer is wrapped in hooks. (TanStack Query can be added later if caching becomes painful.)

## 8. Libraries

| Purpose | Library | Expo Go |
|---|---|---|
| Navigation | `expo-router` | ✓ |
| Backend client | `@supabase/supabase-js`, `@react-native-async-storage/async-storage` | ✓ |
| Camera + QR scanning | `expo-camera` (`CameraView` with barcode scanning) | ✓ |
| Pick photos | `expo-image-picker` | ✓ |
| Save photos | `expo-media-library` | ✓ (iOS) |
| Compression / thumbnails | `expo-image-manipulator` | ✓ |
| Fast image display + caching | `expo-image` | ✓ |
| QR generation | `react-native-qrcode-svg` + `react-native-svg` | ✓ |
| Haptics | `expo-haptics` | ✓ |
| Share sheet | React Native `Share` API (shares text; `expo-sharing` is for files) | ✓ |
| Client-side UUIDs | `expo-crypto` (`randomUUID`) | ✓ |

## 9. Error handling and edge cases

- **Permissions denied** (camera / photo library): explain why, offer *Open Settings*; for QR, offer manual code entry.
- **No connection:** uploads show an error with *Retry*; the gallery shows the last loaded photos and a banner.
- **Realtime disconnect** (app in background): on returning to the foreground, refetch the first page of the gallery.
- **Photo deleted while open in viewer:** close the viewer with a short message.
- **Upload rejected because the window closed** (screen was open across the deadline): show "Uploads for this event are closed" and switch the gallery to read-only.
- **Nickname taken:** stay on the nickname screen with the error under the input.
- **Expired signed URLs:** refresh them when the gallery refetches or when an image fails to load.

## 10. Implementation order

Built feature by feature (each step ends with its SPEC acceptance criteria passing):

1. Project setup – Expo + Router + Supabase client + anonymous sign-in
2. Database migration – tables, RLS, `create_event`, `join_event`, storage bucket + policies
3. Create event + QR + share + My events (1.1–1.4)
4. Join by QR / code + nickname (2.1–2.3)
5. Upload from camera and library + upload window (3.1, 3.2, 3.4)
6. Live gallery + viewer + save (4.1–4.3)
7. Challenges (5.1–5.3)
8. Delete own photo + host moderation (3.3, 6.1)
9. Polish – empty states, haptics, error states
