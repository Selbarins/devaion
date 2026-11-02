/** Missions + Goals tab — unified missions */
import { getSt, getRoster } from "../state.js";
import { getAllMissions, ordered, dis, hid, prog, card } from "../missions.js";
import { drawGoals } from "./goalsView.js";
import { esc } from "../helpers.js";

const MISSION_EMOJIS = ["⭐", "🎯", "📜", "⚔", "🗡", "💰", "🔥", "🏛", "🌑", "💠", "🎁", "🌀", "🗼", "⏱", "⚗", "🛒", "🔮", "🗺", "🛡", "🌀"];

const TICKET_OPTIONS = [
  { value: "", label: "— None —" },
  { value: "nightmare", label: "Nightmare" },
  { value: "ascension", label: "Ascension" },
  { value: "shugo", label: "Shugo Keys" },
  { value: "dim", label: "Dimensional" }
];

function ticketSelect(id, current) {
  return `
    <select id="${id}">
      ${TICKET_OPTIONS.map(o =>
        `<option value="${o.value}" ${(current || "") === o.value ? "selected" : ""}>${o.label}</option>`
      ).join("")}
    </select>`;
}

export function drawMissions(app) {
  const st = getSt();
  const roster = getRoster();

  const viewToggle = `
    <div class="ctrl-bar" style="margin-bottom:14px">
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
    <div class="char-picker" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;align-items:center">
      <span class="tip" style="margin-right:4px">Character:</span>
      ${roster.map(c => `
        <button type="button" data-c="${c.id}" class="btn-sm char-pick ${c.id === st.activeChar ? "on" : ""}"
          style="${c.id === st.activeChar ? `border-color:${c.color};box-shadow:0 0 0 1px ${c.color}55` : ""}">
          <span class="char-dot" style="background:${c.color};width:8px;height:8px;display:inline-block;border-radius:50%;margin-right:6px;vertical-align:middle"></span>
          ${esc(c.name)}${c.role === "main" ? " · Main" : ""}
        </button>
      `).join("")}
    </div>`;

  const all = ordered(getAllMissions().filter(i => i.p === st.sub));
  const L = st.mEdit ? all : all.filter(i => !dis(i) && !hid(i));
  const pct = prog(st.sub);

  // ----- Unified form (create or edit) -----
  const editing = st.editMissionId
    ? getAllMissions().find(m => m.id === st.editMissionId)
    : null;

  const pre = st.cmPrefill || {};
  const isEditing = !!editing;
  const showForm = st.mEdit || st.cmPrefill || isEditing;

  const ic = editing?.ic || pre.ic || "⭐";
  const title = editing?.n || pre.n || "";
  const scope = editing?.s || pre.s || "char";
  const period = editing?.p || pre.p || st.sub;
  const count = editing?.c || pre.c || 1;
  const tip = editing?.t || pre.t || "";
  const ch = editing?.ch || pre.ch || "";
  const consumes = editing?.consumes || pre.consumes || "";
  const amount = editing?.consumesAmount || pre.consumesAmount || 1;

  const formHtml = showForm ? `
    <div class="custom-form" style="margin-bottom:16px;padding:14px;border:1px solid var(--line);border-radius:var(--radius);background:var(--card)">
      <div class="tip" style="margin-bottom:10px">${isEditing ? `Editing: <b>${esc(editing.n)}</b>` : "New Mission"}</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end">
        <div style="display:flex;flex-direction:column;gap:6px">
          <label class="tip">Icon</label>
          <div style="display:flex;gap:6px;align-items:center">
            <button type="button" id="cmEmojiBtn" class="btn-sm">${ic}</button>
            <input type="hidden" id="cmIc" value="${esc(ic)}">
          </div>
          <div id="cmEmojiPanel" hidden style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;max-width:220px">
            ${MISSION_EMOJIS.map(e =>
              `<button type="button" class="btn-sm emoji-pick ${e === ic ? "on" : ""}" data-cm-emoji="${e}">${e}</button>`
            ).join("")}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:160px">
          <label class="tip">Title</label>
          <input type="text" id="cmN" value="${esc(title)}" placeholder="Mission name" maxlength="40" style="width:100%">
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label class="tip">Frequency</label>
          <select id="cmP">
            <option value="d" ${period === "d" ? "selected" : ""}>Daily</option>
            <option value="w" ${period === "w" ? "selected" : ""}>Weekly</option>
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label class="tip">Scope</label>
          <select id="cmS">
            <option value="char" ${scope === "char" ? "selected" : ""}>Per Character</option>
            <option value="shared" ${scope === "shared" ? "selected" : ""}>Shared</option>
            <option value="main" ${scope === "main" ? "selected" : ""}>Main Only</option>
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label class="tip">Only character</label>
          <select id="cmCh">
            <option value="">— Any —</option>
            ${roster.map(r =>
              `<option value="${r.id}" ${ch === r.id ? "selected" : ""}>${esc(r.name)}</option>`
            ).join("")}
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label class="tip">Count</label>
          <input type="number" id="cmC" value="${count}" min="1" max="99" style="width:64px">
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label class="tip">Ticket</label>
          ${ticketSelect("cmConsumes", consumes)}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label class="tip">Amount</label>
          <input type="number" id="cmAmount" value="${amount}" min="1" max="20" style="width:56px">
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:140px">
          <label class="tip">Note</label>
          <input type="text" id="cmT" value="${esc(tip)}" placeholder="Optional tip" maxlength="80" style="width:100%">
        </div>
        <input type="hidden" id="cmGoalId" value="${esc(editing?.goalId || pre.goalId || "")}">
        <div style="display:flex;gap:8px;align-items:flex-end;padding-bottom:2px">
          <button type="button" id="cmSave" class="btn-sm on">${isEditing ? "Save" : "+ Add"}</button>
          <button type="button" id="cmCancel" class="btn-sm">Cancel</button>
        </div>
      </div>
    </div>` : "";

  app.innerHTML = viewToggle + `
    <div class="missions-panel">
      ${charBar}
      <div class="ctrl-bar" style="margin-bottom:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <div class="seg">
          <button type="button" data-s="d" class="${st.sub === "d" ? "on" : ""}">Daily</button>
          <button type="button" data-s="w" class="${st.sub === "w" ? "on" : ""}">Weekly</button>
        </div>
        <div class="prog-bar" style="flex:1;min-width:120px;height:6px;background:var(--bg3);border-radius:4px;overflow:hidden">
          <i style="display:block;height:100%;width:${pct}%;background:var(--cyan);border-radius:4px"></i>
        </div>
        <span class="tip">${pct}%</span>
        <button type="button" data-me class="btn-sm ${st.mEdit ? "on" : ""}">${st.mEdit ? "Done" : "Edit"}</button>
        ${st.mEdit ? `<button type="button" id="cmNew" class="btn-sm">+ New</button>` : ""}
      </div>
      ${formHtml}
      <div>${L.map(i => card(i, st.mEdit)).join("") || '<p class="tip" style="padding:14px 0">No Missions For This Character.</p>'}</div>
    </div>`;
}
