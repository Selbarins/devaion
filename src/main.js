/**
 * Devaion · Aion 2 Tracker — entry point
 */
import { initAuth, getUser, onAuthChange, signInWithDiscord, signOut } from "./auth.js";
import { hasSupabase, getSyncStatus, S, localGet, loadAll, saveAll } from "./storage.js";
import {
  getSt, getRoster, setRoster, getGoals, setGoals, getNotes, setNotes,
  getCustoms, setCustoms, activeChar, persist
} from "./state.js";
import { CHAR_COLORS, NC, SIEGE_DAYS } from "./data.js";   // ← added SIEGE_DAYS
import { tog, fmt, lastReset, pk, esc, fmtShort } from "./helpers.js";
import { applyOdyleTicks, setOdyleVal, getOdyleVal, nextUtcTick } from "./odyle.js";
import { getAllMissions, getBaseMissions, setBaseMissions, max, val, key, ordered, prog } from "./missions.js";
import { applyTicketTicks } from "./tickets.js";
import { gval, gmax, gkey, createOrUpdateGoalFromForm } from "./goals.js";
import { drawMissions } from "./ui/missionsView.js";
import { drawEvents } from "./ui/eventsView.js";
import { drawHub } from "./ui/hubView.js";
import { initNotifications, scheduleEventNotifications } from "./notifications.js";


function drawLogin() {
  const root = document.getElementById("app");

  root.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-logo">
          <svg class="logo-svg" viewBox="0 0 64 64" width="110" height="110" aria-hidden="true">
            <defs>
              <linearGradient id="wingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#2ee6ff"/>
                <stop offset="50%" stop-color="#c084fc"/>
                <stop offset="100%" stop-color="#ff3b5c"/>
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="1.6" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <path class="wing left outer" fill="url(#wingGrad)" filter="url(#glow)" d="M32 32 C20 26 8 14 4 4 C12 12 20 22 30 28 C24 18 14 8 10 2 C18 12 26 24 32 32 Z"/>
            <path class="wing left mid" fill="url(#wingGrad)" opacity="0.85" d="M32 32 C22 28 12 18 8 10 C14 16 22 24 30 30 C26 20 18 12 14 6 C20 14 27 24 32 32 Z"/>
            <path class="wing left inner" fill="url(#wingGrad)" opacity="0.65" d="M32 32 C24 30 16 22 12 14 C17 19 23 26 30 30 C26 22 20 14 17 10 C22 17 27 25 32 32 Z"/>
            <path class="wing right outer" fill="url(#wingGrad)" filter="url(#glow)" d="M32 32 C44 26 56 14 60 4 C52 12 44 22 34 28 C40 18 50 8 54 2 C46 12 38 24 32 32 Z"/>
            <path class="wing right mid" fill="url(#wingGrad)" opacity="0.85" d="M32 32 C42 28 52 18 56 10 C50 16 42 24 34 30 C38 20 46 12 50 6 C44 14 37 24 32 32 Z"/>
            <path class="wing right inner" fill="url(#wingGrad)" opacity="0.65" d="M32 32 C40 30 48 22 52 14 C47 19 41 26 34 30 C38 22 44 14 47 10 C42 17 37 25 32 32 Z"/>
            <circle cx="32" cy="32" r="5" fill="#f0f4ff" filter="url(#glow)"/>
            <circle cx="32" cy="32" r="2.4" fill="#2ee6ff"/>
          </svg>
        </div>

        <div class="login-error" id="loginError"></div>

        <button type="button" class="btn-discord" id="discordLoginBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          Login with Discord
        </button>
      </div>
    </div>`;

  const btn = document.getElementById("discordLoginBtn");
  const errorEl = document.getElementById("loginError");

  btn.onclick = async () => {
    errorEl.classList.remove("show");
    btn.disabled = true;
    btn.textContent = "Redirecting…";

    try {
      await signInWithDiscord();
    } catch (err) {
      errorEl.textContent = err.message || "Login failed";
      errorEl.classList.add("show");
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        Login with Discord`;
    }
  };
}
const TABS = [
  ["hub", "💠", "Overview"],
  ["missions", "📜", "Missions"],
  ["events", "⏱", "Events"]
];
// Apply saved theme as early as possible
document.documentElement.setAttribute("data-theme", getSt().theme || "default");

