/** Goals tab UI — ambitions only (no daily/weekly mission-style counters) */
import {
  CATEGORIES, categoryEmoji, goalCard
} from "../goals.js";
import { getSt, getGoals, getRoster, getNotes } from "../state.js";
import { NC } from "../data.js";
import { esc } from "../helpers.js";

export function drawGoals(app) {
  const st = getSt();
  const roster = getRoster();
  const goals = getGoals();
  const notes = getNotes();
  const filter = st.gCharFilter || "all";

  const visible = goals
    .filter(g => {
      if (!st.showArch && g.arch) return false;
      if (st.gcat !== "All" && g.cat !== st.gcat) return false;
      if (filter === "all") return true;
      if (g.sc === "all") return true;
      if (g.sc === "char") return g.ch === filter;
      return true;
    })
    .sort((a, b) => +!!b.hi - +!!a.hi || (a.n || "").localeCompare(b.n || ""));

  const openCount = visible.filter(g => !g.pause && !g.arch).length;
  const doneCount = visible.filter(g => {
    if (g.pause || g.arch) return false;
    // light done check via steps or tg — goalCard handles display
    return false;
  }).length;
  const na = goals.filter(g => g.arch).length;
  const editing = goals.find(g => g.id === st.gEdit);
  const f = editing || {
    n: "", ty: "l", tg: 1, sc: "char", ch: st.activeChar,
    cat: "Other", hi: false, due: "", nt: "", steps: []
  };

  app.innerHTML = `
    <div class="ctrl-bar">
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
      <span class="pct" style="margin-left:8px">${openCount} goal${openCount === 1 ? "" : "s"}</span>
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
          <label>Target count</label>
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
          <label>Steps (comma separated)</label>
          <input type="text" id="gP" value="${esc((f.steps || []).map(x => x.x).join(", "))}" placeholder="Step 1, Step 2, Step 3…">
        </div>
        <input type="hidden" id="gT" value="l">
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
      ${visible.length === 0
        ? '<p class="tip" style="padding:20px 0;text-align:center">No Goals Yet. Create One Above.</p>'
        : visible.map(g => goalCard(g)).join("")}
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
