# GuestGallery

A shared event photo gallery that turns photography into a game. The host creates an event and shows a QR code. Guests scan it, pick a nickname (no account, no password) and their photos land in one live gallery. The host can add photo challenges; guests submit photos to them and like the best ones.

School project for a mobile app development course. React Native + Expo + TypeScript, runs on an iPhone through **Expo Go**, backend on **Supabase**.

| Document | What it contains |
|---|---|
| [project.md](project.md) | Background: the problem, users, MVP and what is deliberately left out |
| [SPEC.md](SPEC.md) | Requirements: user stories with acceptance criteria (feature numbers like *4.4* come from here) |
| [DESIGN.md](DESIGN.md) | Technical design: architecture, data model, security rules, API, screens, implementation steps, test strategy, risks |
| [CLAUDE.md](CLAUDE.md) | Rules for the AI agents that build the project |

## Features

- **Events** – create an event (name + date from a calendar), show its QR code, share the event code, list of my events (host / guest).
- **Joining** – scan the invite QR in the app or with the iPhone Camera, or type the 6-character code; choose a nickname that is unique within the event.
- **Photos** – take a photo or pick up to 10 from the library; photos are compressed before upload. Uploads are open until 7 days after the event date.
- **Gallery** – live grid (new photos appear within seconds), full-screen viewer with author and time, save to phone, filter by person and/or day.
- **Challenges** – the host adds challenges (with suggestions); guests submit photos to them, like each other's challenge photos, and the most liked one is shown as *Top photo*.
- **Host tools** – see who joined, delete any photo in the event. Guests can delete their own photos.

## Tech stack

| Part | Technology |
|---|---|
| App | React Native, Expo SDK 58, Expo Router, TypeScript |
| Runs on | iPhone in **Expo Go** (no custom native code, no development build) |
| Backend | Supabase: anonymous auth, Postgres with Row Level Security, Storage (private bucket), Realtime |
| Server logic | None – all permission rules are RLS policies and two RPC functions (`create_event`, `join_event`) in [supabase/migrations](supabase/migrations) |
| Tests | Jest (`jest-expo`), Testing Library, PGlite (in-memory Postgres for the database tests) |
| CI / delivery | GitHub Actions, EAS Update |

## Running the app

Requirements: Node.js 20+ (24 is used in CI), an iPhone with **Expo Go**, a Supabase project.

1. Install dependencies:
   ```bash
   npm ci
   ```
2. Create `.env` from [.env.example](.env.example) and fill in the Supabase project URL and anon key (Supabase dashboard → Project Settings → API). `.env` is git-ignored.
3. Database: the SQL in [supabase/migrations](supabase/migrations) is applied by CI on every push to `main` (see [CI](#ci-and-database-deployment)). For a brand-new Supabase project without CI, paste the migration files into the SQL editor in file-name order.
4. Start the dev server and scan the QR code in the terminal with the iPhone camera:
   ```bash
   npx expo start            # same Wi-Fi as the phone
   npx expo start --tunnel   # any network
   ```

### Without the PC (published version)

The app is published with **EAS Update**, so it runs from Expo's servers without the PC:

```bash
npm run publish:update
```

The EAS channel `main` always serves the newest published update. Open this link once on the iPhone (for example as a QR code scanned with the Camera app); Expo Go keeps it under *Recently opened*:

```
exp://u.expo.dev/bc077257-5f63-461f-9398-5304a66e0263?channel-name=main&runtime-version=exposdk:58.0.0
```

> **Who can open it:** since May 2026, Expo Go loads published updates only for the project owner and members of the Expo organization that owns the project. Other testers need to be invited to that organization. When loading from a PC (`npx expo start`), iPhones must be signed in to Expo Go with the same account as the PC. See DESIGN.md §11 (Publishing) and §13 (risks).

## Tests and checks

All checks run offline – they need no phone, no Supabase connection and no Docker:

| Command | What it checks |
|---|---|
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run lint` | ESLint (`expo lint`) |
| `npm test` | Jest unit tests for the pure logic in `src/lib`, the API wrappers (Supabase mocked) and hooks |
| `npm run test:db` | Database tests: starts an in-memory Postgres (**PGlite**), loads a small stand-in for Supabase's auth/storage ([supabase/tests/supabase_shim.sql](supabase/tests/supabase_shim.sql)), applies all migrations and runs every `supabase/tests/rls_checks*.sql` file. Each check signs in as a fake user and tries something that must be allowed or blocked (e.g. *a guest deleting someone else's photo → 0 rows*). Fails if any check fails. |

The RLS check files can also be pasted into the Supabase SQL editor to run them against the real project; they clean up after themselves.

Things that need a real phone (camera, QR scanning, haptics, saving photos, realtime between two phones) are listed as manual checks in DESIGN.md §12.

## CI and database deployment

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every push and pull request:

1. **Checks** – typecheck, lint, unit tests, database tests.
2. **Apply database migrations** – on a push to `main`, and only if the checks passed: `supabase db push` applies the migrations the hosted project does not have yet.

The database connection string is stored only as the GitHub secret `SUPABASE_DB_URL` (Session pooler URL). Neither the code nor the AI agents have access to the hosted database. One-time setup is described in DESIGN.md §11.

## How it was built: design document + AI agents

The project follows a *spec → design → implement* workflow:

1. [SPEC.md](SPEC.md) and [DESIGN.md](DESIGN.md) are written and reviewed first.
2. Each implementation step in DESIGN.md §10 is built with the [`/implement`](.claude/skills/implement/SKILL.md) pipeline in Claude Code:
   - an **implementer** agent ([.claude/agents/implementer.md](.claude/agents/implementer.md)) writes the code and tests for exactly one step,
   - a fresh **verifier** agent ([.claude/agents/verifier.md](.claude/agents/verifier.md)) reviews the diff against the design – including every RLS rule cell by cell – and runs all checks itself,
   - failures go back to the implementer; design problems stop the pipeline and go to the human.
3. The human does the manual iPhone checks, commits and pushes; CI then deploys database changes.

The agents run every check, including the database tests, but never connect to the hosted Supabase project.

## Project structure

```
app/                     Expo Router screens (home, create, join/*, event/[id]/*)
src/
  api/                   thin wrappers over supabase-js (events, photos, challenges, likes)
  components/            shared UI (PhotoGrid, DateField, GalleryFilterBar, GuestList, …)
  hooks/                 session, gallery with realtime + filter, likes, host check
  lib/                   pure, unit-tested logic (codes, QR links, validation, dates, filter, likes…)
  theme.ts               colours, spacing, typography
supabase/
  migrations/            SQL: tables, RLS policies, RPCs, storage policies
  tests/                 RLS checks, Supabase shim and the test:db runner
__tests__/               Jest tests
.github/workflows/       CI
.claude/                 agent definitions and the /implement skill
```

## Known limitations

- **Expo Go only** – no App Store / TestFlight build (no paid Apple developer account). Other people need to be invited to the Expo organization to open the published app.
- **Anonymous identity** – reinstalling the app loses host rights and the list of events (accepted for v1).
- **Likes** are not realtime – the challenge screen refreshes them every 15 seconds and on pull-to-refresh.
- **Supabase free tier** – 1 GB storage; the project pauses after a week without activity.

Full list with mitigations: DESIGN.md §13.
