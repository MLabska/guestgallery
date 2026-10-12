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
