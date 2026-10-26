# GuestGallery – Requirements Specification

## 1. Problem

After a wedding, birthday or company party, the photos are scattered across dozens of guests' phones. The host rarely gets them, and guests have no motivation to share or to take more than the usual few snapshots.

## 2. Users and roles

| Role | Who | What they can do |
|---|---|---|
| **Host** | The device that created the event (couple, organizer, team lead). | Create the event, show/share its QR code, manage challenges, delete any photo in the event. The host is also a participant and can upload photos like a guest. |
| **Guest** | Anyone who joined the event with its QR code or event code. | Upload photos, submit photos to challenges, browse the gallery, save photos to their phone, delete **their own** photos. |

There are **no user accounts**. Each device gets an anonymous identity automatically on first launch. A device can be host of some events and guest in others.

## 3. Features

Each feature is one sentence from the user's point of view, followed by acceptance criteria. The criteria are the test plan: a feature is done when all of its criteria pass on a real iPhone in Expo Go.

### 1. Events

**1.1 Create an event** – As a host, I enter an event name and date and the app creates the event.
- [ ] Name is required (1–60 characters); date is required and defaults to today.
- [ ] After saving, the app generates a unique 6-character event code (uppercase letters and digits, no confusable characters like `O/0`, `I/1`).
- [ ] The host lands on the event's QR screen.

**1.2 Show the QR code** – As a host, I can show a QR code on my screen so guests can scan it.
- [ ] The QR screen shows the QR code, the event name and the event code in large text.
- [ ] The QR screen is reachable at any time from the event (host only).

**1.3 Share the event code** – As a host, I can share the event code via the system share sheet (Messages, WhatsApp, e-mail…).
- [ ] Tapping *Share* opens the system share sheet with a short text containing the event name and code.

**1.4 My events** – As a user, I see a list of events I created or joined, so I can return to them later.
- [ ] The home screen lists my events (newest first), each marked *Host* or *Guest*.
- [ ] Tapping an event opens its gallery without asking for the nickname again.
- [ ] The list survives closing and reopening the app.

### 2. Joining

**2.1 Join by QR code** – As a guest, I scan the event's QR code inside the app and join.
- [ ] The app asks for camera permission the first time; if denied, it explains why and offers manual code entry.
- [ ] Scanning a valid GuestGallery QR code leads directly to the nickname screen.
- [ ] Scanning an unrelated QR code shows "This is not a GuestGallery code" and keeps scanning.

**2.2 Join by event code** – As a guest whose scan does not work, I type the event code and join.
- [ ] Input is case-insensitive and ignores spaces.
- [ ] An unknown code shows "Event not found".

**2.3 Enter a nickname** – As a guest, I only type a nickname to join, no registration.
- [ ] Nickname is required, 1–30 characters, trimmed.
- [ ] Nickname must be unique within the event (case-insensitive). If it is taken, the app shows "This nickname is already taken in this event" and lets the guest pick another.
- [ ] After confirming, the guest lands in the event gallery.
- [ ] Joining the same event again from the same device does not create a duplicate participant.
- [ ] **Metric:** from scanning the QR code to the first uploaded photo takes under 60 seconds.

### 3. Photos

**3.1 Take a photo in the app** – As a guest, I take a photo with the in-app camera and it is uploaded to the event.
- [ ] Front/back camera switch is available.
- [ ] After taking the photo I see a preview with *Upload* / *Retake*, and an optional challenge picker (see 5.2).
- [ ] The photo is compressed before upload (long edge max 1600 px).
- [ ] A successful upload gives haptic feedback and the photo appears in the gallery.

**3.2 Upload from the photo library** – As a guest, I pick one or more existing photos and upload them.
- [ ] I can select up to 10 photos at once.
- [ ] Upload progress is visible ("Uploading 3 / 10").
- [ ] If one upload fails, the others continue and the failed one can be retried.

**3.3 Delete my photo** – As a guest, I can delete a photo I uploaded.
- [ ] The delete action is visible only on my own photos (or on all photos for the host – see 6.1).
- [ ] Deletion asks for confirmation and removes the photo for everyone.

**3.4 Upload window** – As a host, I know guests can keep uploading for a while after the event, but the gallery does not stay open for uploads forever.
- [ ] Uploads (camera, library, challenge submissions) are allowed until **7 days after the event date** (end of that day).
- [ ] After that, the gallery becomes read-only: the upload buttons are hidden and a banner says "Uploads for this event are closed".
- [ ] Browsing, saving photos, joining the event and deleting photos still work after uploads close.
- [ ] Enforced on the server: an upload after the window is rejected even if the app shows the button (e.g. an outdated screen).
- [ ] There is no limit on the number of photos per guest or per event.

