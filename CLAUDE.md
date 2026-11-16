# GuestGallery – project rules

School project: a shared event photo gallery app. Requirements are in `SPEC.md`, the technical design in `DESIGN.md`, the background in `project.md`.

- **Language:** all code, comments, UI text and docs in English.
- **Platform:** React Native + Expo + TypeScript, run on an iPhone through **Expo Go**, developed on Windows. Only use libraries that work in Expo Go: no custom native modules, no development builds, no `expo prebuild`.
- **Backend:** Supabase (anonymous auth, Postgres + RLS, Storage, Realtime). No custom server. Permission rules belong in RLS, not only in the app.
- **Install packages with `npx expo install <pkg>`** so versions match the Expo SDK.
- **Secrets:** Supabase URL and anon key come from `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`). Never commit `.env`. Keep `.env.example` up to date.
- **Never run commands against the hosted Supabase project** (`supabase db push`, `supabase link`, SQL against the remote database). The user applies migrations themselves.
- **Checks before you finish (from the repo root):** `npm run typecheck`, `npm run lint`, `npm test`. The full list is in DESIGN.md §11.
- Building from the design document: `/implement DESIGN.md <step>`, one step per run (DESIGN.md §10).
