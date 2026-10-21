/**
 * Devaion · Aion 2 Tracker — entry point
 */
import { hasSupabase, getSyncStatus, S } from "./storage.js";
import {
  getSt, getRoster, setRoster, getGoals, setGoals, getNotes, setNotes,
  getCustoms, setCustoms, activeChar, persist
} from "./state.js";
import { CHAR_COLORS, NC } from "./data.js";
import { tog, fmt, lastReset, pk, esc, fmtShort } from "./helpers.js";
import { applyOdyleTicks, setOdyleVal, getOdyleVal, nextUtcTick } from "./odyle.js";
import { getAllMissions, max, val, key, ordered, prog } from "./missions.js";
import { gval, gmax, gkey, createOrUpdateGoalFromForm } from "./goals.js";
import { drawMissions } from "./ui/missionsView.js";
import { drawEvents } from "./ui/eventsView.js";
import { drawHub } from "./ui/hubView.js";

const TABS = [
  ["hub", "💠", "Overview"],
  ["missions", "📜", "Missions"],
  ["events", "⏱", "Events"]
];

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
          <span class="logo-mark">◇</span>
          <span class="logo-text">DEV<span>AION</span></span>
        </div>
        <nav class="side-nav">
          ${TABS.map(([k, icon, label]) =>
            `<button type="button" data-t="${k}" class="${st.tab === k ? "on" : ""}"><span class="icon">${icon}</span>${label}</button>`
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
            ${hasSupabase ? (sync === "synced" ? "● Cloud Synced" : sync === "syncing" ? "● Syncing…" : "● Cloud Ready") : "○ Local Only"}
          </div>
          <div>v5.4 · Desktop</div>
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
  }
}

document.addEventListener("click", e => {
  const b = e.target.closest("button, .char-item");
  if (!b) return;
  const st = getSt();
  let roster = getRoster();
  let goals = getGoals();
  let notes = getNotes();
  let customs = getCustoms();

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
    const n = document.getElementById("cmN").value.trim();
    if (!n) { document.getElementById("cmN").focus(); return; }
    customs.push({
      id: "cm" + Date.now(), n,
      ic: document.getElementById("cmIc").value.trim() || "⭐",
      p: st.sub, s: document.getElementById("cmS").value,
      c: Math.max(1, +document.getElementById("cmC").value || 1), t: "Custom Mission"
    });
    setCustoms(customs);
  } else if (b.dataset.ee) {
    st.evEdit = !st.evEdit;
  } else if (b.dataset.eh) {
    tog(st.evHide, b.dataset.eh);
  } else if (b.dataset.ep) {
    tog(st.evPin, b.dataset.ep);
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
      st.mview = "missions"; st.mEdit = true;
      st.sub = g.ty === "w" ? "w" : "d";
      customs.push({
        id: "cm" + Date.now(), n: "Work on: " + g.n, ic: "🎯",
        p: st.sub, s: g.sc === "all" ? "shared" : "char", c: 1,
        t: "Helps goal: " + g.n, goalId: g.id
      });
      setCustoms(customs);
    } else if (!g) return;
    else if (a === "edit") { st.gEdit = g.id; st.showGoalForm = true; }
    else if (a === "pause") g.pause = !g.pause;
    else if (a === "arch") g.arch = !g.arch;
    else if (a === "del") { goals = goals.filter(x => x !== g); setGoals(goals); }
  } else if (b.id === "gAdd") {
    const neu = createOrUpdateGoalFromForm();
    if (!neu) return;
    st.gEdit = null; st.showGoalForm = false;
    st.gsub = neu.ty; st.gCharFilter = "all"; st.gcat = "All";
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

applyOdyleTicks();
render();
setInterval(tick, 1000);
