/** Missions + Goals tab — unified missions (compact) */
import { getSt, getRoster } from "../state.js";
import { getAllMissions, ordered, dis, hid, prog, card } from "../missions.js";
import { drawGoals } from "./goalsView.js";
import { esc } from "../helpers.js";

const MISSION_EMOJIS = [
  "⭐","🎯","📜","⚔","🗡","💰","🔥","🏛","🌑","💠",
  "🎁","🌀","🗼","⏱","⚗","🛒","🔮","🗺","🛡","🚨",
  "📅","💠","🎁","🕳","⚔","⚗","🛒","🔮","🗺","🛡"
];
// unique only
const EMOJIS = [...new Set(MISSION_EMOJIS)];

const TICKET_OPTIONS = [
  { value: "", label: "— None —" },
  { value: "nightmare", label: "Nightmare" },
  { value: "ascension", label: "Ascension" },
  { value: "shugo", label: "Shugo Keys" },
  { value: "dim", label: "Dimensional" }
];

function ticketSelect(id, current) {
  return `
    <select id="${id}" style="min-width:110px">
      ${TICKET_OPTIONS.map(o =>
        `<option value="${o.value}" ${(current || "") === o.value ? "selected" : ""}>${o.label}</option>`
      ).join("")}
    </select>`;
}

