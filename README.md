# Devaion · Aion 2 Tracker

Personal daily/weekly mission, goals, Odyle energy and events tracker for Aion 2.

**Live:** [dev-aion.vercel.app](https://dev-aion.vercel.app/) (or your Vercel deployment)

**Stack**
- Vite + vanilla JS (fast, no framework lock-in)
- Supabase (optional cloud sync – personal use only, no auth)
- Local-first (works offline, syncs when online)

## Quick Start

### 1. Local development
```bash
npm install
npm run dev
```

### 2. Supabase (recommended)
1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → New query → paste `supabase/migrations/001_init.sql` → Run
3. Project Settings → API → copy **Project URL** and **anon public** key
4. Create a `.env` file (see `.env.example`):
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Deploy on Vercel
1. Import this repository on [vercel.com](https://vercel.com)
2. Framework Preset: **Vite**
3. Add the two environment variables above
4. Deploy

## Features
- Multi-character roster with colors & gear score
- Daily / Weekly missions (shared / per-character / main-only) + custom missions
- Goals (daily / weekly / long-term) with steps, categories
- **Link a custom mission to a goal** (`+ Mission` on each goal card)
- Goals list defaults to **All Characters** (no longer hidden by active character)
- Live Odyle energy tracker (global 3h UTC ticks, membership support)
- Event timers with pin/hide
- Sticky notes
- Overview dashboard
- Local backup export/import
- Cloud sync via Supabase (optional)

## Goals ↔ Missions

| Concept | Behaviour |
|--------|-----------|
| **Goals** | Ambitions (daily / weekly / long-term). Shown for **all characters** by default; optional filter. |
| **Missions** | Repeatable checklist items, scoped shared / per-char / main-only. |
| **+ Mission** on a goal | Creates a custom mission titled `Work on: <goal>` and links it via `goalId`. |

Progress on goals uses the **assigned** character (or the active character when the goal is “All Characters”).

## Project Structure
```
src/
  main.js          → UI shell, event wiring, draw* views (v5.4 fixed goals)
  storage.js       → localStorage + Supabase sync
  data.js          → static game data (missions, events, default roster)
  helpers.js       → pure helpers (esc, fmt, resets)
  state.js         → shared state module (foundation for next split)
  goals.js         → goals logic module (foundation)
  missions.js      → mission helpers module (foundation)
  odyle.js         → Odyle regen module (foundation)
  ui/goalsView.js  → goals view module (foundation)
  styles.css
supabase/
  migrations/      → database schema
```

> `main.js` is still the runtime entry and is self-contained. The other `src/*` modules are the target split; wire them in gradually without breaking the app.

## Changelog (v5.4)
- **Fix:** Creating a goal now works reliably; new goals always appear (filter resets to All Characters).
- **Fix:** Goals no longer disappear when another character is selected in the sidebar.
- **New:** “All Characters” filter on the Goals tab (default).
- **New:** `+ Mission` on each goal → creates a linked custom mission.
- **Structure:** Extracted data / helpers / state / goals / missions / odyle modules as foundation.

## Notes
- Data is stored under a fixed row `id = 'personal'`.
- No authentication is used (personal project only).
