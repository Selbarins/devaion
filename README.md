# Devaion · Aion 2 Tracker

Personal daily/weekly mission, goals, Odyle energy, tickets and events tracker for Aion 2.

**Live:** [dev-aion.vercel.app](https://dev-aion.vercel.app/) (or your Vercel deployment)

**Stack**
- Vite + vanilla JS (fast, no framework lock-in)
- Supabase (cloud sync, Discord login, free tier)
- Local cache + offline buffer; **cloud is source of truth when logged in**

## Quick Start

### 1. Local development
```bash
npm install
npm run dev
```

### 2. Supabase (recommended)
1. Create a free project at [supabase.com](https://supabase.com)
2. SQL Editor → run migrations in order:
   - `supabase/migrations/001_init.sql`
   - `supabase/migrations/002_user_id.sql` (adds per-user `user_id`)
3. Enable Discord auth in Supabase (Authentication → Providers)
4. Project Settings → API → copy **Project URL** and **anon public** key
5. Create a `.env` file (see `.env.example`):
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
6. In `src/auth.js`, set `ALLOWED_DISCORD_ID` to your Discord user id (gate keeps the app personal)

### 3. Deploy on Vercel
1. Import this repository on [vercel.com](https://vercel.com)
2. Framework Preset: **Vite**
3. Add the two environment variables above
4. Deploy

## Features
- Multi-character roster with colors & gear score
- **Unified missions** (one list — no base vs custom split)
  - Daily / weekly, scope: shared / per-character / main-only
  - Full edit for every mission (icon, title, frequency, scope, count, note)
  - Optional **ticket consumption** on complete (Nightmare, Ascension, Shugo, Dimensional)
- Goals (daily / weekly / long-term) with steps, categories
- Link a mission to a goal (`+ Mission` on a goal card)
- Goals list defaults to **All Characters**
- Live Odyle energy tracker (global 3h UTC ticks, membership support)
- Ticket counters (per-character + shared) with daily/weekly auto grants
- Event timers with pin / hide / notifications
- Sticky notes
- Overview hub (energy, tickets, unfinished dailies, roster)
- Local backup export/import
- Cloud sync via Supabase (per Discord user)

## Goals ↔ Missions

| Concept | Behaviour |
|--------|-----------|
| **Goals** | Ambitions (daily / weekly / long-term). Shown for **all characters** by default; optional filter. |
| **Missions** | Single unified checklist (repeatable items, scoped shared / per-char / main-only). |
| **+ Mission** on a goal | Creates a mission titled `Work on: <goal>` and links it via `goalId`. |
| **Ticket on a mission** | When the mission reaches its max, the linked ticket amount is deducted automatically. |

Progress on goals uses the **assigned** character (or the active character when the goal is “All Characters”).

## Cloud data model

When logged in, one row per user (`user_id`) stores:

- `roster`, `st`, `goals`, `notes`, `missions`
- `kv`: mission/goal progress (`d2|…`, `g|…`), tickets, Odyle, membership, corridors, reset markers

localStorage is a cache. On login, cloud is preferred; empty cloud can be seeded from local once.

## Project Structure
```
src/
  main.js             → entry, auth boot, global click/input handlers, tick loop
  storage.js          → localStorage helpers + Supabase load/save (full state + kv)
  state.js            → roster, st, goals, notes, unified missions, persist()
  data.js             → static seed (default roster, mission seed, events)
  helpers.js          → esc, fmt, daily/weekly reset keys
  goals.js            → goals helpers
  missions.js         → mission list, progress keys, cards
  tickets.js          → ticket counters + daily/weekly auto ticks
  odyle.js            → Odyle regen
  auth.js             → Discord login + allowlist
  notifications.js    → event notifications
  ui/missionsView.js  → Missions + Goals tab UI
  ui/goalsView.js     → goals rendering
  ui/hubView.js       → overview hub
  ui/eventsView.js    → events tab
  styles.css
public/
  favicon.svg
supabase/
  migrations/         → 001_init.sql, 002_user_id.sql
```

## Changelog (recent)

### Unified missions + cloud-first
- **Missions:** single list (migrates old base + custom once); full edit UI; optional ticket consumption on complete
- **Cloud:** per-user row (`user_id`); payload includes missions + full `kv` (progress, tickets, Odyle, corridors)
- **Hub:** ticket / corridor / membership changes persist to cloud
- **UI:** compact mission form; Discord-style emoji picker; favicon

### Earlier (v5.4)
- **Fix:** Creating a goal works reliably; filter resets to All Characters
- **Fix:** Goals no longer disappear when another character is selected
- **New:** “All Characters” filter on Goals (default)
- **New:** `+ Mission` on each goal → linked mission
- **Structure:** data / helpers / state / goals / missions / odyle modules

## Notes
- Intended for **personal use** (Discord allowlist in `auth.js`).
- Free-tier Supabase is enough for one user.
- Works offline via local cache; syncs when online after `persist()`.
```