/** Missions + Goals tab shell */
import { getSt, getRoster, activeChar } from "../state.js";
import { getAllMissions, ordered, dis, hid, prog, card } from "../missions.js";
import { drawGoals } from "./goalsView.js";
import { esc } from "../helpers.js";

/** Quick emoji presets for custom missions (no full picker) */
const MISSION_EMOJIS = ["⭐", "🎯", "📜", "⚔", "🗡", "💰", "🔥", "🏛", "🌑", "💠", "🎁", "🌀"];

export function drawMissions(app) {
  const st = getSt();
  const roster = getRoster();
  const char = activeChar();

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

  // Character picker lives here (missions only)
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

  // Prefill from "+ Mission" on a goal
  const pre = st.cmPrefill || {};
  const showForm = st.mEdit || st.cmPrefill;
  const ic = pre.ic || "⭐";
  const title = pre.n || "";
  const scope = pre.s || "char";
  const period = pre.p || st.sub;
  const count = pre.c || 1;
  const tip = pre.t || "";

  app.innerHTML = viewToggle + charBar + `
    <div class="panel glass">
      <div class="ctrl-bar">
        <div class="seg">
          <button type="button" data-s="d" class="${st.sub === "d" ? "on" : ""}">Daily</button>
          <button type="button" data-s="w" class="${st.sub === "w" ? "on" : ""}">Weekly</button>
        </div>
        <span class="pct"><b>${pct}%</b> · ${esc(char.name)}</span>
        <button type="button" data-me="1" class="btn-sm">${showForm && st.mEdit ? "Done" : "Edit List"}</button>
      </div>
      ${showForm ? `
        <div class="custom-form" style="flex-wrap:wrap;gap:10px;align-items:flex-start">
          ${st.cmPrefill ? `<div class="tip" style="width:100%;margin-bottom:4px">Linked to goal — edit title, frequency, and scope, then add.</div>` : ""}
          <div style="display:flex;flex-direction:column;gap:6px">
            <label class="tip">Icon</label>
            <div class="emoji-presets" style="display:flex;flex-wrap:wrap;gap:4px;max-width:220px">
              ${MISSION_EMOJIS.map(em =>
                `<button type="button" class="btn-sm emoji-pick ${em === ic ? "on" : ""}" data-cm-emoji="${em}" style="min-width:36px;padding:4px 6px;font-size:16px">${em}</button>`
              ).join("")}
            </div>
            <input type="hidden" id="cmIc" value="${esc(ic)}">
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:180px">
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
          <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:160px">
            <label class="tip">Note</label>
            <input type="text" id="cmT" value="${esc(tip)}" placeholder="Optional tip" maxlength="80" style="width:100%">
          </div>
          <input type="hidden" id="cmGoalId" value="${esc(pre.goalId || "")}">
          <div style="display:flex;gap:8px;align-items:flex-end;padding-bottom:2px">
            <button type="button" id="cmAdd" class="btn-sm on">+ Add Mission</button>
            ${st.cmPrefill ? `<button type="button" id="cmCancelPrefill" class="btn-sm">Cancel</button>` : ""}
          </div>
        </div>
      ` : ""}
      <div>${L.map(i => card(i, st.mEdit)).join("") || '<p class="tip" style="padding:14px 0">No Missions For This Character.</p>'}</div>
    </div>`;
}
