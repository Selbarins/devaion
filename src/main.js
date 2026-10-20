/**
 * Devaion · Aion 2 Tracker
 * Desktop-first redesign
 */

import { hasSupabase, loadAll, saveAll, getSyncStatus, S, localGet, localSet } from './storage.js';

// ─────────────────────────────────────────────
// Constants & base data
// ─────────────────────────────────────────────

const CHAR_COLORS = ["#ff2a44","#ff00aa","#b0ff00","#ffcc00","#c77dff","#00d4ff","#ff8c42","#7bffb2"];

const DEFAULT_ROSTER = [
  { id: "c1", name: "Main", role: "main", class: "Cleric", color: CHAR_COLORS[0], gs: 0 },
  { id: "c2", name: "Alt 1", role: "alt", class: "Sorcerer", color: CHAR_COLORS[1], gs: 0 },
  { id: "c3", name: "Alt 2", role: "alt", class: "Gladiator", color: CHAR_COLORS[2], gs: 0 }
];

const D_BASE = [
  { id:"duty", p:"d", n:"Duty Quests", ic:"📜", f:"Daily", s:"shared", c:5,
    t:"Server-wide pool. Do once on main after login." },
  { id:"emer", p:"d", n:"Emergency Supply Requests", ic:"🚨", f:"Daily", s:"shared", c:1,
    t:"Only turn in if the mats are cheap." },
  { id:"att", p:"d", n:"Attendance / Daeva Pass / Codes", ic:"📅", f:"Daily", s:"shared", c:1,
    t:"Claim attendance, advance pass tracks, redeem codes." },
  { id:"odyle", p:"d", n:"Spend Odyle Energy", ic:"💠", f:"Daily", s:"char", c:3,
    t:"15 every 3h (120/day). Cap 560 / 840 membership. Never sit at cap." },
  { id:"shugo", p:"d", n:"Shugo Festival Keys", ic:"🎁", f:"Daily", s:"shared", c:3,
    t:"3 keys/day · cap 12 (21 with membership). Shared. Don't sit at cap." },
  { id:"nm", p:"d", n:"Nightmare Tickets", ic:"🌑", f:"Daily", s:"char", c:2,
    t:"+2/day · cap 14. Tracked per character." },
  { id:"dim", p:"d", n:"Dimensional Invasion Key", ic:"🕳", f:"Daily", s:"shared", c:1,
    t:"1 key/day · cap 7. Shared across characters." },

  { id:"ascw", p:"w", n:"Ascension Trial", ic:"🗼", f:"Weekly", s:"char", c:3,
    t:"Solo. Save for later in the week to push higher difficulty." },
  { id:"dd", p:"w", n:"Daily Dungeon (weekly)", ic:"⏱", f:"Weekly", s:"main", c:14,
    t:"Main / server shared. Can clear all 14 in one sitting." },
  { id:"bf", p:"w", n:"Battlefield Victories", ic:"⚔", f:"Weekly", s:"char", c:3,
    t:"Do the 3 wins whenever convenient." },
  { id:"morph", p:"w", n:"Substance Morph (Odyle)", ic:"⚗", f:"Weekly", s:"char", c:4,
    t:"25 Odyle + 5 Fine + 1 Pure + 50k Kina → +40 Energy. 4 per character." },
  { id:"sub", p:"w", n:"Shop Odyle Stones", ic:"🛒", f:"Weekly", s:"char", c:4,
    t:"Wind Breeze Merchant. 4 per character (+ 16 server-wide)." },
  { id:"soul", p:"w", n:"Soul Crystals (Genus)", ic:"🔮", f:"Weekly", s:"main", c:1,
    t:"Wind Breeze Merchant · regular weekly limit (membership). Not event-only." },
  { id:"pve", p:"w", n:"PvE Weekly Quest Scrolls", ic:"🗺", f:"Weekly", s:"shared", c:12,
    t:"Command Merchant. Buy before reset if you need them later." },
  { id:"pvp", p:"w", n:"PvP Weekly Quest Scrolls", ic:"🛡", f:"Weekly", s:"shared", c:20,
    t:"Abyss merchant. Shared limit." },
  { id:"corr", p:"w", n:"Abyss Corridors", ic:"🌀", f:"After Siege", s:"char", c:3,
    t:"Count depends on artifacts your faction won (max 3)." }
];

const REG = [
  ["Odyle Energy", "15 / 3h (120/day)", "560 / 840 membership", "Per character"],
  ["Shugo Festival Keys", "3 / day", "12 / 21 membership", "Shared"],
  ["Nightmare Tickets", "2 / day", "14", "Per character"],
  ["Dimensional Invasion", "1 / day", "7", "Shared"]
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
  ["Arena of Tactics (day)", "🏟", 180, null, [9], 0, "Open window 09:00–12:00 UTC."],
  ["Arena of Tactics (evening)", "🏟", 120, null, [17], 0, "Open window 17:00–19:00 UTC."]
];

const DN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const P2 = x => String(x).padStart(2,"0");
const CAT = {Gear:"#ffcc00", Farming:"#b0ff00", PvP:"#ff4466", Social:"#c77dff", Other:"#8b9bb8"};
const NC = ["#ff2a44","#ff00aa","#b0ff00","#ffcc00","#c77dff"];
const TPL = [
  ["Clear Nightmare tickets","🌑","d",2,"char","Farming"],
  ["Spend Odyle before cap","💠","d",1,"char","Farming"],
  ["Win 3 Battlefields","⚔","w",3,"char","PvP"],
  ["Ascension Trial","🗼","w",3,"char","Gear"],
  ["Weapon to +10","🗡","l",10,"char","Gear"]
];

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────

let roster = localGet("devaion_roster") || DEFAULT_ROSTER.slice();
roster.forEach((c,i) => { if (!c.color) c.color = CHAR_COLORS[i % CHAR_COLORS.length]; });

let st = Object.assign({
  tab: "missions",
  sub: "d",
  gsub: "d",
  gcat: "All",
  activeChar: roster[0]?.id || "c1",
  hid: [],
  ord: [],
  evHide: [],
  evPin: [],
  mEdit: false,
  evEdit: false,
  gEdit: null,
  showArch: false,
  noTpl: false
}, localGet("devaion_st") || {});

