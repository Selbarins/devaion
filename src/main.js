/**
 * Devaion · Aion 2 Tracker
 * Desktop-first
 */

import { hasSupabase, saveAll, getSyncStatus, S, localGet } from './storage.js';
import { CATEGORIES, categoryEmoji, categoryColor } from './goals.js';

const CHAR_COLORS = ["#22d3ee","#c084fc","#34d399","#fbbf24","#ff3b5c","#60a5fa","#f472b6","#a3e635"];

const DEFAULT_ROSTER = [
  { id: "c1", name: "Main", role: "main", class: "Cleric", color: CHAR_COLORS[0], gs: 0 },
  { id: "c2", name: "Alt 1", role: "alt", class: "Sorcerer", color: CHAR_COLORS[1], gs: 0 },
  { id: "c3", name: "Alt 2", role: "alt", class: "Gladiator", color: CHAR_COLORS[2], gs: 0 }
];

const D_BASE = [
  { id:"duty", p:"d", n:"Duty Quests", ic:"📜", f:"Daily", s:"shared", c:5, t:"Server-wide pool. Do once on main after login." },
  { id:"emer", p:"d", n:"Emergency Supply Requests", ic:"🚨", f:"Daily", s:"shared", c:1, t:"Only turn in if the mats are cheap." },
  { id:"att", p:"d", n:"Attendance / Daeva Pass / Codes", ic:"📅", f:"Daily", s:"shared", c:1, t:"Claim attendance, advance pass tracks, redeem codes." },
  { id:"odyle", p:"d", n:"Spend Odyle Energy", ic:"💠", f:"Daily", s:"char", c:3, t:"15 every 3h (120/day). Cap 560 / 840 membership. Never sit at cap." },
  { id:"shugo", p:"d", n:"Shugo Festival Keys", ic:"🎁", f:"Daily", s:"shared", c:3, t:"3 keys/day · cap 12 (21 with membership). Shared." },
  { id:"nm", p:"d", n:"Nightmare Tickets", ic:"🌑", f:"Daily", s:"char", c:2, t:"+2/day · cap 14. Tracked per character." },
  { id:"dim", p:"d", n:"Dimensional Invasion Key", ic:"🕳", f:"Daily", s:"shared", c:1, t:"1 key/day · cap 7. Shared across characters." },
  { id:"ascw", p:"w", n:"Ascension Trial", ic:"🗼", f:"Weekly", s:"char", c:3, t:"Solo. Save for later in the week to push higher difficulty." },
  { id:"dd", p:"w", n:"Daily Dungeon (Weekly)", ic:"⏱", f:"Weekly", s:"main", c:14, t:"Main / server shared. Can clear all 14 in one sitting." },
  { id:"bf", p:"w", n:"Battlefield Victories", ic:"⚔", f:"Weekly", s:"char", c:3, t:"Do the 3 wins whenever convenient." },
  { id:"morph", p:"w", n:"Substance Morph (Odyle)", ic:"⚗", f:"Weekly", s:"char", c:4, t:"25 Odyle + 5 Fine + 1 Pure + 50k Kina → +40 Energy. 4 per character." },
  { id:"sub", p:"w", n:"Shop Odyle Stones", ic:"🛒", f:"Weekly", s:"char", c:4, t:"Wind Breeze Merchant. 4 per character (+ 16 server-wide)." },
  { id:"soul", p:"w", n:"Soul Crystals (Genus)", ic:"🔮", f:"Weekly", s:"main", c:1, t:"Wind Breeze Merchant · regular weekly limit (membership)." },
  { id:"pve", p:"w", n:"PvE Weekly Quest Scrolls", ic:"🗺", f:"Weekly", s:"shared", c:12, t:"Command Merchant. Buy before reset if you need them later." },
  { id:"pvp", p:"w", n:"PvP Weekly Quest Scrolls", ic:"🛡", f:"Weekly", s:"shared", c:20, t:"Abyss merchant. Shared limit." },
  { id:"corr", p:"w", n:"Abyss Corridors", ic:"🌀", f:"After Siege", s:"char", c:3, t:"Count depends on artifacts your faction won (max 3)." }
];

const REG = [
  ["Odyle Energy", "15 / 3h (120/day)", "560 / 840 Membership", "Per Character"],
  ["Shugo Festival Keys", "3 / Day", "12 / 21 Membership", "Shared"],
  ["Nightmare Tickets", "2 / Day", "14", "Per Character"],
  ["Dimensional Invasion", "1 / Day", "7", "Shared"]
];

