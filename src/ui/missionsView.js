/** Missions + Goals tab shell */
import { getSt, getRoster, activeChar } from "../state.js";
import { getAllMissions, getBaseMissions, ordered, dis, hid, prog, card } from "../missions.js";
import { drawGoals } from "./goalsView.js";
import { esc } from "../helpers.js";

const MISSION_EMOJIS = ["⭐", "🎯", "📜", "⚔", "🗡", "💰", "🔥", "🏛", "🌑", "💠", "🎁", "🌀"];

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
        `<option value="${o.value}" ${current === o.value ? "selected" : ""}>${o.label}</option>`
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

  const pre = st.cmPrefill || {};
  const showForm = st.mEdit || st.cmPrefill;
  const ic = pre.ic || "⭐";
  const title = pre.n || "";
  const scope = pre.s || "char";
  const period = pre.p || st.sub;
  const count = pre.c || 1;
  const tip = pre.t || "";
  const preConsumes = pre.consumes || "";
  const preAmount = pre.consumesAmount || 1;

  // ---- Base mission edit form (unified fields) ----
  const editingBase = st.baseEditId ? getBaseMissions().find(m => m.id === st.baseEditId) : null;

  const baseEditForm = editingBase ? `
    <div class="custom-form" style="margin-bottom:16px;padding:14px;border:1px solid var(--line);border-radius:var(--radius);background:var(--card)">
      <div class="tip" style="margin-bottom:10px">Editing base mission: <b>${esc(editingBase.n)}</b></div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end">
        <div style="display:flex;flex-direction:column;gap:6px">
          <label class="tip">Icon</label>
          <input type="text" id="bmIc" value="${esc(editingBase.ic || "")}" maxlength="4" style="width:52px">
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:160px">
          <label class="tip">Title</label>
          <input type="text" id="bmN" value="${esc(editingBase.n)}" maxlength="40" style="width:100%">
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label class="tip">Scope</label>
          <select id="bmS">
            <option value="char" ${editingBase.s === "char" ? "selected" : ""}>Per Character</option>
            <option value="shared" ${editingBase.s === "shared" ? "selected" : ""}>Shared</option>
            <option value="main" ${editingBase.s === "main" ? "selected" : ""}>Main Only</option>
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label class="tip">Count</label>
          <input type="number" id="bmC" value="${editingBase.c || 1}" min="1" max="99" style="width:64px">
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label class="tip">Ticket</label>
          ${ticketSelect("bmConsumes", editingBase.consumes || "")}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label class="tip">Amount</label>
          <input type="number" id="bmAmount" value="${editingBase.consumesAmount || 1}" min="1" max="20" style="width:56px">
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:140px">
          <label class="tip">Note</label>
          <input type="text" id="bmT" value="${esc(editingBase.t || "")}" maxlength="80" style="width:100%">
        </div>
        <div style="display:flex;gap:8px;align-items:flex-end">
          <button type="button" id="bmSave" class="btn-sm on">Save</button>
          <button type="button" id="bmCancel" class="btn-sm">Cancel</button>
        </div>
      </div>
    </div>` : "";

  // ---- Custom mission form ----
  const customForm = showForm && !editingBase ? `
    <div class="custom-form" style="margin-bottom:16px;padding:14px;border:1px solid var(--line);border-radius:var(--radius);background:var(--card)">
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end">
        <div style="display:flex;flex-direction:column;gap:6px">
          <label class="tip">Icon</label>
          <div style="display:flex;gap:6px;align-items:center">
            <button type="button" id="cmEmojiBtn" class="btn-sm">${ic}</button>
            <input type="hidden" id="cmIc" value="${esc(ic)}">
          </div>
          <div id="cmEmojiPanel" hidden style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">
            ${MISSION_EMOJIS.map(e =>
              `<button type="button" class="btn-sm emoji-pick ${e === ic ? "on" : ""}" data-cm-emoji="${e}">${e}</button>`
            ).join("")}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:160px">
          <label class="tip">Title</label>
          <input type="text" id="cmN" value="${esc(title)}" placeholder="Custom Mission Name" maxlength="40" style="width:100%">
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
            <option value="">— Any (use scope) —</option>
            ${roster.map(r =>
              `<option value="${r.id}" ${(pre.ch || "") === r.id ? "selected" : ""}>${esc(r.name)}</option>`
            ).join("")}
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label class="tip">Count</label>
          <input type="number" id="cmC" value="${count}" min="1" max="99" style="width:64px">
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label class="tip">Ticket</label>
          ${ticketSelect("cmConsumes", preConsumes)}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label class="tip">Amount</label>
          <input type="number" id="cmAmount" value="${preAmount}" min="1" max="20" style="width:56px">
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:140px">
          <label class="tip">Note</label>
          <input type="text" id="cmT" value="${esc(tip)}" placeholder="Optional tip" maxlength="80" style="width:100%">
        </div>
        <input type="hidden" id="cmGoalId" value="${esc(pre.goalId || "")}">
        <div style="display:flex;gap:8px;align-items:flex-end;padding-bottom:2px">
          <button type="button" id="cmAdd" class="btn-sm on">+ Add Mission</button>
          ${st.cmPrefill ? `<button type="button" id="cmCancelPrefill" class="btn-sm">Cancel</button>` : ""}
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
        <button type="button" data-medit class="btn-sm ${st.mEdit ? "on" : ""}">${st.mEdit ? "Done" : "Edit"}</button>
      </div>
      ${baseEditForm}
      ${customForm}
      <div>${L.map(i => card(i, st.mEdit)).join("") || '<p class="tip" style="padding:14px 0">No Missions For This Character.</p>'}</div>
    </div>`;
}