if (!roster.find(c => c.id === st.activeChar)) st.activeChar = roster[0]?.id || "c1";
["hid","ord","evHide","evPin"].forEach(k => { if (!Array.isArray(st[k])) st[k] = []; });

let goals = localGet("devaion_goals", []);
let notes = localGet("devaion_notes", []);
let customs = localGet("devaion_customs", []);

function persist() {
  saveAll({ roster, st, goals, notes, customs });
}

// ─────────────────────────────────────────────
// Odyle
// ─────────────────────────────────────────────

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
  if (!last) { setLastAppliedTick(latest); return; }
  if (latest <= last) return;

  let ticks = 0;
  let cursor = last;
  while (cursor < latest) {
    cursor = nextUtcTick(cursor);
    if (cursor <= latest) ticks++;
    else break;
    if (ticks > 100) break;
  }
  if (ticks <= 0) { setLastAppliedTick(latest); return; }

  const cap = getOdyleCap();
  roster.forEach(c => {
    const v = getOdyleVal(c.id);
    if (v < cap) setOdyleVal(c.id, Math.min(cap, v + ticks * ODYLE_PER_TICK));
  });
  setLastAppliedTick(latest);
}

function getOdyle(charId) {
  applyOdyleTicks();
  const v = getOdyleVal(charId);
  const next = nextUtcTick();
  return { v, nextIn: Math.max(0, next - Date.now()), nextAt: next };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function lastReset(w) {
  const n = new Date(), d = new Date();
  d.setUTCHours(7, 0, 0, 0);
  if (w) {
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - 3 + 7) % 7));
    if (d > n) d.setUTCDate(d.getUTCDate() - 7);
  } else if (d > n) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}
const pk = p => p === "w" ? "w" + lastReset(1).toISOString().slice(0, 10) : "d" + lastReset(0).toISOString().slice(0, 10);
const activeChar = () => roster.find(c => c.id === st.activeChar) || roster[0];
const isMain = () => activeChar()?.role === "main";
const max = it => typeof it.c === "object" ? (isMain() ? it.c.Main : it.c.alt) : it.c;
const key = it => `d2|${it.id}|${it.s === "char" ? st.activeChar : "x"}|${pk(it.p)}`;
const val = it => +S.get(key(it)) || 0;
const dis = it => (it.s === "main" || it.s === "shared") && !isMain();
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const tog = (a, x) => { const i = a.indexOf(x); i < 0 ? a.push(x) : a.splice(i, 1); };
const hid = it => st.hid.includes(it.id);
const ordered = l => l.slice().sort((a, b) => {
  const i = st.ord.indexOf(a.id), j = st.ord.indexOf(b.id);
  return (i < 0 ? 999 : i) - (j < 0 ? 999 : j);
});
const withChar = (c, f) => { const o = st.activeChar; st.activeChar = c; try { return f(); } finally { st.activeChar = o; }; };
const cnt = (p, c) => withChar(c, () => {
  const D = getAllMissions();
  const l = D.filter(i => i.p === p && !dis(i) && !hid(i));
  return [l.filter(i => val(i) >= max(i)).length, l.length];
});
const nextReset = w => +lastReset(w) + (w ? 6048e5 : 864e5);

function getAllMissions() {
  return D_BASE.concat(customs.map(c => ({
    id: c.id, p: c.p, n: c.n, ic: c.ic || "⭐", f: c.p === "w" ? "Weekly" : "Daily",
    s: c.s || "char", c: c.c || 1, t: c.t || "Custom mission", custom: true
  })));
}

function prog(p) {
  let a = 0, b = 0;
  getAllMissions().filter(i => i.p === p && !dis(i) && !hid(i)).forEach(i => {
    b += max(i);
    a += Math.min(val(i), max(i));
  });
  return b ? Math.round(a / b * 100) : 0;
}

function fmt(ms) {
  const s = Math.max(0, ms / 1e3 | 0);
  const d = s / 86400 | 0, h = s % 86400 / 3600 | 0, m = s % 3600 / 60 | 0;
  return (d ? d + "d " : "") + h + "h " + m + "m";
}
function fmtShort(ms) {
  const s = Math.max(0, ms / 1e3 | 0);
  const h = s / 3600 | 0, m = s % 3600 / 60 | 0, sec = s % 60;
  if (h > 0) return h + "h " + m + "m";
  return m + "m " + sec + "s";
}

function nxt(e) {
  const n = Date.now();
  let best = null;
  for (let k = -1; k < 10; k++) {
    const b = new Date();
    b.setUTCDate(b.getUTCDate() + k);
    if (e[3] && !e[3].includes(b.getUTCDay())) continue;
    for (const h of e[4]) {
      const s = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate(), h, e[5]);
      if (s + e[2] * 6e4 > n && (best === null || s < best)) best = s;
    }
  }
  return best;
}

const gkey = (g, c) => `g|${g.id}|${g.sc === "char" ? c : "x"}|${pk(g.ty)}`;
const gmax = g => g.steps?.length || g.tg;
const gval = (g, c) => g.ty === "l" ? (g.steps?.length ? g.steps.filter(x => x.d).length : g.v || 0) : (+S.get(gkey(g, c)) || 0);
const vis = (g, c) => g.ty !== "l" || g.sc !== "char" || g.ch === c;
const glist = (ty, c) => goals.filter(g => g.ty === ty && vis(g, c)).sort((a, b) => (+!!b.hi) - (+!!a.hi));
const gcnt = (ty, c) => {
  const l = glist(ty, c).filter(g => !g.pause && !g.arch);
  return [l.filter(g => gval(g, c) >= gmax(g)).length, l.length];
};
function urg(g) {
  if (g.pause || g.arch) return null;
  const n = Date.now();
  if (g.ty === "l") {
    if (!g.due) return null;
    const ms = new Date(g.due + "T23:59:59Z") - n;
    return ms < 0 ? ["late", "overdue"] : ms < 3 * 864e5 ? ["warn", fmt(ms) + " left"] : null;
  }
  const ms = nextReset(g.ty === "w") - n;
  return ms < (g.ty === "w" ? 12 : 3) * 36e5 ? ["warn", "resets in " + fmt(ms)] : null;
}