const EV = [
  ["Spacetime Rift", "🌀", 60, null, [0,3,6,9,12,15,18,21], 0, "Portal open first 10 min. Cross-faction PvP + sealed dungeons."],
  ["Shugo Festival", "🎪", 10, null, Array.from({length:24},(_,i)=>i), 0, "Hourly minigame. Spend keys on good placements."],
  ["Dimensional Invasion", "🕳", 15, null, Array.from({length:24},(_,i)=>i), 30, "Open-world invasion every hour at :30."],
  ["Watcher Kaira", "👁", 30, null, [2,5,8,11,14,17,20,23], 0, "Abyss boss, random spot, leaves after 30 min."],
  ["Artifact Siege", "🏰", 30, [1,4,6], [19], 0, "Win artifacts → unlock Abyss Corridors."],
  ["Siege Bosses", "💀", 30, [1,4,6], [19], 30, "Post-conquest Reshanta bosses."],
  ["Rift Domination", "⚔", 20, [1,4,6], [18,21], 0, "5 min prep + 15 min match."],
  ["Guardian Lord Nahma", "🐲", 30, [5,0], [19], 0, "Weekend-eve boss (Fri & Sun)."],
  ["Abyss Rift Zone", "🌌", 30, [2,4], [20], 0, "Battlefield queue, Tue & Thu."],
  ["Arena of Tactics (Day)", "🏟", 180, null, [9], 0, "Open window 09:00–12:00 UTC."],
  ["Arena of Tactics (Evening)", "🏟", 120, null, [17], 0, "Open window 17:00–19:00 UTC."]
];

const DN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const P2 = x => String(x).padStart(2,"0");
const NC = ["#22d3ee","#c084fc","#34d399","#fbbf24","#ff3b5c"];

let roster = localGet("devaion_roster") || DEFAULT_ROSTER.slice();
roster.forEach((c,i) => { if (!c.color) c.color = CHAR_COLORS[i % CHAR_COLORS.length]; });

let st = Object.assign({
  tab: "missions", sub: "d", gsub: "d", gcat: "All",
  activeChar: roster[0]?.id || "c1",
  hid: [], ord: [], evHide: [], evPin: [],
  mEdit: false, evEdit: false, gEdit: null, showArch: false,
  showGoalForm: false, editingChar: null
}, localGet("devaion_st") || {});

if (!roster.find(c => c.id === st.activeChar)) st.activeChar = roster[0]?.id || "c1";
["hid","ord","evHide","evPin"].forEach(k => { if (!Array.isArray(st[k])) st[k] = []; });

let goals = localGet("devaion_goals", []);
let notes = localGet("devaion_notes", []);
let customs = localGet("devaion_customs", []);

function persist() {
  saveAll({ roster, st, goals, notes, customs });
}

// ─── Odyle ───────────────────────────────────
const ODYLE_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];
const ODYLE_PER_TICK = 15;

function getOdyleCap() { return S.get("a2om") === "1" ? 840 : 560; }
function isMembership() { return S.get("a2om") === "1"; }
function getOdyleVal(charId) { return Math.max(0, +S.get("a2oe_" + charId) || 0); }
function setOdyleVal(charId, value) {
  const v = Math.min(2000, Math.max(0, +value || 0));
  S.set("a2oe_" + charId, String(v));
  return v;
}
function getLastAppliedTick() { return +S.get("a2oe_last_tick") || 0; }
function setLastAppliedTick(ts) { S.set("a2oe_last_tick", String(ts)); }

function lastUtcTick(before = Date.now()) {
  const d = new Date(before);
  const h = d.getUTCHours();
  let tickH = ODYLE_HOURS[0];
  for (const x of ODYLE_HOURS) if (x <= h) tickH = x;
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), tickH, 0, 0, 0);
  if (t > before) return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - 1, 21, 0, 0, 0);
  return t;
}
function nextUtcTick(from = Date.now()) {
  const d = new Date(from);
  for (const x of ODYLE_HOURS) {
    const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), x, 0, 0, 0);
    if (t > from) return t;
  }
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
}
function applyOdyleTicks() {
  const now = Date.now();
  const latest = lastUtcTick(now);
  let last = getLastAppliedTick();
  if (!last) { setLastAppliedTick(latest); return 0; }
  if (latest <= last) return 0;
  let ticks = 0, cursor = last;
  while (cursor < latest) {
    cursor = nextUtcTick(cursor);
    if (cursor <= latest) ticks++; else break;
    if (ticks > 100) break;
  }
  if (ticks <= 0) { setLastAppliedTick(latest); return 0; }
  const cap = getOdyleCap();
  roster.forEach(c => {
    const v = getOdyleVal(c.id);
    if (v < cap) setOdyleVal(c.id, Math.min(cap, v + ticks * ODYLE_PER_TICK));
  });
  setLastAppliedTick(latest);
  return ticks;
}
function getOdyle(charId) {
  applyOdyleTicks();
  const v = getOdyleVal(charId);
  const next = nextUtcTick();
  return { v, nextIn: Math.max(0, next - Date.now()), nextAt: next };
}
function batteryLevel(v, cap) {
  const p = v / cap;
  if (p >= 0.95) return "full";
  if (p >= 0.55) return "high";
  if (p >= 0.25) return "mid";
  return "low";
}
