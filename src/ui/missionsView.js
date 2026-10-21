/** Missions + Goals tab shell */
import { getSt, activeChar } from "../state.js";
import { getAllMissions, ordered, dis, hid, prog, card } from "../missions.js";
import { drawGoals } from "./goalsView.js";
import { esc } from "../helpers.js";

export function drawMissions(app) {
  const st = getSt();
  const char = activeChar();
  const viewToggle = `
    <div class="ctrl-bar" style="margin-bottom:14px">
      <div class="seg">
        <button type="button" data-mview="missions" class="${st.mview !== "goals" ? "on" : ""}">Missions</button>
        <button type="button" data-mview="goals" class="${st.mview === "goals" ? "on" : ""}">Goals</button>
      </div>
      <span class="pct">${esc(char.name)} · ${esc(char.class || "")}</span>
    </div>`;

  if (st.mview === "goals") {
    const wrap = document.createElement("div");
    drawGoals(wrap);
    app.innerHTML = viewToggle + wrap.innerHTML;
    return;
  }

  const all = ordered(getAllMissions().filter(i => i.p === st.sub));
  const L = st.mEdit ? all : all.filter(i => !dis(i) && !hid(i));
  const pct = prog(st.sub);

  app.innerHTML = viewToggle + `
    <div class="panel glass">
      <div class="ctrl-bar">
        <div class="seg">
          <button type="button" data-s="d" class="${st.sub === "d" ? "on" : ""}">Daily</button>
          <button type="button" data-s="w" class="${st.sub === "w" ? "on" : ""}">Weekly</button>
        </div>
        <span class="pct"><b>${pct}%</b> · ${esc(char.name)}</span>
        <button type="button" data-me="1" class="btn-sm">${st.mEdit ? "Done" : "Edit List"}</button>
      </div>
      ${st.mEdit ? `
        <div class="custom-form">
          <input type="text" id="cmIc" value="⭐" maxlength="2" style="width:48px;text-align:center">
          <input type="text" id="cmN" placeholder="Custom Mission Name" maxlength="40" style="width:240px">
          <select id="cmS">
            <option value="char">Per Character</option>
            <option value="shared">Shared</option>
            <option value="main">Main Only</option>
          </select>
          <input type="number" id="cmC" value="1" min="1" max="99" style="width:64px">
          <button type="button" id="cmAdd" class="btn-sm on">+ Add Custom</button>
        </div>
      ` : ""}
      <div>${L.map(i => card(i, st.mEdit)).join("") || '<p class="tip" style="padding:14px 0">No Missions For This Character.</p>'}</div>
    </div>`;
}