// Purge old keys
(function purge() {
  try {
    const cd = pk("d"), cw = pk("w");
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!/^(d2|g)\|/.test(k)) continue;
      const t = k.split("|").pop();
      if ((t[0] === "d" && t !== cd) || (t[0] === "w" && t !== cw)) localStorage.removeItem(k);
    }
  } catch {}
})();

// ─────────────────────────────────────────────
// Render helpers
// ─────────────────────────────────────────────

function card(it, ed) {
  const m = max(it), v = val(it), d = dis(it) && !ed, done = v >= m && !d && !ed;
  const sc = { char: "Per character", shared: "Shared", main: "Main only" }[it.s];
  const scClass = { char: "char", shared: "shared", main: "main" }[it.s];
  const isCustom = !!it.custom;
  const ctl = d
    ? `<span style="font-size:12px;color:var(--muted)">Main only</span>`
    : ed
      ? `<div class="ctl">
          <button data-mv="${it.id}" data-d="-1">▲</button>
          <button data-mv="${it.id}" data-d="1">▼</button>
          <button data-hd="${it.id}">${hid(it) ? "Show" : "Hide"}</button>
          ${isCustom ? `<button data-cdel="${it.id}" style="color:var(--danger)">Del</button>` : ""}
        </div>`
      : `<div class="ctl">
          <button data-k="${it.id}" data-d="-1">−</button>
          <b>${v}/${m}</b>
          <button data-k="${it.id}" data-d="1">+</button>
          <button data-k="${it.id}" data-d="all">Max</button>
        </div>`;

  return `<div class="row ${done ? "done" : ""} ${d ? "dis" : ""} ${ed && hid(it) ? "hid" : ""}">
    <span class="ic">${it.ic}</span>
    <div>
      <div class="hd">
        <h3>${it.n}</h3>
        <span class="tg ${scClass}">${sc}</span>
        <span class="tg">${it.f}</span>
        ${isCustom ? '<span class="tg custom">Custom</span>' : ""}
      </div>
      <div class="tip">${it.t}</div>
    </div>
    ${ctl}
  </div>`;
}

function gcard(g, c) {
  const m = gmax(g), v = gval(g, c), L = g.ty === "l", done = v >= m, u = !done && urg(g);
  const cat = CAT[g.cat] || CAT.Other;
  const stp = L && g.steps?.length
    ? `<div class="steps">${g.steps.map((x, i) =>
        `<label><input type="checkbox" data-st="${g.id}|${i}" ${x.d ? "checked" : ""}> ${esc(x.x)}</label>`
      ).join("")}</div>` : "";
  const ctl = L && g.steps?.length
    ? `<div class="ctl"><b>${v}/${m}</b></div>`
    : `<div class="ctl">
        <button data-gk="${g.id}" data-d="-1">−</button>
        <b>${v}/${m}</b>
        <button data-gk="${g.id}" data-d="1">+</button>
        ${m >= 20 ? `<button data-gk="${g.id}" data-d="10">+10</button>` : ""}
        <button data-gk="${g.id}" data-d="all">Max</button>
      </div>`;
  const a = (k, l) => `<button data-ga="${k}" data-gid="${g.id}">${l}</button>`;

  return `<div class="row ${done ? "done" : ""} ${g.pause ? "hid" : ""} ${u ? u[0] : ""}" draggable="true" data-gid="${g.id}">
    <span class="ic">${esc(g.ic)}</span>
    <div>
      <div class="hd">
        <h3>${g.hi ? "★ " : ""}${esc(g.n)}</h3>
        <span class="tg" style="color:${cat};border-color:${cat}55">${g.cat}</span>
        <span class="tg ${g.sc === "char" ? "char" : "shared"}">${g.sc === "char" ? "Per character" : "Account"}</span>
        ${g.due ? `<span class="tg">Due ${g.due}</span>` : ""}
        ${u ? `<span class="tg" style="color:var(--warn)">⏰ ${u[1]}</span>` : ""}
        ${g.pause ? '<span class="tg">Paused</span>' : ""}
      </div>
      ${g.nt ? `<div class="tip">${esc(g.nt)}</div>` : ""}${stp}
      <div class="acts">${a("edit","Edit")}${a("up","▲")}${a("down","▼")}${a("pause", g.pause ? "Resume" : "Pause")}${L && (done || g.arch) ? a("arch", g.arch ? "Restore" : "Archive") : ""}${a("del","Delete")}</div>
    </div>
    ${ctl}
  </div>`;
}

// ─────────────────────────────────────────────
// Views
// ─────────────────────────────────────────────

function drawMissions(app) {
  const D = getAllMissions();
  const all = ordered(D.filter(i => i.p === st.sub));
  const L = st.mEdit ? all : all.filter(i => !dis(i) && !hid(i));
  const pct = prog(st.sub);
  const char = activeChar();

  app.innerHTML = `
    <div class="panel">
      <div class="ctrl-bar">
        <div class="seg">
          <button data-s="d" class="${st.sub === "d" ? "on" : ""}">Daily</button>
          <button data-s="w" class="${st.sub === "w" ? "on" : ""}">Weekly</button>
        </div>
        <span class="pct"><b>${pct}%</b> · ${esc(char.name)}</span>
        <button data-me="1" class="btn-sm">${st.mEdit ? "Done" : "Edit list"}</button>
      </div>

      ${st.mEdit ? `
        <div class="hint">Reorder with ▲▼. Hidden missions are removed from your list. Add custom missions below.</div>
        <div class="custom-form">
          <input type="text" id="cmIc" value="⭐" maxlength="2" style="width:44px;text-align:center" title="Icon">
          <input type="text" id="cmN" placeholder="Custom mission name" maxlength="40" style="width:220px">
          <select id="cmS">
            <option value="char">Per character</option>
            <option value="shared">Shared</option>
            <option value="main">Main only</option>
          </select>
          <input type="number" id="cmC" value="1" min="1" max="99" style="width:60px" title="Count">
          <button id="cmAdd" class="btn-sm on">+ Add custom</button>
        </div>
      ` : ""}

      <div>${L.map(i => card(i, st.mEdit)).join("") || '<p class="tip" style="padding:12px 0">No missions for this character / filter.</p>'}</div>
    </div>`;
}

