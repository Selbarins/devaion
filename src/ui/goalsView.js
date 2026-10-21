/** Goals tab UI */
import {
  CATEGORIES, categoryEmoji, glist, gcnt, gval, gmax, goalCard
} from "../goals.js";
import { getSt, getGoals, getRoster, getNotes, activeChar } from "../state.js";
import { NC } from "../data.js";
import { esc } from "../helpers.js";

export function drawGoals(app) {
  const st = getSt();
  const roster = getRoster();
  const goals = getGoals();
  const notes = getNotes();
  const filter = st.gCharFilter || "all";
  const gd = gcnt("d", filter);
  const gw = gcnt("w", filter);
  const longList = glist("l", filter).filter(g => !g.arch && !g.pause);
  const ld = longList.filter(g => {
    const c = g.sc === "char" && g.ch ? g.ch : st.activeChar;
    return gval(g, c) >= gmax(g);
  }).length;
  const na = goals.filter(g => g.arch).length;
  const list = glist(st.gsub, filter).filter(
    g => (st.gcat === "All" || g.cat === st.gcat) && (st.showArch || !g.arch)
  );
  const editing = goals.find(g => g.id === st.gEdit);
  const f = editing || {
    n: "", ty: st.gsub, tg: 1, sc: "char", ch: st.activeChar,
    cat: "Other", hi: false, due: "", nt: "", steps: []
  };

  app.innerHTML = `
    <div class="panel glass">
      <div class="grid-3">
        <div class="stat-box"><b>${gd[0]}/${gd[1]}</b><small>Daily Goals</small></div>
        <div class="stat-box"><b>${gw[0]}/${gw[1]}</b><small>Weekly Goals</small></div>
        <div class="stat-box"><b>${ld}/${longList.length}</b><small>Long-Term Done</small></div>
      </div>
    </div>

    <div class="ctrl-bar">
      <div class="seg">
        <button type="button" data-gsub="d" class="${st.gsub === "d" ? "on" : ""}">Daily</button>
        <button type="button" data-gsub="w" class="${st.gsub === "w" ? "on" : ""}">Weekly</button>
        <button type="button" data-gsub="l" class="${st.gsub === "l" ? "on" : ""}">Long-Term</button>
      </div>
      <select id="gCharFilter" title="Show goals for…">
        <option value="all" ${filter === "all" ? "selected" : ""}>All Characters</option>
        ${roster.map(r =>
          `<option value="${r.id}" ${filter === r.id ? "selected" : ""}>${esc(r.name)}</option>`
        ).join("")}
      </select>
      <select id="gF">
        <option value="All" ${st.gcat === "All" ? "selected" : ""}>All Categories</option>
        ${Object.keys(CATEGORIES).map(k =>
          `<option value="${k}" ${st.gcat === k ? "selected" : ""}>${categoryEmoji(k)} ${k}</option>`
        ).join("")}
      </select>
      ${na ? `<label class="tg" style="cursor:pointer"><input type="checkbox" id="gArch" ${st.showArch ? "checked" : ""}> Archived (${na})</label>` : ""}
      <button type="button" id="toggleGoalForm" class="btn-sm on" style="margin-left:auto">
        ${st.showGoalForm || editing ? "Close Form" : "+ New Goal"}
      </button>
    </div>

    ${(st.showGoalForm || editing) ? `
    <div class="goal-form" id="goalFormPanel">
      <div class="form-grid">
        <div class="field full">
          <label>Title</label>
          <input type="text" id="gN" value="${esc(f.n)}" placeholder="What do you want to achieve?" maxlength="80">
        </div>
        <div class="field">
          <label>Category</label>
          <select id="gC">
            ${Object.keys(CATEGORIES).map(k =>
              `<option value="${k}" ${f.cat === k ? "selected" : ""}>${categoryEmoji(k)} ${k}</option>`
            ).join("")}
          </select>
        </div>
        <div class="field">
          <label>Type</label>
          <select id="gT">
            <option value="d" ${f.ty === "d" ? "selected" : ""}>Daily</option>
            <option value="w" ${f.ty === "w" ? "selected" : ""}>Weekly</option>
            <option value="l" ${f.ty === "l" ? "selected" : ""}>Long-Term</option>
          </select>
        </div>
        <div class="field">
          <label>Target</label>
          <input type="number" id="gG" min="1" value="${f.tg || 1}">
        </div>
        <div class="field">
          <label>Assign To</label>
          <select id="gS">
            <option value="char" ${f.sc === "char" ? "selected" : ""}>One Character</option>
            <option value="all" ${f.sc === "all" ? "selected" : ""}>All Characters</option>
          </select>
        </div>
        <div class="field">
          <label>Character</label>
          <select id="gCh" ${f.sc === "all" ? "disabled" : ""}>
            ${roster.map(r =>
              `<option value="${r.id}" ${(f.ch || st.activeChar) === r.id ? "selected" : ""}>${esc(r.name)}</option>`
            ).join("")}
          </select>
        </div>
        <div class="field">
          <label>Deadline (Optional)</label>
          <input type="date" id="gD" value="${f.due || ""}">
        </div>
        <div class="field full">
          <label>Note (Optional)</label>
          <input type="text" id="gO" value="${esc(f.nt || "")}" placeholder="Extra details…">
        </div>
        <div class="field full">
          <label>Steps (Long-Term Only, Comma Separated)</label>
          <input type="text" id="gP" value="${esc((f.steps || []).map(x => x.x).join(", "))}" placeholder="Step 1, Step 2, Step 3…">
        </div>
      </div>
      <div class="form-actions">
        <label class="tg" style="cursor:pointer;margin-right:auto">
          <input type="checkbox" id="gH" ${f.hi ? "checked" : ""}> High Priority
        </label>
        <button type="button" id="gAdd" class="btn-sm on">${editing ? "Save Changes" : "Create Goal"}</button>
        <button type="button" data-ga="cancel" class="btn-sm">Cancel</button>
      </div>
    </div>
    ` : ""}

    <div class="panel" style="padding-top:8px">
      ${list.length === 0
        ? '<p class="tip" style="padding:20px 0;text-align:center">No Goals Yet. Create One Above.</p>'
        : list.map(g => goalCard(g)).join("")}
    </div>

    <div class="panel">
      <h2>Notes <button type="button" id="nAdd" class="btn-sm" style="float:right">+ Note</button></h2>
      <div class="notes">${notes.map(n => `
        <div class="note" style="--nc:${n.c}">
          <div class="nh">
            ${NC.map(k => `<button type="button" class="dot" data-nc="${n.id}|${k}" style="background:${k}"></button>`).join("")}
            <button type="button" class="x" data-nd="${n.id}">×</button>
          </div>
          <textarea data-nid="${n.id}" placeholder="Write Something…">${esc(n.tx)}</textarea>
        </div>`).join("") || '<p class="tip">No Notes Yet.</p>'}
      </div>
    </div>`;
}
