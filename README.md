# Devaion · Aion 2 Tracker

Personal daily/weekly mission, goals, Odyle energy and events tracker for Aion 2.

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
2. Go to **SQL Editor** → New query → paste the content of `supabase/migrations/001_init.sql` → Run
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

Every push to `main` will automatically redeploy.

## Features
- Multi-character roster with colors & gear score
- Daily / Weekly missions (shared / per-character / main-only) + custom missions
- Goals (daily / weekly / long-term) with steps, categories, drag & drop
- Live Odyle energy tracker (global 3h UTC ticks, membership support)
- Event timers with pin/hide
- Sticky notes
- Overview dashboard
- Local backup export/import
- Cloud sync via Supabase (optional)

## Project Structure
```
src/
  main.js          → entry point
  storage.js       → localStorage + Supabase sync
  state.js         → global state
  ui/              → rendering & components
  ...
supabase/
  migrations/      → database schema
```

## Notes
- Data is stored under a fixed row `id = 'personal'`.
- No authentication is used (personal project only).
- You can later add auth or multi-device keys if needed.
