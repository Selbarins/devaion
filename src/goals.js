/** Goals logic */
import { S, getSt, getGoals, getRoster, getCustoms, activeChar } from "./state.js";
import { pk, nextReset, fmt, esc } from "./helpers.js";
import { missionsForGoal } from "./missions.js";

export const CATEGORIES = {
  Gear: { emoji: "🗡", color: "#fbbf24" },
  Farming: { emoji: "🌾", color: "#34d399" },
  PvP: { emoji: "⚔", color: "#f87171" },
  Trophy: { emoji: "🏆", color: "#c084fc" },
  Money: { emoji: "💰", color: "#22d3ee" },
  Other: { emoji: "⭐", color: "#9aadc8" }
};

export function categoryEmoji(cat) {
  return CATEGORIES[cat]?.emoji || "⭐";
}
export function categoryColor(cat) {
  return CATEGORIES[cat]?.color || "#9aadc8";
}

export const gkey = (g, c) => `g|${g.id}|${g.sc === "char" ? c : "x"}|${pk(g.ty)}`;
export const gmax = g => g.steps?.length || g.tg || 1;

export function gval(g, c) {
  if (g.ty === "l") {
    return g.steps?.length ? g.steps.filter(x => x.d).length : g.v || 0;
  }
  return +S.get(gkey(g, c)) || 0;
}

/** filterChar "all" → show every goal; otherwise assigned char or all-scope */
export function vis(g, filterChar) {
  if (!filterChar || filterChar === "all") return true;
  if (g.sc === "all") return true;
  if (g.sc === "char") return g.ch === filterChar;
  return true;
}

export function glist(ty, filterChar) {
  return getGoals()
    .filter(g => g.ty === ty && vis(g, filterChar))
    .sort((a, b) => +!!b.hi - +!!a.hi);
}

export function gcnt(ty, filterChar) {
  const l = glist(ty, filterChar).filter(g => !g.pause && !g.arch);
  const c = filterChar === "all" ? activeChar()?.id : filterChar;
  return [l.filter(g => gval(g, c) >= gmax(g)).length, l.length];
}

export function urg(g) {
  if (g.pause || g.arch) return null;
  const n = Date.now();
  if (g.ty === "l") {
    if (!g.due) return null;
    const ms = new Date(g.due + "T23:59:59Z") - n;
    return ms < 0 ? ["late", "Overdue"] : ms < 3 * 864e5 ? ["warn", fmt(ms) + " Left"] : null;
  }
  const ms = nextReset(g.ty === "w") - n;
  return ms < (g.ty === "w" ? 12 : 3) * 36e5 ? ["warn", "Resets In " + fmt(ms)] : null;
}

export function goalCard(g) {
  const st = getSt();
  const roster = getRoster();
  const progressChar = g.sc === "char" && g.ch ? g.ch : st.activeChar;
  const m = gmax(g), v = gval(g, progressChar);
  const done = v >= m;
  const u = !done && urg(g);
  const col = categoryColor(g.cat);
  const em = categoryEmoji(g.cat);
  const assignLabel =
    g.sc === "all"
      ? "All Characters"
      : roster.find(r => r.id === g.ch)?.name || "Character";

  const linked = missionsForGoal(g.id);
  const linkedHtml = linked.length
    ? `<div class="tip" style="margin-top:6px">Linked missions: ${linked.map(x => esc(x.n)).join(", ")}</div>`
    : "";

  const stepsHtml =
    g.ty === "l" && g.steps?.length
      ? `<div class="steps" style="margin-top:8px">${g.steps
          .map(
            (x, i) =>
              `<label><input type="checkbox" data-st="${g.id}|${i}" ${x.d ? "checked" : ""}> ${esc(x.x)}</label>`
          )
          .join("")}</div>`
      : "";

  const progress =
    g.ty === "l" && g.steps?.length
      ? `<div class="progress-row"><b>${v}/${m}</b></div>`
      : `<div class="progress-row">
        <button type="button" data-gk="${g.id}" data-d="-1" class="btn-sm">−</button>
        <b>${v}/${m}</b>
        <button type="button" data-gk="${g.id}" data-d="1" class="btn-sm">+</button>
        <button type="button" data-gk="${g.id}" data-d="all" class="btn-sm">Max</button>
      </div>`;

  return `
  <div class="goal-card ${done ? "done" : ""} ${u ? u[0] : ""} ${g.pause ? "hid" : ""}" data-goal-id="${g.id}">
    <div class="top">
      <div>
        <div class="title">${g.hi ? "★ " : ""}${em} ${esc(g.n)}</div>
        <div class="meta-row">
          <span class="cat-badge" style="color:${col};border-color:${col}55;background:${col}18">${em} ${g.cat}</span>
          <span class="tg ${g.sc === "all" ? "shared" : "char"}">${esc(assignLabel)}</span>
          ${g.due ? `<span class="tg">Due ${g.due}</span>` : ""}
          ${u ? `<span class="tg" style="color:var(--amber)">⏰ ${u[1]}</span>` : ""}
          ${g.pause ? '<span class="tg">Paused</span>' : ""}
        </div>
        ${g.nt ? `<div class="tip" style="margin-top:4px">${esc(g.nt)}</div>` : ""}
        ${stepsHtml}
        ${linkedHtml}
      </div>
      <div class="actions">
        <button type="button" data-ga="link-mission" data-gid="${g.id}" class="btn-sm" title="Add a custom mission to help reach this goal">+ Mission</button>
        <button type="button" data-ga="edit" data-gid="${g.id}" class="btn-sm">Edit</button>
        <button type="button" data-ga="pause" data-gid="${g.id}" class="btn-sm">${g.pause ? "Resume" : "Pause"}</button>
        ${
          g.ty === "l" && (done || g.arch)
            ? `<button type="button" data-ga="arch" data-gid="${g.id}" class="btn-sm">${g.arch ? "Restore" : "Archive"}</button>`
            : ""
        }
        <button type="button" data-ga="del" data-gid="${g.id}" class="btn-sm btn-danger">Delete</button>
      </div>
    </div>
    ${progress}
  </div>`;
}

export function createOrUpdateGoalFromForm() {
  const $ = id => document.getElementById(id);
  const nameEl = $("gN");
  if (!nameEl) return null;
  const n = nameEl.value.trim();
  if (!n) {
    nameEl.focus();
    return null;
  }
  const sc = $("gS")?.value || "char";
  const ty = $("gT")?.value || "l";
  const cat = $("gC")?.value || "Other";
  const o = {
    n,
    ic: categoryEmoji(cat),
    ty,
    tg: Math.max(1, +($("gG")?.value) || 1),
    sc,
    ch: sc === "all" ? null : $("gCh")?.value || getSt().activeChar,
    cat,
    hi: !!$("gH")?.checked,
    due: $("gD")?.value || "",
    nt: ($("gO")?.value || "").trim()
  };
  const goals = getGoals();
  const st = getSt();
  const old = goals.find(g => g.id === st.gEdit);
  const names = ($("gP")?.value || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
  o.steps =
    o.ty === "l"
      ? names.map(x => ({ x, d: !!old?.steps?.find(z => z.x === x && z.d) }))
      : [];

  if (old) {
    Object.assign(old, o);
    return old;
  }
  const neu = { id: "g" + Date.now(), v: 0, pause: false, arch: false, ...o };
  goals.push(neu);
  return neu;
}
