/** Static game data for Aion 2 */

export const CHAR_COLORS = [
  "#22d3ee", "#c084fc", "#34d399", "#fbbf24",
  "#ff3b5c", "#60a5fa", "#f472b6", "#a3e635"
];

export const DEFAULT_ROSTER = [
  { id: "c1", name: "Main", role: "main", class: "Cleric", color: CHAR_COLORS[0], gs: 0 },
  { id: "c2", name: "Alt 1", role: "alt", class: "Sorcerer", color: CHAR_COLORS[1], gs: 0 },
  { id: "c3", name: "Alt 2", role: "alt", class: "Gladiator", color: CHAR_COLORS[2], gs: 0 },
  { id: "c4", name: "Alt 3", role: "alt", class: "Ranger", color: CHAR_COLORS[3], gs: 0 }
];

/** Seed for editable base missions. Never mutate this array directly. */
export const D_BASE_SEED = [
  { id: "duty", p: "d", n: "Duty Quests", ic: "📜", f: "Daily", s: "shared", c: 5, t: "Server-wide pool. Do once on main after login." },
  { id: "emer", p: "d", n: "Emergency Supply Requests", ic: "🚨", f: "Daily", s: "shared", c: 1, t: "Only turn in if the mats are cheap." },
  { id: "att", p: "d", n: "Attendance / Daeva Pass / Codes", ic: "📅", f: "Daily", s: "shared", c: 1, t: "Claim attendance, advance pass tracks, redeem codes." },
  { id: "odyle", p: "d", n: "Spend Odyle Energy", ic: "💠", f: "Daily", s: "char", c: 3, t: "15 every 3h (120/day). Cap 560 / 840 membership. Never sit at cap." },
  { id: "shugo", p: "d", n: "Shugo Festival Keys", ic: "🎁", f: "Daily", s: "shared", c: 3, t: "3 keys/day · cap 12 (21 with membership). Shared." },
  { id: "nm", p: "d", n: "Nightmare Tickets", ic: "🌑", f: "Daily", s: "char", c: 2, t: "+2/day · cap 14. Tracked per character." },
  { id: "dim", p: "d", n: "Dimensional Invasion Key", ic: "🕳", f: "Daily", s: "shared", c: 1, t: "1 key/day · cap 7. Shared across characters." },
  { id: "ascw", p: "w", n: "Ascension Trial", ic: "🗼", f: "Weekly", s: "char", c: 3, t: "Solo. Save for later in the week to push higher difficulty." },
  { id: "dd", p: "w", n: "Daily Dungeon (Weekly)", ic: "⏱", f: "Weekly", s: "main", c: 14, t: "Main / server shared. Can clear all 14 in one sitting." },
  { id: "bf", p: "w", n: "Battlefield Victories", ic: "⚔", f: "Weekly", s: "char", c: 3, t: "Do the 3 wins whenever convenient." },
  { id: "morph", p: "w", n: "Substance Morph (Odyle)", ic: "⚗", f: "Weekly", s: "char", c: 4, t: "25 Odyle + 5 Fine + 1 Pure + 50k Kina → +40 Energy. 4 per character." },
  { id: "sub", p: "w", n: "Shop Odyle Stones", ic: "🛒", f: "Weekly", s: "char", c: 4, t: "Wind Breeze Merchant. 4 per character (+ 16 server-wide)." },
  { id: "soul", p: "w", n: "Soul Crystals (Genus)", ic: "🔮", f: "Weekly", s: "main", c: 1, t: "Wind Breeze Merchant · regular weekly limit (membership)." },
  { id: "pve", p: "w", n: "PvE Weekly Quest Scrolls", ic: "🗺", f: "Weekly", s: "shared", c: 12, t: "Command Merchant. Buy before reset if you need them later." },
  { id: "pvp", p: "w", n: "PvP Weekly Quest Scrolls", ic: "🛡", f: "Weekly", s: "shared", c: 20, t: "Abyss merchant. Shared limit." },
  { id: "corr", p: "w", n: "Abyss Corridors", ic: "🌀", f: "After Siege", s: "char", c: 3, t: "Count depends on artifacts your faction won (max 3). Set won corridors on Overview." }
];

export const REG = [
  ["Odyle Energy", "15 / 3h (120/day)", "560 / 840 Membership", "Per Character"],
  ["Shugo Festival Keys", "3 / Day", "12 / 21 Membership", "Shared"],
  ["Nightmare Tickets", "2 / Day", "14", "Per Character"],
  ["Dimensional Invasion", "1 / Day", "7", "Shared"]
];

export const EV = [
  ["Spacetime Rift", "🌀", 60, null, [0, 3, 6, 9, 12, 15, 18, 21], 0, "Portal open first 10 min. Cross-faction PvP + sealed dungeons."],
  ["Shugo Festival", "🎪", 10, null, Array.from({ length: 24 }, (_, i) => i), 0, "Hourly minigame. Spend keys on good placements."],
  ["Dimensional Invasion", "🕳", 15, null, Array.from({ length: 24 }, (_, i) => i), 30, "Open-world invasion every hour at :30."],
  ["Watcher Kaira", "👁", 30, null, [2, 5, 8, 11, 14, 17, 20, 23], 0, "Abyss boss, random spot, leaves after 30 min."],
  ["Artifact Siege", "🏰", 30, [1, 4, 6], [20], 0, "Mon/Thu/Sat 21:00 server (20:00 UTC). Win artifacts → Corridors."],
  ["Siege Bosses", "💀", 30, [1, 4, 6], [20], 30, "Mon/Thu/Sat 21:30 server (20:30 UTC). Post-siege Reshanta bosses."],
  ["Rift Domination", "⚔", 20, [1, 4, 6], [19, 22], 0, "Mon/Thu/Sat ~20:00 & 23:00 server. 5 min prep + 15 min match."],
  ["Guardian Lord Nahma", "🐲", 30, [5, 0], [20], 0, "Fri & Sun 21:00 server (20:00 UTC)."],
  ["Abyss Rift Zone", "🌌", 30, [2, 4], [21], 0, "Tue & Thu ~22:00 server (21:00 UTC)."],
  ["Arena of Tactics (Day)", "🏟", 180, null, [10], 0, "Daily 11:00–14:00 server (10:00–13:00 UTC)."],
  ["Arena of Tactics (Evening)", "🏟", 120, null, [18], 0, "Daily 19:00–21:00 server (18:00–20:00 UTC)."]
];

export const DN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const NC = ["#22d3ee", "#c084fc", "#34d399", "#fbbf24", "#ff3b5c"];

/** Siege days (UTC): Monday=1, Thursday=4, Saturday=6 */
export const SIEGE_DAYS = [1, 4, 6];