### 4. Gallery

**4.1 Live shared gallery** – As a participant, I see all event photos in a grid that updates live.
- [ ] Grid of thumbnails, newest first.
- [ ] A photo uploaded on another phone appears within ~3 seconds without manual refresh.
- [ ] A deleted photo disappears within ~3 seconds.
- [ ] Pull-to-refresh is available as a fallback.
- [ ] Empty state: "No photos yet – be the first!" with a button to take a photo.

**4.2 Full-screen viewer** – As a participant, I tap a photo to see it full screen with the author's nickname.
- [ ] Shows the full-size photo, author nickname, upload time and challenge name (if any).
- [ ] Swipe left/right moves to the neighbouring photo.

**4.3 Save to phone** – As a participant, I save a photo I like to my phone's photo library.
- [ ] The app asks for photo-library permission the first time.
- [ ] After saving, a confirmation is shown.

### 5. Photo challenges

**5.1 Manage challenges** – As a host, I add, edit and delete challenges for my event.
- [ ] Challenge = title (required, max 60 chars) + optional description (max 200 chars).
- [ ] When creating an event, the host can add challenges from a list of suggestions (e.g. *"Selfie with the bride"*, *"Craziest dance move"*, *"Group photo with 5 people"*) or write their own.
- [ ] Deleting a challenge keeps its photos in the main gallery (they just lose the challenge tag).

**5.2 Submit to a challenge** – As a guest, I submit a photo to a challenge.
- [ ] In the upload preview I can optionally choose one challenge.
- [ ] From a challenge's screen, a *Take photo for this challenge* button opens the camera with the challenge pre-selected.

**5.3 Browse challenges** – As a participant, I see the list of challenges and each challenge's submissions.
- [ ] Challenge list shows each challenge's title and number of submissions.
- [ ] Tapping a challenge shows a grid of its photos (live, same as 4.1).
- [ ] Challenges I have already submitted to are marked as done (✓).
- [ ] **Metric:** at least 40 % of uploaded photos are submitted to a challenge.

### 6. Moderation

**6.1 Host deletes any photo** – As a host, I delete any photo in my event.
- [ ] The delete action is shown on every photo for the host only.
- [ ] Enforcement is on the server: a guest cannot delete someone else's photo even by calling the API directly.

## 4. Constraints

- **Platform:** React Native + Expo (TypeScript). Must run on an **iPhone through Expo Go**, developed on Windows – so only libraries that work in Expo Go (no custom native modules, no development build).
- **Backend:** Supabase (PostgreSQL, Storage, Realtime, anonymous auth). Free tier.
- **Language:** UI in **English**.
- **No accounts:** anonymous auth only; identity is tied to the device/app install.
- **Data usage:** photos are compressed before upload; the gallery grid loads thumbnails, not full images.
- **Privacy:** an event's photos are visible only to people who joined it (no public listing, no search of events).
- **Device features used:** camera (photos + QR scanning), photo library (read + save), haptics, system share sheet.

## 5. Out of scope (version 1, intentionally)

Videos · voting and post-event awards · web version for guests without the app · user accounts and login · push notifications · ZIP download / printing / photo books · filters, editing, stickers, face recognition · paid plans, multiple hosts, advanced privacy settings · removing or blocking a guest (the host can still delete their photos) · host-configurable upload window · offline upload queue that survives closing the app.

Reasons are listed in [project.md](project.md#what-wont-be-in-the-mvp-non-goals-and-why).

## 6. Decided questions

| Question | Decision |
|---|---|
| Can the host also upload photos? | Yes, the host is a participant too. |
| Can a guest delete their own photo? | Yes (only their own). |
| Can one photo be in more than one challenge? | No, at most one challenge per photo. |
| Can a guest submit several photos to the same challenge? | Yes, no limit. |
| What does the QR code contain? | A link with the event code (format in DESIGN.md); the in-app scanner reads it. Scanning with the iPhone's native camera app is not required to work. |
| What if the host reinstalls the app or changes phone? | Host rights are lost (anonymous identity). Accepted for v1. |
| Does an event close after its date? | Uploads close **7 days after the event date**; the gallery stays viewable forever (see 3.4). The reserve covers guests who upload the next day or after the weekend. |
| Is there a limit on photos per guest / per event? | No. Compression keeps files small; revisit only if the free Supabase storage (1 GB) runs out. |
| Can two guests use the same nickname in one event? | No – nicknames are unique per event, so the author shown under a photo is never ambiguous. |
| Can the host remove or block a guest? | Not in v1. The host can delete any of the guest's photos (6.1). |

## 7. Open questions

None at the moment.