function drawResources(app) {
  const o = getOdyle(st.activeChar);
  const cap = getOdyleCap();
  const om = isMembership();
  const nearCap = o.v >= cap - 30;
  const atCap = o.v >= cap;
  const nextLocal = new Date(o.nextAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const char = activeChar();

  app.innerHTML = `
    <div class="panel">
      <h2>Regenerating Resources</h2>
      <table>
        <tr><th>Resource</th><th>Regen</th><th>Cap</th><th>Scope</th></tr>
        ${REG.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}
      </table>
    </div>

    <div class="panel">
      <h2>Odyle Energy · ${esc(char.name)}</h2>
      <div class="cap-banner ${atCap ? "show" : nearCap ? "show warn" : ""}">
        ${atCap ? "At cap — natural regen is stopped. Spend some energy." : "Approaching cap. Spend soon to avoid waste."}
      </div>

      <div class="ctrl-bar">
        <label style="color:var(--mut);font-size:12px">Current
          <input type="number" id="oe" min="0" max="2000" value="${o.v}">
        </label>
        <label class="tg" style="cursor:pointer">
          <input type="checkbox" id="om" ${om ? "checked" : ""}> Membership (840)
        </label>
        <button id="oe-save" class="btn-sm on">Update value</button>
      </div>

      <div class="odyle-box" id="oc">
        <div class="res ${atCap ? "cap-hit" : nearCap ? "cap-warn" : ""}">
          <b id="odyle-live-val">${o.v}</b><small>current energy</small>
        </div>
        <div class="res">
          <b id="odyle-next">${fmtShort(o.nextIn)}</b><small>next +15 · ${nextLocal}</small>
        </div>
        <div class="res"><b>${Math.floor(o.v / 40)}</b><small>cubes now</small></div>
        <div class="res"><b>${o.v >= 80 ? Math.floor(o.v / 80) : 0}</b><small>double claims</small></div>
        <div class="res">
          <b>${atCap ? "CAPPED" : ((cap - o.v) / 15 * 3 / 24).toFixed(1) + "d"}</b>
          <small>${atCap ? "spend now" : "to cap"}</small>
        </div>
        <div class="res"><b>${Math.min(o.v + 120 * 7, cap)}</b><small>after 7 days</small></div>
      </div>

      <div class="hint" style="margin-top:14px">
        Global tick every 3h UTC (00 · 03 · 06 · 09 · 12 · 15 · 18 · 21). Same for all characters.<br>
        Updating the number only changes the value — it never resets the timer.
      </div>
    </div>

    <div class="panel">
      <h2>Odyle Sources</h2>
      <div style="font-size:13.5px;color:var(--mut);line-height:1.7">
        ⏳ Natural regen · 120 / day (15 every 3h UTC)<br>
        ⚗ Substance Morph · +40 each (4 per character)<br>
        🛒 Wind Breeze Shop · +40 each (4 per character + 16 server)<br>
        🎟 Daeva Pass & events
      </div>
    </div>`;

  document.getElementById("oe-save").onclick = () => {
    setOdyleVal(st.activeChar, document.getElementById("oe").value);
    S.set("a2om", document.getElementById("om").checked ? "1" : "0");
    persist();
    render();
  };
  document.getElementById("om").onchange = () => {
    S.set("a2om", document.getElementById("om").checked ? "1" : "0");
    const cap2 = getOdyleCap();
    roster.forEach(c => {
      const v = getOdyleVal(c.id);
      if (v > cap2) setOdyleVal(c.id, cap2);
    });
    render();
  };
}

function drawEvents(app) {
  const n = Date.now();
  const ed = st.evEdit;
  const items = EV.map(e => ({ e, s: nxt(e) }))
    .filter(o => ed || !st.evHide.includes(o.e[0]))
    .sort((a, b) => (st.evPin.includes(b.e[0]) - st.evPin.includes(a.e[0])) || a.s - b.s);

  app.innerHTML = `
    <div class="panel">
      <div class="ctrl-bar">
        <h2 style="margin:0">Event Timers</h2>
        <button data-ee="1" class="btn-sm" style="margin-left:auto">${ed ? "Done" : "Filter"}</button>
      </div>
      ${ed ? '<div class="hint">Hide events you never do, pin the ones you care about.</div>' : ""}
      <div id="evlist">
        ${items.map(({ e, s }) => {
          const on = s <= n, end = s + e[2] * 6e4, d = new Date(s);
          const h = st.evHide.includes(e[0]), p = st.evPin.includes(e[0]);
          const local = d.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
          const when = e[4].length === 24
            ? `Every hour at :${P2(e[5])}`
            : (e[3] ? e[3].map(x => DN[x]).join("/") + " " : "Daily ") + e[4].map(h => P2(h) + ":" + P2(e[5])).join(", ") + " UTC";
          return `<div class="event-row ${on && !h ? "open" : ""}" ${h ? 'style="opacity:.45"' : ""}>
            <span class="ic">${e[1]}</span>
            <div>
              <div class="hd"><h3 style="font-size:14.5px;font-weight:600">${p ? "★ " : ""}${e[0]}</h3></div>
              <div class="when">${when} · Next: ${local}</div>
              <div class="tip">${e[6]}</div>
            </div>
            <div style="text-align:right">
              <div class="status ${on ? "open" : (s - n < 36e5 ? "soon" : "")}">${on ? "OPEN · " + fmt(end - n) : "in " + fmt(s - n)}</div>
              ${ed ? `<div class="ctl" style="justify-content:flex-end;margin-top:4px">
                <button data-ep="${esc(e[0])}">${p ? "Unpin" : "★ Pin"}</button>
                <button data-eh="${esc(e[0])}">${h ? "Show" : "Hide"}</button>
              </div>` : ""}
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
}

function drawDash(app) {
  applyOdyleTicks();
  const cap = getOdyleCap();
  const odNext = nextUtcTick();
  const rows = roster.map(r => {
    const ov = getOdyleVal(r.id);
    return { r, md: cnt("d", r.id), mw: cnt("w", r.id), gd: gcnt("d", r.id), gw: gcnt("w", r.id), oe: ov };
  });
  const gsv = roster.map(r => +r.gs || 0).filter(Boolean);
  const avg = gsv.length ? Math.round(gsv.reduce((a, b) => a + b, 0) / gsv.length) : 0;
  const top = roster.reduce((a, r) => (+r.gs || 0) > (+a.gs || 0) ? r : a, roster[0]);
  const ta = rows.reduce((a, x) => a + x.md[0], 0), tb = rows.reduce((a, x) => a + x.md[1], 0);

  const bar = (l, [a, b]) => `
    <div class="mb">
      <span>${l}</span>
      <div class="bt"><i class="${b && a === b ? "ok" : ""}" style="width:${b ? a / b * 100 : 0}%"></i></div>
      <b>${b ? a + "/" + b : "—"}</b>
    </div>`;

  const oeBar = (v) => {
    const pct = Math.min(100, Math.round(v / cap * 100));
    return `<div class="mb">
      <span>Odyle</span>
      <div class="bt"><i style="width:${pct}%;${v >= cap ? "background:var(--danger);box-shadow:0 0 6px var(--danger)" : v >= cap - 30 ? "background:var(--warn);box-shadow:0 0 6px var(--warn)" : ""}"></i></div>
      <b>${v}/${cap}</b>
    </div>`;
  };

  app.innerHTML = `
    <div class="panel">
      <div class="grid-4">
        <div class="stat-box"><b>${roster.length}</b><small>characters</small></div>
        <div class="stat-box"><b>${avg || "—"}</b><small>average GS</small></div>
        <div class="stat-box"><b>${+top?.gs ? esc(top.name) : "—"}</b><small>top GS${+top?.gs ? " · " + top.gs : ""}</small></div>
        <div class="stat-box"><b>${tb ? Math.round(ta / tb * 100) + "%" : "—"}</b><small>daily missions (all)</small></div>
      </div>
      <div style="margin-top:12px;text-align:center;color:var(--muted);font-size:13px">
        Next Odyle +15 in <b style="color:var(--neon)">${fmtShort(Math.max(0, odNext - Date.now()))}</b>
      </div>
    </div>

    <div class="dgrid">
      ${rows.map(({ r, md, mw, gd, gw, oe }) => `
        <div class="dc" style="border-left:3px solid ${r.color}">
          <div class="top">
            <div>
              <div class="name" style="font-weight:600;font-size:15px;display:flex;align-items:center;gap:8px">
                <span class="char-dot" style="background:${r.color}"></span>
                ${esc(r.name)} ${r.role === "main" ? '<span class="tg main">Main</span>' : ""}
              </div>
              <div class="tip">${esc(r.class || "—")}</div>
            </div>
            <label class="gs">GS <input type="number" min="0" data-gs="${r.id}" value="${r.gs || 0}"></label>
          </div>
          ${oeBar(oe)}
          ${bar("Missions · daily", md)}
          ${bar("Missions · weekly", mw)}
          ${bar("Goals · daily", gd)}
          ${bar("Goals · weekly", gw)}
          <button data-open="${r.id}" class="btn-sm" style="margin-top:8px">Open missions →</button>
        </div>`).join("")}
    </div>`;
}

function drawRoster(app) {
  app.innerHTML = `
    <div class="panel">
      <h2>Characters</h2>
      <div class="config-form">
        <input type="text" id="newName" placeholder="Name" maxlength="20">
        <select id="newRole"><option value="main">Main</option><option value="alt">Alt</option></select>
        <input type="text" id="newClass" placeholder="Class" maxlength="16">
        <input type="number" id="newGS" placeholder="GS" min="0">
        <div class="color-pick" id="newColorPick">
          ${CHAR_COLORS.map((c, i) =>
            `<button type="button" class="color-swatch ${i === 0 ? "on" : ""}" data-color="${c}" style="background:${c}"></button>`
          ).join("")}
        </div>
        <input type="hidden" id="newColor" value="${CHAR_COLORS[0]}">
        <button id="addChar" class="btn-sm on">Add</button>
      </div>
      <div class="roster-grid" id="rosterList">
        ${roster.map(c => `
          <div class="char-card ${c.id === st.activeChar ? "active" : ""}" data-id="${c.id}" style="border-left:3px solid ${c.color}">
            <div class="name">
              <button type="button" class="char-dot" data-recolor="${c.id}" style="background:${c.color}" title="Change color"></button>
              ${esc(c.name)} ${c.role === "main" ? '<span class="tg main">Main</span>' : ""}
            </div>
            <div class="meta">${esc(c.class || "—")} · GS ${c.gs || "—"}</div>
            <div class="stats">
              <button data-edit="${c.id}" class="btn-sm">Edit</button>
              ${roster.length > 1 ? `<button data-del="${c.id}" class="btn-sm" style="color:var(--danger)">Delete</button>` : ""}
            </div>
          </div>`).join("")}
      </div>
    </div>

    <div class="panel">
      <h2>Backup</h2>
      <div class="config-form">
        <button id="bkEx" class="btn-sm">Export backup</button>
        <button id="bkIm" class="btn-sm">Import backup</button>
        <input type="file" id="bkF" accept=".json" hidden>
      </div>
      <p class="hint" style="margin:0">Local only. Export regularly. Cloud sync via Supabase is automatic when configured.</p>
    </div>`;
}

function drawGoals(app) {
  const c = st.activeChar;
  const ed = goals.find(g => g.id === st.gEdit);
  const f = ed || { n: "", ic: "🎯", ty: st.gsub, tg: 1, sc: "char", cat: "Other", hi: false, due: "", nt: "", steps: [] };
  const gd = gcnt("d", c), gw = gcnt("w", c);
  const gl = glist("l", c).filter(g => !g.arch && !g.pause);
  const ld = gl.filter(g => gval(g, c) >= gmax(g)).length;
  const na = goals.filter(g => g.arch).length;
  const list = glist(st.gsub, c).filter(g => (st.gcat === "All" || g.cat === st.gcat) && (st.showArch || !g.arch));
  const tpl = st.noTpl || ed ? [] : TPL.map((t, i) => [t, i]).filter(([t]) => t[2] === st.gsub && !goals.some(g => g.n === t[0]));
  const o = (v, k, l) => `<option value="${k}" ${v === k ? "selected" : ""}>${l}</option>`;
  const char = activeChar();

  app.innerHTML = `
    <div class="panel">
      <div class="grid-3">
        <div class="stat-box"><b>${gd[0]}/${gd[1]}</b><small>Daily goals · ${esc(char.name)}</small></div>
        <div class="stat-box"><b>${gw[0]}/${gw[1]}</b><small>Weekly goals</small></div>
        <div class="stat-box"><b>${ld}/${gl.length}</b><small>Long-term done</small></div>
      </div>
    </div>

    <div class="panel">
      <h2>${ed ? "Edit goal" : "New goal"}</h2>
      <div class="config-form" style="margin-bottom:8px">
        <input type="text" id="gI" value="${esc(f.ic)}" maxlength="2" style="width:44px;text-align:center">
        <input type="text" id="gN" value="${esc(f.n)}" placeholder="Goal title" maxlength="60" style="width:220px">
        <select id="gT">${o(f.ty,"d","Daily")}${o(f.ty,"w","Weekly")}${o(f.ty,"l","Long-term")}</select>
        <label>Target <input type="number" id="gG" min="1" value="${f.tg}"></label>
        <select id="gS">${o(f.sc,"char","Per character")}${o(f.sc,"acc","Account")}</select>
        <select id="gC">${Object.keys(CAT).map(k => o(f.cat, k, k)).join("")}</select>
        <label class="tg" style="cursor:pointer"><input type="checkbox" id="gH" ${f.hi ? "checked" : ""}> ★ High</label>
      </div>
      <div class="config-form">
        <input type="text" id="gO" value="${esc(f.nt)}" placeholder="Note (optional)" style="width:220px">
        <input type="text" id="gP" value="${esc((f.steps || []).map(x => x.x).join(", "))}" placeholder="Steps, comma separated (long-term)" style="width:280px">
        <label>Deadline <input type="date" id="gD" value="${f.due || ""}"></label>
        <button id="gAdd" class="btn-sm on">${ed ? "Save" : "Add goal"}</button>
        ${ed ? '<button data-ga="cancel" class="btn-sm">Cancel</button>' : ""}
      </div>
      <div class="hint">Long-term goals marked "per character" belong to the character active when you create them. Drag rows to reorder.</div>
      ${tpl.length ? `<div class="chips">Quick start: ${tpl.map(([t, i]) => `<button data-ga="tpl" data-i="${i}">${t[1]} ${t[0]}</button>`).join("")}<button data-ga="notpl" title="Hide suggestions">✕</button></div>` : ""}
    </div>

    <div class="panel">
      <div class="ctrl-bar">
        <div class="seg">
          <button data-gsub="d" class="${st.gsub === "d" ? "on" : ""}">Daily</button>
          <button data-gsub="w" class="${st.gsub === "w" ? "on" : ""}">Weekly</button>
          <button data-gsub="l" class="${st.gsub === "l" ? "on" : ""}">Long-term</button>
        </div>
        <select id="gF">${["All", ...Object.keys(CAT)].map(k => o(st.gcat, k, k === "All" ? "All categories" : k)).join("")}</select>
        ${na ? `<label class="tg" style="cursor:pointer"><input type="checkbox" id="gArch" ${st.showArch ? "checked" : ""}> Archived (${na})</label>` : ""}
      </div>
      <div id="goal-list">${list.length ? list.map(g => gcard(g, c)).join("") : '<p class="tip" style="padding:10px 0">Nothing here yet. Add a goal above.</p>'}</div>
    </div>

    <div class="panel">
      <h2>Notes <button id="nAdd" class="btn-sm" style="float:right">+ Note</button></h2>
      <div class="notes">${notes.map((n, i) => `
        <div class="note" style="--nc:${n.c};transform:rotate(${(i % 3 - 1) * 0.7}deg)">
          <div class="nh">
            ${NC.map(k => `<button class="dot" data-nc="${n.id}|${k}" style="background:${k}"></button>`).join("")}
            <button class="x" data-nd="${n.id}">×</button>
          </div>
          <textarea data-nid="${n.id}" placeholder="Write something…">${esc(n.tx)}</textarea>
        </div>`).join("") || '<p class="tip">No notes yet.</p>'}
      </div>
    </div>`;

  setupGoalDrag();
}

function setupGoalDrag() {
  const list = document.getElementById("goal-list");
  if (!list) return;
  let dragId = null;
  list.querySelectorAll(".row[draggable]").forEach(row => {
    row.addEventListener("dragstart", e => {
      dragId = row.dataset.gid;
      row.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      dragId = null;
      list.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));
    });
    row.addEventListener("dragover", e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      row.classList.add("drag-over");
    });
    row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
    row.addEventListener("drop", e => {
      e.preventDefault();
      row.classList.remove("drag-over");
      if (!dragId || dragId === row.dataset.gid) return;
      const from = goals.findIndex(g => g.id === dragId);
      const to = goals.findIndex(g => g.id === row.dataset.gid);
      if (from < 0 || to < 0) return;
      const [item] = goals.splice(from, 1);
      goals.splice(to, 0, item);
      persist();
      render();
    });
  });
}

