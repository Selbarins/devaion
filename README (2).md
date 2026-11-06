# Devaion

Aion 2 companion web app focused on daily/weekly tracking, events, and crafting.

**Repo:** https://github.com/Selbarins/devaion

Stack: **Vite + vanilla JS + Supabase** (optional cloud sync).  
No heavy frameworks. Desktop-first UI.

---

## Current Features

### Overview (Hub)
- Character roster
- Daily / Weekly mission progress
- Odyle energy battery + live ticks
- Quick event countdowns
- Goals & notes

### Missions
- Daily / Weekly / Character / Shared missions
- Custom missions
- Ticket consumption tracking

### Events
- Scheduled world events with live countdowns
- Siege / corridor logic

### Craft (new)
- **Recipes browser**
  - Full recipe list loaded from community extraction (~528 recipes)
  - Search + profession filters
  - Shows required materials, profession, Novice/Professional rank, combo chance
- **Crafting Log**
  - Add any recipe to a personal log
  - Set quantity
  - Aggregated materials table (Have / Need / Missing)
  - Values persist (local + Supabase when logged in)

---

## Crafting Module – Decisions & Status

### Done
- Craft tab added to sidebar (same visual language as the rest of the app)
- Recipe browser with search & profession filters
- Crafting Log (planned crafts + material aggregation)
- Data loaded from `public/data/recipes.raw.json` (normalized on the fly)
- Fallback to small clean `recipes.json` + `items.json` if raw file is missing
- Account-shared state structure ready (`craftLog`, `craftHave`, etc.)

### Key Decisions

| Topic                    | Decision                                                                 | Reason |
|--------------------------|--------------------------------------------------------------------------|--------|
| Cascading crafts         | Approach **B** – optional expand (v1 shows direct materials only)       | Simpler UX first, expand later |
| Recipe data source       | Static files hosted in repo (`recipes.raw.json`)                        | No public official API; avoid hard-coding |
| Data origin              | `yomoghurt/aion2-market` → derived from `dimkk/aion2-market-stack` (Apache-2.0) | Largest clean open extraction available |
| Profession levels        | **Novice / Professional** (matches in-game style)                       | Stay close to the game UI |
| Linking to other tabs    | **Not linked** for now                                                  | Keep Craft self-contained |
| Cost calculator          | Planned inside Crafting Log                                             | Natural place |
| Substance Morph          | Planned (separate data or merged later)                                 | Not present in current raw dump |
| Icons                    | Planned later                                                           | Name-only is enough for v1 |

### Data Files
```
public/data/
├── recipes.raw.json     ← full compact dump (~528 recipes) – preferred
├── recipes.json         ← small clean fallback
└── items.json           ← item name dictionary (partially maintained)
```

The app prefers `recipes.raw.json` and normalizes it at runtime into the internal shape:

```js
{
  id, name, profession, rank, level,
  category, ingredients: [{itemId, qty}],
  output: {itemId, qty}, comboChance, tags
}
```

---

## Upcoming (Craft roadmap)

### Short term
- [ ] Optional cascade expand (Approach B) – toggle intermediates
- [ ] Profession level tracking (account-shared Novice/Professional levels)
- [ ] Show whether a recipe is currently doable
- [ ] Basic cost calculator inside Crafting Log (manual prices first)
- [ ] Better empty states & loading indicators

### Medium term
- [ ] Substance Morph / Material Conversion recipes
- [ ] Item icons (from community CDNs or local)
- [ ] “Where to get” info for materials
- [ ] Shopping list view (buyable materials)
- [ ] Export / import Crafting Log

### Later
- [ ] Full market price integration (optional)
- [ ] Success rate estimation based on profession level
- [ ] Better mobile layout for Craft tab

---

## Other Pending Work

- Siege schedule was reduced from 3 to 2 per week → still needs verification & code update (postponed while Craft was built)
- General UI polish and consistency passes

---

## Project Structure (relevant parts)

```
src/
├── main.js              ← app shell, tabs, global click/input handlers
├── state.js             ← shared state + persist (localStorage + Supabase)
├── ui/
│   └── craftView.js     ← entire Craft tab (browser + log)
public/
└── data/
    ├── recipes.raw.json ← main recipe source
    ├── recipes.json     ← fallback
    └── items.json       ← names
```

---

## How to continue development

### Adding / updating recipes
1. Replace `public/data/recipes.raw.json` with a newer extraction (same compact format).
2. The frontend normalizer in `src/ui/craftView.js` (`normalizeRaw`) will pick it up automatically.
3. Optionally keep `items.json` updated for cleaner display names.

### Important state keys (Craft)
- `st.craftSub` → `"browser"` | `"log"`
- `st.craftSearch` → search string
- `st.craftProfFilter` → profession filter
- `st.craftLog` → `[{ recipeId, qty }]`
- `st.craftHave` → `{ [itemId]: number }`
- `st.craftExpanded` → reserved for future cascade toggles

All of these go through the existing `persist()` system (localStorage + Supabase sync).

### UI conventions to respect
- Use existing classes: `.panel`, `.panel.glass`, `.ctrl-bar`, `.seg`, `.row`, `.tg`, `.btn-sm`, `.tip`
- Cyan accent, glass cards, same spacing and border-radius
- Keep Craft visually consistent with Missions / Events

### Cascading (future)
When implementing Approach B:
- Add a toggle per intermediate material (or a global “Expand all”).
- Recursively replace craftable ingredients with their own ingredients only when expanded.
- Keep the current flat aggregation as the default.

---

## License / Data attribution

- App code: see repository license.
- Recipe data currently based on community extraction derived from `dimkk/aion2-market-stack` (Apache-2.0) via `yomoghurt/aion2-market`.
- AION 2 is a trademark of NCSOFT. This is an unofficial fan project.

---

## Quick status (as of last update)

| Area              | Status          | Notes |
|-------------------|-----------------|-------|
| Craft tab shell   | ✅ Done         | Matches existing UI |
| Recipe browser    | ✅ Done         | Full raw data loaded |
| Crafting Log      | ✅ Done         | Have / Need / Missing |
| Cascade expand    | ⏳ Planned      | Approach B |
| Profession levels | ⏳ Planned      | Novice / Professional |
| Cost calculator   | ⏳ Planned      | Inside Log |
| Substance Morph   | ⏳ Planned      | Needs separate data |
| Icons             | ⏳ Planned      | Later |
| Siege 3→2 update  | ⏳ Postponed    | Verify then patch |

This README should be enough for anyone (including future you) to understand the project direction and continue work without digging through chat history.
```
