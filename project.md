# GuestGallery

> A shared event gallery that turns photography into a game: guests join with a QR code, shoot photos for challenges set by the host, and everything lands in one live gallery.

## What problem am I solving

After a wedding or party, the best photos are scattered across dozens of guests' phones and the host rarely ever gets them.

## Who are my users

- **Hosts** – couples planning a wedding, people organizing a birthday, graduation, company party or team event. They want all the photos in one place and want guests to have fun.
- **Guests** – people of all ages and tech skill levels. They want to share photos with as little effort as possible: no registration, no complicated setup.

## How I want to solve it (MVP)

A mobile app where the host creates an event, shows a QR code, and guests scan it to join and start shooting.

Basic flow:

```
Create event → QR code → guests scan → join event → take / upload photo → live shared gallery
```

MVP features:

1. **Create an event** – the host enters a name and date; the app generates an event code and a **QR code** to show on screen or print.
2. **Join an event** – the guest scans the QR code (or types the event code) and enters just a nickname. **No account, no password.**
3. **Take or upload photos** – shoot directly in the app with the camera, or pick existing photos from the photo library.
4. **Live shared gallery** – all event photos in one grid, newest first, updating in real time as guests upload. Tap a photo to see it full screen with the author's nickname.
5. **Photo challenges** – the host adds a few challenges to the event (e.g. *"Selfie with the bride"*, *"Craziest dance move"*, *"Group photo with 5 people"*). A guest can submit a photo to a challenge, and each challenge has its own gallery of submissions.
6. **Basic host moderation** – the host can delete any photo from their event.

Why this isn't "just another shared album": competitors (GUESTPIX, Kululu, GuestCam, Wedibox, POV…) mainly *collect* photos. GuestGallery adds **challenges** that give guests a reason to take more varied and fun photos, turning the gallery into an activity during the event.

## What won't be in the MVP (non-goals) and why

| Not in the MVP | Why |
|---|---|
| **Videos** | Large files, uploads, transcoding and playback add a lot of complexity. Photos prove the concept. |
| **Voting and post-event awards** ("funniest photo", "best group photo") | A natural next step after challenges, but challenges alone already show the gamification idea. |
| **Web version for guests without the app** | Many competitors offer it, but this is a mobile development project – the goal is the mobile app. |
| **User accounts and login** | Guests join with a nickname only; the host is identified by their device. Real accounts add friction and aren't needed for one event. |
| **Push notifications** (e.g. "new challenge added") | Remote push needs extra setup (Apple developer account, push service). The live gallery already shows what's new while the app is open. |
| **Downloading the whole gallery (ZIP), printing, photo books** | Useful after the event, but not part of the core in-event experience. |
| **Filters, editing, stickers, face recognition** | Nice extras; they don't solve the core problem of collecting photos in one place. |
| **Paid plans, multiple hosts, advanced privacy settings** | Business and admin features that aren't needed to validate the idea. |

## Initiative, epics and user stories

### Initiative

**Get the event's photos to the host instead of leaving them on guests' phones.** At least **60 % of guests who join an event upload at least one photo** (today it's close to 0 %, since hosts rarely get photos back).

### Epic 1: Create an event and share its QR code

- *As a host, I want to create an event with a name and date so that I get one place to collect all the photos.*
  - Tasks: Supabase `events` table, create-event screen, generate the event code
- *As a host, I want to show or share a QR code so that guests can join without me explaining anything.*
  - Tasks: QR code screen (`react-native-qrcode-svg`), share the code/link (`expo-sharing`)

### Epic 2: Join without an account

Success metric: a guest goes from scanning the QR code to their first upload in **under 60 seconds**.

- *As a guest, I want to scan a QR code and only type a nickname so that I can join in seconds without registering.*
  - Tasks: QR scanner (`expo-camera`), anonymous auth, nickname screen, `participants` table
- *As a guest without a working camera scan, I want to type the event code so that I can still join.*
  - Tasks: manual code entry, code validation

### Epic 3: Take and upload photos

- *As a guest, I want to take a photo right in the app so that sharing happens the moment I take it.*
  - Tasks: camera screen, image compression (`expo-image-manipulator`), upload to Supabase Storage, `photos` table
- *As a guest, I want to upload photos I already took so that my earlier shots end up in the gallery too.*
  - Tasks: photo picker (`expo-image-picker`), multi-select upload, upload progress indicator, haptic feedback on success (`expo-haptics`)

### Epic 4: Live shared gallery

- *As a guest, I want to see everyone's photos appear live so that I can follow the event as it happens.*
  - Tasks: gallery grid screen, Supabase Realtime subscription, newest-first ordering
- *As a guest, I want to open a photo full screen and save it so that I can keep the ones I like.*
  - Tasks: full-screen viewer with the author's nickname, save to phone (`expo-media-library`)

### Epic 5: Photo challenges

Success metric: at least **40 % of uploaded photos are submitted to a challenge**.

- *As a host, I want to add challenges to my event so that guests have a reason to take varied, fun photos.*
  - Tasks: `challenges` table, add/edit challenge screen
- *As a guest, I want to submit a photo to a challenge so that I can take part in the game.*
  - Tasks: challenge list screen, "submit to challenge" option in the upload flow, `challenge_id` on photos
- *As a guest, I want to browse each challenge's submissions so that I can see what others came up with.*
  - Tasks: per-challenge gallery screen

### Epic 6: Host moderation

- *As a host, I want to delete any photo in my event so that inappropriate or failed shots don't stay in the gallery.*
  - Tasks: delete action visible only to the host, Supabase RLS policy (only the host can delete), remove the file from Storage

## What technologies do I need

**App**
- **React Native + Expo** (TypeScript) – one codebase for iOS and Android; developed on Windows and run on an iPhone through **Expo Go**, no Mac needed.
- **Expo Router** – navigation between screens.

**Backend**
- **Supabase**
  - **Database** (PostgreSQL) – events, challenges, photo records.
  - **Storage** – the photo files themselves.
  - **Realtime** – new photos appear in everyone's gallery instantly.
  - **Anonymous auth** – each device gets an identity without registration (used to know who is the host and who uploaded what).

**Phone features**
- **Camera** – `expo-camera` (taking photos in the app and **scanning QR codes**).
- **Photo library** – `expo-image-picker` (uploading existing photos), `expo-media-library` (saving photos from the gallery to the phone).
- **Image compression** – `expo-image-manipulator` (shrinking photos before upload to save data and storage).
- **QR code generation** – `react-native-qrcode-svg` (showing the event's QR code).
- **Haptics** – `expo-haptics` (feedback after a successful upload or challenge submission).
- **Sharing** – `expo-sharing` (sending the event link/code via Messages, WhatsApp, etc.).

**Development**
- Node.js, Expo CLI, Expo Go on an iPhone for testing.
- Git + GitHub for version control.