// ─────────────────────────────────────────────
// Shell + render
// ─────────────────────────────────────────────

const TABS = [
  ["missions", "📜", "Missions"],
  ["goals", "🎯", "Goals"],
  ["dash", "📊", "Overview"],
  ["events", "⏱", "Events"],
  ["resources", "💠", "Resources"],
  ["roster", "👥", "Roster"]
];

function render() {
  const root = document.getElementById("app");
  const char = activeChar();
  const sync = getSyncStatus();

  root.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="logo">DEV<span>AION</span></div>

        <nav class="side-nav">
          ${TABS.map(([k, icon, label]) =>
            `<button data-t="${k}" class="${st.tab === k ? "on" : ""}">
              <span class="icon">${icon}</span>${label}
            </button>`
          ).join("")}
        </nav>

        <div class="side-section">
          <h4>Characters</h4>
          <div class="char-list">
            ${roster.map(c => `
              <div class="char-item ${c.id === st.activeChar ? "active" : ""}" data-c="${c.id}">
                <span class="dot" style="background:${c.color}"></span>
                <span class="name">${esc(c.name)}</span>
                <span class="role">${c.role === "main" ? "MAIN" : ""}</span>
              </div>`).join("")}
          </div>
        </div>

        <div class="side-footer">
          <div class="sync-pill ${hasSupabase ? (sync === "error" ? "warn" : "ok") : ""}">
            ${hasSupabase ? (sync === "synced" ? "● Cloud synced" : sync === "syncing" ? "● Syncing…" : "● Cloud ready") : "○ Local only"}
          </div>
          <div>v5.1 · Desktop</div>
        </div>
      </aside>

      <div class="main-area">
        <header class="topbar">
          <h1>${TABS.find(t => t[0] === st.tab)?.[2] || "Devaion"}</h1>
          <span class="meta">${esc(char.name)} · ${esc(char.class || "—")}</span>
          <div class="clocks">
            <div>Daily <b id="cd">--</b> <span class="prog-mini"><i id="pd"></i></span></div>
            <div>Weekly <b id="cw">--</b> <span class="prog-mini"><i id="pw"></i></span></div>
          </div>
        </header>

        <div class="content" id="view"></div>
      </div>
    </div>
  `;

  const view = document.getElementById("view");
  if (st.tab === "missions") drawMissions(view);
  else if (st.tab === "resources") drawResources(view);
  else if (st.tab === "events") drawEvents(view);
  else if (st.tab === "dash") drawDash(view);
  else if (st.tab === "roster") drawRoster(view);
  else if (st.tab === "goals") drawGoals(view);

  tick();
}

function tick() {
  const n = new Date();
  for (const [p, id, len] of [["d", "d", 864e5], ["w", "w", 6048e5]]) {
    const last = lastReset(p === "w"), nx = new Date(+last + len);
    const el = document.getElementById("c" + id);
    if (el) el.textContent = fmt(nx - n);
    const bar = document.getElementById("p" + id);
    if (bar) bar.style.width = prog(p) + "%";
  }

  if (st.tab === "resources") {
    const o = getOdyle(st.activeChar);
    const next = document.getElementById("odyle-next");
    if (next) next.textContent = fmtShort(o.nextIn);
    const live = document.getElementById("odyle-live-val");
    if (live && document.activeElement?.id !== "oe") live.textContent = o.v;
  }
}

// ─────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────

document.addEventListener("click", e => {
  const b = e.target.closest("button, .char-card, .char-item");
  if (!b) return;

  if (b.dataset.t) st.tab = b.dataset.t;
  else if (b.dataset.s) st.sub = b.dataset.s;
  else if (b.dataset.c) st.activeChar = b.dataset.c;
  else if (b.dataset.k) {
    const it = getAllMissions().find(i => i.id === b.dataset.k);
    if (!it) return;
    const m = max(it);
    let v = val(it);
    v = b.dataset.d === "all" ? m : Math.min(m, Math.max(0, v + +b.dataset.d));
    S.set(key(it), v);
  }
  else if (b.classList.contains("color-swatch") && b.dataset.color) {
    const pick = document.getElementById("newColorPick");
    if (pick && pick.contains(b)) {
      pick.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("on"));
      b.classList.add("on");
      const hidden = document.getElementById("newColor");
      if (hidden) hidden.value = b.dataset.color;
      return;
    }
  }
  else if (b.dataset.recolor) {
    const c = roster.find(x => x.id === b.dataset.recolor);
    if (c) {
      const i = CHAR_COLORS.indexOf(c.color);
      c.color = CHAR_COLORS[(i + 1) % CHAR_COLORS.length];
    }
  }
  else if (b.id === "addChar") {
    const name = document.getElementById("newName").value.trim() || "Alt";
    const role = document.getElementById("newRole").value;
    const cls = document.getElementById("newClass").value.trim() || "";
    const color = document.getElementById("newColor")?.value || CHAR_COLORS[roster.length % CHAR_COLORS.length];
    const id = "c" + Date.now();
    if (role === "main") roster.forEach(c => c.role = "alt");
    roster.push({ id, name, role, class: cls, gs: +document.getElementById("newGS").value || 0, color });
    st.activeChar = id;
  }
  else if (b.dataset.id && b.classList.contains("char-card")) st.activeChar = b.dataset.id;
  else if (b.dataset.del) {
    if (roster.length <= 1) return;
    roster = roster.filter(c => c.id !== b.dataset.del);
    goals = goals.filter(g => g.ch !== b.dataset.del);
    if (st.activeChar === b.dataset.del) st.activeChar = roster[0].id;
  }
  else if (b.dataset.edit) {
    const c = roster.find(x => x.id === b.dataset.edit);
    if (!c) return;
    const name = prompt("Name", c.name);
    if (name === null) return;
    const cls = prompt("Class", c.class || "");
    if (cls === null) return;
    const gs = prompt("Gear score", c.gs || 0);
    if (gs === null) return;
    c.gs = +gs || 0;
    c.name = name.trim() || c.name;
    c.class = cls.trim();
    if (confirm("Set as Main?")) {
      roster.forEach(x => x.role = "alt");
      c.role = "main";
    }
  }
  else if (b.dataset.me) st.mEdit = !st.mEdit;
  else if (b.dataset.mv) {
    const ids = ordered(getAllMissions().filter(i => i.p === st.sub)).map(i => i.id);
    const i = ids.indexOf(b.dataset.mv), j = i + +b.dataset.d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    st.ord = ids.concat(st.ord.filter(x => !ids.includes(x)));
  }
  else if (b.dataset.hd) tog(st.hid, b.dataset.hd);
  else if (b.dataset.cdel) {
    if (!confirm("Delete this custom mission?")) return;
    customs = customs.filter(c => c.id !== b.dataset.cdel);
  }
  else if (b.id === "cmAdd") {
    const n = document.getElementById("cmN").value.trim();
    if (!n) { document.getElementById("cmN").focus(); return; }
    customs.push({
      id: "cm" + Date.now(),
      n,
      ic: document.getElementById("cmIc").value.trim() || "⭐",
      p: st.sub,
      s: document.getElementById("cmS").value,
      c: Math.max(1, +document.getElementById("cmC").value || 1),
      t: "Custom mission"
    });
  }
  else if (b.dataset.ee) st.evEdit = !st.evEdit;
  else if (b.dataset.eh) tog(st.evHide, b.dataset.eh);
  else if (b.dataset.ep) tog(st.evPin, b.dataset.ep);
  else if (b.dataset.open) { st.activeChar = b.dataset.open; st.tab = "missions"; }
  else if (b.dataset.gsub) { st.gsub = b.dataset.gsub; st.gEdit = null; }
  else if (b.dataset.gk) {
    const g = goals.find(x => x.id === b.dataset.gk);
    if (!g) return;
    const c = st.activeChar, m = gmax(g), d = b.dataset.d;
    const v = d === "all" ? m : Math.min(m, Math.max(0, gval(g, c) + +d));
    g.ty === "l" ? (g.v = v) : S.set(gkey(g, c), v);
  }
  else if (b.dataset.ga) {
    const a = b.dataset.ga, g = goals.find(x => x.id === b.dataset.gid);
    if (a === "tpl") {
      const t = TPL[+b.dataset.i];
      goals.push({ id: "g" + Date.now(), n: t[0], ic: t[1], ty: t[2], tg: t[3], sc: t[4], cat: t[5], hi: false, due: "", nt: "", steps: [], v: 0, ch: st.activeChar });
    }
    else if (a === "notpl") st.noTpl = true;
    else if (a === "cancel") st.gEdit = null;
    else if (!g) return;
    else if (a === "edit") st.gEdit = g.id;
    else if (a === "pause") g.pause = !g.pause;
    else if (a === "arch") g.arch = !g.arch;
    else if (a === "del") { if (!confirm("Delete this goal?")) return; goals = goals.filter(x => x !== g); }
    else {
      const sib = goals.filter(x => x.ty === g.ty), k = sib.indexOf(g) + (a === "up" ? -1 : 1);
      if (k < 0 || k >= sib.length) return;
      const i = goals.indexOf(g), j = goals.indexOf(sib[k]);
      [goals[i], goals[j]] = [goals[j], goals[i]];
    }
  }
  else if (b.id === "gAdd") {
    const $ = i => document.getElementById(i);
    const n = $("gN").value.trim();
    if (!n) { $("gN").focus(); return; }
    const o = {
      n, ic: $("gI").value.trim() || "🎯", ty: $("gT").value,
      tg: Math.max(1, +$("gG").value || 1), sc: $("gS").value, cat: $("gC").value,
      hi: $("gH").checked, due: $("gD").value, nt: $("gO").value.trim()
    };
    const old = goals.find(g => g.id === st.gEdit);
    const names = $("gP").value.split(",").map(x => x.trim()).filter(Boolean);
    o.steps = o.ty === "l" ? names.map(x => ({ x, d: !!old?.steps?.find(z => z.x === x && z.d) })) : [];
    if (old) Object.assign(old, o);
    else goals.push({ id: "g" + Date.now(), v: 0, ch: st.activeChar, ...o });
    st.gEdit = null;
    st.gsub = o.ty;
  }
  else if (b.id === "nAdd") notes.push({ id: "n" + Date.now(), tx: "", c: NC[notes.length % NC.length] });
  else if (b.dataset.nc) {
    const [id, col] = b.dataset.nc.split("|");
    const n = notes.find(x => x.id === id);
    if (n) n.c = col;
  }
  else if (b.dataset.nd) {
    const n = notes.find(x => x.id === b.dataset.nd);
    if (n && n.tx && !confirm("Delete this note?")) return;
    notes = notes.filter(x => x !== n);
  }
  else if (b.id === "bkEx") {
    const o = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (/^(devaion_|d2\||g\||a2)/.test(k)) o[k] = localStorage.getItem(k);
      }
    } catch {}
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(o)], { type: "application/json" }));
    a.download = "devaion-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    return;
  }
  else if (b.id === "bkIm") { document.getElementById("bkF").click(); return; }
  else return;

  persist();
  render();
});

document.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.nid) {
    const n = notes.find(x => x.id === t.dataset.nid);
    if (n) { n.tx = t.value; persist(); }
  }
});

document.addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.st) {
    const [id, i] = t.dataset.st.split("|");
    const g = goals.find(x => x.id === id);
    if (g) { g.steps[+i].d = t.checked; persist(); render(); }
  }
  else if (t.dataset.gs) {
    const r = roster.find(x => x.id === t.dataset.gs);
    if (r) { r.gs = +t.value || 0; persist(); render(); }
  }
  else if (t.id === "gF") { st.gcat = t.value; persist(); render(); }
  else if (t.id === "gArch") { st.showArch = t.checked; persist(); render(); }
  else if (t.id === "bkF" && t.files[0]) {
    t.files[0].text().then(x => {
      try {
        const o = JSON.parse(x);
        Object.keys(o).forEach(k => { if (/^(devaion_|d2\||g\||a2)/.test(k)) S.set(k, o[k]); });
        location.reload();
      } catch { alert("That file isn't a valid backup."); }
    });
  }
});

// Boot
applyOdyleTicks();
render();
setInterval(tick, 1000);

console.log("%cDevaion v5.1 — Desktop", "color:#ff2a44;font-weight:bold");
console.log("Supabase:", hasSupabase ? "configured" : "local only");