// Siege / corridor reset (runs near 00:00 UTC on Mon/Thu/Sat)
function checkSiegeReset() {
  const now = new Date();
  // Only check in the first couple of minutes after midnight UTC
  if (now.getUTCHours() !== 0 || now.getUTCMinutes() > 3) return;

  const day = now.getUTCDay(); // 0=Sun … 6=Sat
  if (!SIEGE_DAYS.includes(day)) return;

  const today = now.toISOString().slice(0, 10);
  if (S.get("a2corr_last_reset") === today) return;

  S.set("a2corr_won", "0");
  S.set("a2corr_last_reset", today);
  // Optional: also clear corridor progress keys if you want a full reset
}
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

function render() {
  const st = getSt();
  const roster = getRoster();
  const root = document.getElementById("app");
  const char = activeChar();
  const sync = getSyncStatus();

  root.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="logo" title="Devaion">
          <svg class="logo-svg" viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
            <defs>
              <linearGradient id="wingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#2ee6ff"/>
                <stop offset="50%" stop-color="#c084fc"/>
                <stop offset="100%" stop-color="#ff3b5c"/>
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="1.6" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <path class="wing left outer" fill="url(#wingGrad)" filter="url(#glow)" d="M32 32 C20 26 8 14 4 4 C12 12 20 22 30 28 C24 18 14 8 10 2 C18 12 26 24 32 32 Z"/>
            <path class="wing left mid" fill="url(#wingGrad)" opacity="0.85" d="M32 32 C22 28 12 18 8 10 C14 16 22 24 30 30 C26 20 18 12 14 6 C20 14 27 24 32 32 Z"/>
            <path class="wing left inner" fill="url(#wingGrad)" opacity="0.65" d="M32 32 C24 30 16 22 12 14 C17 19 23 26 30 30 C26 22 20 14 17 10 C22 17 27 25 32 32 Z"/>
            <path class="wing right outer" fill="url(#wingGrad)" filter="url(#glow)" d="M32 32 C44 26 56 14 60 4 C52 12 44 22 34 28 C40 18 50 8 54 2 C46 12 38 24 32 32 Z"/>
            <path class="wing right mid" fill="url(#wingGrad)" opacity="0.85" d="M32 32 C42 28 52 18 56 10 C50 16 42 24 34 30 C38 20 46 12 50 6 C44 14 37 24 32 32 Z"/>
            <path class="wing right inner" fill="url(#wingGrad)" opacity="0.65" d="M32 32 C40 30 48 22 52 14 C47 19 41 26 34 30 C38 22 44 14 47 10 C42 17 37 25 32 32 Z"/>
            <circle cx="32" cy="32" r="5" fill="#f0f4ff" filter="url(#glow)"/>
            <circle cx="32" cy="32" r="2.4" fill="#2ee6ff"/>
          </svg>
        </div>
        <nav class="side-nav">
          ${TABS.map(([k, icon, label]) =>
            `<button type="button" data-t="${k}" class="${st.tab === k ? "on" : ""}"><span class="icon">${icon}</span>${label}</button>`
          ).join("")}
        </nav>
        <div class="side-footer">
          <div class="sync-pill ${hasSupabase ? (sync === "error" ? "warn" : "ok") : ""}">
            ${hasSupabase
              ? (sync === "synced" ? "● Cloud Synced" : sync === "syncing" ? "● Syncing…" : "● Cloud Ready")
              : "○ Local Only"}
          </div>
          <button type="button" class="btn-sm" id="logoutBtn" style="width:100%; margin-top:8px;">
            Sign out
          </button>
          <div style="margin-top:6px;">v5.5 · Desktop</div>
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
    </div>`;

  const view = document.getElementById("view");
  if (st.tab === "missions") drawMissions(view);
  else if (st.tab === "events") drawEvents(view);
  else if (st.tab === "hub") drawHub(view, { onRender: render });
  tick();
}

function tick() {
  const n = new Date();
  applyTicketTicks();

  // Apply Odyle ticks live (so energy updates when a UTC tick is crossed without a full re-render)
  const before = +S.get("a2oe_last_tick") || 0;
  applyOdyleTicks();
  const after = +S.get("a2oe_last_tick") || 0;
  if (after > before && getSt().tab === "hub") {
    render(); // refresh battery values when a tick actually applied
    return;
  }

  for (const [p, id, len] of [["d", "d", 864e5], ["w", "w", 6048e5]]) {
    const last = lastReset(p === "w");
    const nx = new Date(+last + len);
    const el = document.getElementById("c" + id);
    if (el) el.textContent = fmt(nx - n);
    const bar = document.getElementById("p" + id);
    if (bar) bar.style.width = prog(p) + "%";
  }
  if (getSt().tab === "hub") {
    const next = document.getElementById("odyle-next");
    if (next) next.textContent = fmtShort(Math.max(0, nextUtcTick() - Date.now()));

    // Live Overview event countdowns
    document.querySelectorAll("[data-ev-start] .ev-countdown, [data-ev-start].mini-row .ev-countdown, .mini-row[data-ev-start] .ev-countdown").forEach(b => {
      const row = b.closest("[data-ev-start]");
      if (!row) return;
      const s = +row.dataset.evStart;
      const rem = s - Date.now();
      if (rem <= 0) {
        b.textContent = "OPEN";
        b.style.color = "var(--green)";
        row.classList.add("open");
      } else {
        b.textContent = "in " + fmtShort(rem);
        b.style.color = "var(--cyan)";
        row.classList.remove("open");
      }
    });
  }

  // Live Events tab countdowns
  if (getSt().tab === "events") {
    document.querySelectorAll(".event-row[data-ev-start]").forEach(row => {
      const s = +row.dataset.evStart;
      const dur = (+row.dataset.evDur || 0) * 6e4;
      const b = row.querySelector(".ev-countdown");
      if (!b) return;
      const now = Date.now();
      if (now >= s && now < s + dur) {
        b.textContent = "Open · " + fmt(s + dur - now);
        b.className = "status ev-countdown open";
        row.classList.add("open");
      } else if (now < s) {
        const rem = s - now;
        b.textContent = "In " + fmt(rem);
        b.className = "status ev-countdown" + (rem < 36e5 ? " soon" : "");
        row.classList.remove("open");
      } else {
        // Window ended — force a re-render so the next occurrence is computed
        render();
      }
    });
  }

  checkSiegeReset();
}

document.addEventListener("click", e => {
  const b = e.target.closest("button, .char-item");
  if (!b) return;
  const st = getSt();
  let roster = getRoster();
  let goals = getGoals();
  let notes = getNotes();
  let customs = getCustoms();

  if (b.id === "logoutBtn") {
  signOut();
  return;
  }
  if (b.dataset.t) {
    st.tab = b.dataset.t;
    st.editingChar = null;
    st.showGoalForm = false;
    st.gEdit = null;
  } else if (b.dataset.s) {
    st.sub = b.dataset.s;
  } else if (b.dataset.c) {
    st.activeChar = b.dataset.c;
    if (st.tab !== "missions") { st.tab = "missions"; st.mview = "missions"; }
  } else if (b.dataset.k) {
    const it = getAllMissions().find(i => i.id === b.dataset.k);
    if (!it) return;
    const m = max(it);
    let v = val(it);
    v = b.dataset.d === "all" ? m : Math.min(m, Math.max(0, v + +b.dataset.d));
    S.set(key(it), v);
  } else if (b.classList.contains("color-swatch") && b.dataset.color) {
    const pick = b.closest(".color-pick");
    if (pick) {
      pick.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("on"));
      b.classList.add("on");
      const hidden = pick.parentElement.querySelector("input[type=hidden]") ||
        document.getElementById("newColor") || document.getElementById("editColor");
      if (hidden) hidden.value = b.dataset.color;
      return;
    }
  } else if (b.id === "addChar") {
    const name = document.getElementById("newName").value.trim() || "Alt";
    const role = document.getElementById("newRole").value;
    const cls = document.getElementById("newClass").value.trim() || "";
    const color = document.getElementById("newColor")?.value || CHAR_COLORS[roster.length % CHAR_COLORS.length];
    const id = "c" + Date.now();
    if (role === "main") roster.forEach(c => (c.role = "alt"));
    roster.push({ id, name, role, class: cls, gs: +document.getElementById("newGS").value || 0, color });
    setRoster(roster);
    st.activeChar = id;
  } else if (b.dataset.editChar) {
    st.editingChar = b.dataset.editChar;
  } else if (b.dataset.cancelChar) {
    st.editingChar = null;
  } else if (b.dataset.saveChar) {
    const c = roster.find(x => x.id === b.dataset.saveChar);
    if (c) {
      c.name = document.getElementById("editName").value.trim() || c.name;
      c.class = document.getElementById("editClass").value.trim();
      c.gs = +document.getElementById("editGS").value || 0;
      const role = document.getElementById("editRole").value;
      if (role === "main") roster.forEach(x => (x.role = "alt"));
      c.role = role;
      c.color = document.getElementById("editColor")?.value || c.color;
    }
    st.editingChar = null;
  } else if (b.dataset.setActive) {
    st.activeChar = b.dataset.setActive;
  } else if (b.dataset.del) {
    if (roster.length <= 1) return;
    roster = roster.filter(c => c.id !== b.dataset.del);
    setRoster(roster);
    goals = goals.filter(g => g.ch !== b.dataset.del);
    setGoals(goals);
    if (st.activeChar === b.dataset.del) st.activeChar = roster[0].id;
    if (st.editingChar === b.dataset.del) st.editingChar = null;
  } else if (b.dataset.me) {
    st.mEdit = !st.mEdit;
    if (!st.mEdit) st.cmPrefill = null;
  } else if (b.dataset.mv) {
    const ids = ordered(getAllMissions().filter(i => i.p === st.sub)).map(i => i.id);
    const i = ids.indexOf(b.dataset.mv), j = i + +b.dataset.d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    st.ord = ids.concat(st.ord.filter(x => !ids.includes(x)));
  } else if (b.dataset.hd) {
    tog(st.hid, b.dataset.hd);
  } else if (b.dataset.cdel) {
    customs = customs.filter(c => c.id !== b.dataset.cdel);
    setCustoms(customs);
    } else if (b.id === "cmAdd") {
    const n = document.getElementById("cmN")?.value.trim();
    if (!n) { document.getElementById("cmN")?.focus(); return; }
    const p = document.getElementById("cmP")?.value || st.sub;
    const goalId = document.getElementById("cmGoalId")?.value || null;
    customs.push({
      id: "cm" + Date.now(),
      n,
      ic: document.getElementById("cmIc")?.value.trim() || "⭐",
      p,
      s: document.getElementById("cmS")?.value || "char",
      c: Math.max(1, +(document.getElementById("cmC")?.value) || 1),
      t: document.getElementById("cmT")?.value.trim() || (goalId ? "Linked goal" : "Custom Mission"),
      goalId: goalId || null,
      ch: document.getElementById("cmCh")?.value || null
    });
    setCustoms(customs);
    st.sub = p;
    st.cmPrefill = null;
  } else if (b.dataset.bedit) {
    st.baseEditId = b.dataset.bedit;
    st.mEdit = true;
  } else if (b.id === "bmSave") {
    const id = st.baseEditId;
    if (!id) return;
    const list = getBaseMissions();
    const m = list.find(x => x.id === id);
    if (!m) return;

    m.n  = document.getElementById("bmN")?.value.trim() || m.n;
    m.ic = document.getElementById("bmIc")?.value.trim() || m.ic;
    m.t  = document.getElementById("bmT")?.value.trim() || m.t;
    m.c  = Math.max(1, +document.getElementById("bmC")?.value || m.c);
    m.s  = document.getElementById("bmS")?.value || m.s;

    setBaseMissions(list);
    st.baseEditId = null;
  } else if (b.id === "bmCancel") {
    st.baseEditId = null;
  } else if (b.id === "cmCancelPrefill") {
    st.cmPrefill = null;
    st.mEdit = false;
  } else if (b.id === "cmEmojiBtn") {
    const panel = document.getElementById("cmEmojiPanel");
    if (panel) panel.hidden = !panel.hidden;
    return;
  } else if (b.dataset.cmEmoji) {
    const em = b.dataset.cmEmoji;
    const hidden = document.getElementById("cmIc");
    if (hidden) hidden.value = em;
    const btn = document.getElementById("cmEmojiBtn");
    if (btn) btn.textContent = em;
    document.querySelectorAll(".emoji-pick").forEach(el => el.classList.toggle("on", el.dataset.cmEmoji === em));
    const panel = document.getElementById("cmEmojiPanel");
    if (panel) panel.hidden = true;
    return;
  } else if (b.dataset.ee) {
    st.evEdit = !st.evEdit;
  } else if (b.dataset.eh) {
    tog(st.evHide, b.dataset.eh);
  } else if (b.dataset.ep) {
    tog(st.evPin, b.dataset.ep);
  } else if (b.dataset.en) {
    tog(st.evNotify, b.dataset.en);
  } else if (b.dataset.open) {
    st.activeChar = b.dataset.open;
    st.tab = "missions";
    st.mview = "missions";
  } else if (b.dataset.oeAdj) {
    const cid = b.dataset.oeChar || st.activeChar;
    setOdyleVal(cid, getOdyleVal(cid) + +b.dataset.oeAdj);
  } else if (b.dataset.mview) {
    st.mview = b.dataset.mview;
    st.showGoalForm = false; st.gEdit = null; st.mEdit = false;
  } else if (b.dataset.gsub) {
    st.gsub = b.dataset.gsub;
    st.gEdit = null; st.showGoalForm = false;
  } else if (b.id === "toggleGoalForm") {
    st.showGoalForm = !st.showGoalForm;
    st.gEdit = null;
  } else if (b.dataset.gk) {
    const g = goals.find(x => x.id === b.dataset.gk);
    if (!g) return;
    const c = g.sc === "char" && g.ch ? g.ch : st.activeChar;
    const m = gmax(g);
    const d = b.dataset.d;
    const v = d === "all" ? m : Math.min(m, Math.max(0, gval(g, c) + +d));
    if (g.ty === "l") g.v = v; else S.set(gkey(g, c), v);
  } else if (b.dataset.ga) {
    const a = b.dataset.ga;
    const g = goals.find(x => x.id === b.dataset.gid);
    if (a === "cancel") { st.gEdit = null; st.showGoalForm = false; }
    else if (a === "link-mission") {
      if (!g) return;
      st.mview = "missions";
      st.mEdit = true;
      st.sub = "d";
      st.cmPrefill = {
        n: "Work on: " + g.n,
        ic: "🎯",
        p: "d",
        s: g.sc === "all" ? "shared" : "char",
        c: 1,
        t: "Helps goal: " + g.n,
        goalId: g.id,
        ch: g.sc === "char" ? g.ch : null
      };
    } else if (!g) return;
    else if (a === "edit") { st.gEdit = g.id; st.showGoalForm = true; }
    else if (a === "pause") g.pause = !g.pause;
    else if (a === "arch") g.arch = !g.arch;
    else if (a === "del") { goals = goals.filter(x => x !== g); setGoals(goals); }
  } else if (b.id === "gAdd") {
    const neu = createOrUpdateGoalFromForm();
    if (!neu) return;
    st.gEdit = null; st.showGoalForm = false;
    st.gCharFilter = "all"; st.gcat = "All";
  } else if (b.id === "nAdd") {
    notes.push({ id: "n" + Date.now(), tx: "", c: NC[notes.length % NC.length] });
    setNotes(notes);
  } else if (b.dataset.nc) {
    const [id, col] = b.dataset.nc.split("|");
    const n = notes.find(x => x.id === id); if (n) n.c = col;
  } else if (b.dataset.nd) {
    notes = notes.filter(x => x.id !== b.dataset.nd); setNotes(notes);
  } else if (b.id === "bkEx") {
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
    a.click(); return;
    } else if (b.id === "bkIm") {
    document.getElementById("bkF").click(); return;
  } else return;
  persist();
  render();
});

document.addEventListener("input", e => {
  if (e.target.dataset.nid) {
    const n = getNotes().find(x => x.id === e.target.dataset.nid);
    if (n) { n.tx = e.target.value; persist(); }
  }
});

document.addEventListener("change", e => {
  const t = e.target;
  const st = getSt();
  if (t.dataset.st) {
    const [id, i] = t.dataset.st.split("|");
    const g = getGoals().find(x => x.id === id);
    if (g) { g.steps[+i].d = t.checked; persist(); render(); }
  } else if (t.dataset.gs) {
    const r = getRoster().find(x => x.id === t.dataset.gs);
    if (r) { r.gs = +t.value || 0; persist(); render(); }
  } else if (t.id === "gF") { st.gcat = t.value; persist(); render(); }
  else if (t.id === "gCharFilter") { st.gCharFilter = t.value; persist(); render(); }
  else if (t.id === "gS") {
    const ch = document.getElementById("gCh");
    if (ch) ch.disabled = t.value === "all";
  } else if (t.id === "gArch") { st.showArch = t.checked; persist(); render(); }
  else if (t.id === "bkF" && t.files[0]) {
    t.files[0].text().then(x => {
      try {
        const o = JSON.parse(x);
        Object.keys(o).forEach(k => { if (/^(devaion_|d2\||g\||a2)/.test(k)) S.set(k, o[k]); });
        location.reload();
      } catch { alert("Invalid Backup File."); }
    });
  }
});
// Keyboard: ← → switch character | ↑ ↓ switch tab
document.addEventListener("keydown", e => {
  // Ignore when typing in inputs
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;

  const st = getSt();
  const roster = getRoster();
  const tabKeys = ["hub", "missions", "events"];

  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    e.preventDefault();
    const idx = roster.findIndex(c => c.id === st.activeChar);
    if (idx === -1) return;
    const next = e.key === "ArrowRight"
      ? (idx + 1) % roster.length
      : (idx - 1 + roster.length) % roster.length;
    st.activeChar = roster[next].id;
    persist();
    render();
  }

  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
    const idx = tabKeys.indexOf(st.tab);
    if (idx === -1) return;
    const next = e.key === "ArrowDown"
      ? (idx + 1) % tabKeys.length
      : (idx - 1 + tabKeys.length) % tabKeys.length;
    st.tab = tabKeys[next];
    persist();
    render();
  }
});
// ========== BOOT ==========
async function boot() {
  document.documentElement.setAttribute("data-theme", getSt().theme || "default");

  await initAuth();

  onAuthChange(async (user) => {
    if (!user) {
      drawLogin();
      return;
    }

    // ===== Logged in =====
    const data = await loadAll(user.id);

    // Automatic migration: if cloud is empty but local data exists → upload local data
    const hasLocalData =
      localGet("devaion_roster") ||
      localGet("devaion_st") ||
      (localGet("devaion_goals", []).length > 0) ||
      (localGet("devaion_notes", []).length > 0) ||
      (localGet("devaion_customs", []).length > 0);

    const cloudIsEmpty = !data.roster && !data.st && (!data.goals || data.goals.length === 0);

    if (hasLocalData && cloudIsEmpty) {
      console.log("Migrating local data to your account…");
      saveAll(user.id, {
        roster: getRoster(),
        st: getSt(),
        goals: getGoals(),
        notes: getNotes(),
        customs: getCustoms()
      });
    }

    // Apply data to state
    if (data.roster) setRoster(data.roster);
    if (data.st) Object.assign(getSt(), data.st);
    if (data.goals) setGoals(data.goals);
    if (data.notes) setNotes(data.notes);
    if (data.customs) setCustoms(data.customs);

    // Make sure active character still exists
    const roster = getRoster();
    if (!roster.find(c => c.id === getSt().activeChar)) {
      getSt().activeChar = roster[0]?.id || "c1";
    }

    // Now show the real app
    applyOdyleTicks();
    applyTicketTicks();
    render();
    initNotifications().then(() => {
      scheduleEventNotifications();
      setInterval(scheduleEventNotifications, 30 * 60 * 1000);
    });
    setInterval(tick, 1000);
  });
}

boot();