export function drawMissions(app) {
  const st = getSt();
  const roster = getRoster();

  const viewToggle = `
    <div class="ctrl-bar" style="margin-bottom:12px">
      <div class="seg">
        <button type="button" data-mview="missions" class="${st.mview !== "goals" ? "on" : ""}">Missions</button>
        <button type="button" data-mview="goals" class="${st.mview === "goals" ? "on" : ""}">Goals</button>
      </div>
    </div>`;

  if (st.mview === "goals") {
    const wrap = document.createElement("div");
    drawGoals(wrap);
    app.innerHTML = viewToggle + wrap.innerHTML;
    return;
  }

  const charBar = `
    <div class="char-picker" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;align-items:center">
      <span class="tip" style="margin-right:2px">Character:</span>
      ${roster.map(c => `
        <button type="button" data-c="${c.id}" class="btn-sm char-pick ${c.id === st.activeChar ? "on" : ""}"
          style="${c.id === st.activeChar ? `border-color:${c.color};box-shadow:0 0 0 1px ${c.color}55` : ""}">
          <span class="char-dot" style="background:${c.color};width:7px;height:7px;display:inline-block;border-radius:50%;margin-right:5px;vertical-align:middle"></span>
          ${esc(c.name)}${c.role === "main" ? " · Main" : ""}
        </button>
      `).join("")}
    </div>`;

  const all = ordered(getAllMissions().filter(i => i.p === st.sub));
  const L = st.mEdit ? all : all.filter(i => !dis(i) && !hid(i));
  const pct = prog(st.sub);

  // ----- Form state -----
  const editing = st.editMissionId
    ? getAllMissions().find(m => m.id === st.editMissionId)
    : null;
  const pre = st.cmPrefill || {};
  const isEditing = !!editing;
  const showForm = !!(st.editMissionId || st.cmPrefill);

  const ic = editing?.ic || pre.ic || "⭐";
  const title = editing?.n || pre.n || "";
  const scope = editing?.s || pre.s || "char";
  const period = editing?.p || pre.p || st.sub;
  const count = editing?.c || pre.c || 1;
  const tip = editing?.t || pre.t || "";
  const ch = editing?.ch || pre.ch || "";
  const consumes = editing?.consumes || pre.consumes || "";
  const amount = editing?.consumesAmount || pre.consumesAmount || 1;

  // ----- Compact form (no bottom buttons) -----
  const formHtml = showForm ? `
    <div class="custom-form" style="margin-bottom:12px;padding:10px 12px;border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--card)">
      <div class="tip" style="margin-bottom:8px;font-size:12px">${isEditing ? `Editing · <b>${esc(editing.n)}</b>` : "New Mission"}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px 10px;align-items:flex-end">
        <div style="display:flex;flex-direction:column;gap:4px;position:relative">
          <label class="tip" style="font-size:11px">Icon</label>
          <button type="button" id="cmEmojiBtn" class="btn-sm" style="width:36px;height:32px;padding:0;font-size:16px;line-height:1">${ic}</button>
          <input type="hidden" id="cmIc" value="${esc(ic)}">
            <div id="cmEmojiPanel"
            style="display:none;position:absolute;top:100%;left:0;z-index:20;margin-top:4px;
                   grid-template-columns:repeat(8,28px);gap:2px;
                   padding:6px;background:var(--bg2);border:1px solid var(--line);
                   border-radius:var(--radius-sm);box-shadow:0 8px 24px rgba(0,0,0,.45)">
            ${EMOJIS.map(e =>
              `<button type="button" class="btn-sm emoji-pick ${e === ic ? "on" : ""}"
                data-cm-emoji="${e}"
                style="width:28px;height:28px;padding:0;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center">${e}</button>`
            ).join("")}
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:4px;flex:1;min-width:140px">
          <label class="tip" style="font-size:11px">Title</label>
          <input type="text" id="cmN" value="${esc(title)}" placeholder="Mission name" maxlength="40" style="width:100%;height:32px">
        </div>

        <div style="display:flex;flex-direction:column;gap:4px">
          <label class="tip" style="font-size:11px">Freq</label>
          <select id="cmP" style="height:32px">
            <option value="d" ${period === "d" ? "selected" : ""}>Daily</option>
            <option value="w" ${period === "w" ? "selected" : ""}>Weekly</option>
          </select>
        </div>

        <div style="display:flex;flex-direction:column;gap:4px">
          <label class="tip" style="font-size:11px">Scope</label>
          <select id="cmS" style="height:32px">
            <option value="char" ${scope === "char" ? "selected" : ""}>Per Char</option>
            <option value="shared" ${scope === "shared" ? "selected" : ""}>Shared</option>
            <option value="main" ${scope === "main" ? "selected" : ""}>Main Only</option>
          </select>
        </div>

        <div style="display:flex;flex-direction:column;gap:4px">
          <label class="tip" style="font-size:11px">Char</label>
          <select id="cmCh" style="height:32px;min-width:90px">
            <option value="">Any</option>
            ${roster.map(r =>
              `<option value="${r.id}" ${ch === r.id ? "selected" : ""}>${esc(r.name)}</option>`
            ).join("")}
          </select>
        </div>

        <div style="display:flex;flex-direction:column;gap:4px">
          <label class="tip" style="font-size:11px">Count</label>
          <input type="number" id="cmC" value="${count}" min="1" max="99" style="width:52px;height:32px">
        </div>

        <div style="display:flex;flex-direction:column;gap:4px">
          <label class="tip" style="font-size:11px">Ticket</label>
          ${ticketSelect("cmConsumes", consumes)}
        </div>

        <div style="display:flex;flex-direction:column;gap:4px">
          <label class="tip" style="font-size:11px">Amt</label>
          <input type="number" id="cmAmount" value="${amount}" min="1" max="20" style="width:48px;height:32px">
        </div>

        <div style="display:flex;flex-direction:column;gap:4px;flex:1;min-width:120px">
          <label class="tip" style="font-size:11px">Note</label>
          <input type="text" id="cmT" value="${esc(tip)}" placeholder="Optional" maxlength="80" style="width:100%;height:32px">
        </div>

        <input type="hidden" id="cmGoalId" value="${esc(editing?.goalId || pre.goalId || "")}">
      </div>
    </div>` : "";

  // ----- Top actions (compact) -----
  let topActions = "";
  if (st.mEdit) {
    if (showForm) {
      topActions = `
        <button type="button" id="cmSave" class="btn-sm on">Save</button>
        <button type="button" id="cmCancel" class="btn-sm">Cancel</button>
        <button type="button" data-me="1" class="btn-sm on">Done</button>`;
    } else {
      topActions = `
        <button type="button" id="cmNew" class="btn-sm">+</button>
        <button type="button" data-me="1" class="btn-sm on">Done</button>`;
    }
  } else {
    topActions = `<button type="button" data-me="1" class="btn-sm">Edit</button>`;
  }

  app.innerHTML = viewToggle + `
    <div class="missions-panel">
      ${charBar}
      <div class="ctrl-bar" style="margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <div class="seg">
          <button type="button" data-s="d" class="${st.sub === "d" ? "on" : ""}">Daily</button>
          <button type="button" data-s="w" class="${st.sub === "w" ? "on" : ""}">Weekly</button>
        </div>
        <div class="prog-bar" style="flex:1;min-width:100px;height:5px;background:var(--bg3);border-radius:4px;overflow:hidden">
          <i style="display:block;height:100%;width:${pct}%;background:var(--cyan);border-radius:4px"></i>
        </div>
        <span class="tip" style="font-size:12px">${pct}%</span>
        ${topActions}
      </div>
      ${formHtml}
      <div>${L.map(i => card(i, st.mEdit)).join("") || '<p class="tip" style="padding:12px 0">No Missions For This Character.</p>'}</div>
    </div>`;
}
