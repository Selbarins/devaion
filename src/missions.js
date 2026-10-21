/** Mission helpers + card rendering */
import { D_BASE } from "./data.js";
import { S, getSt, getCustoms, isMain } from "./state.js";
import { pk, esc } from "./helpers.js";

export function getAllMissions() {
  return D_BASE.concat(
    getCustoms().map(c => ({
      id: c.id,
      p: c.p,
      n: c.n,
      ic: c.ic || "⭐",
      f: c.p === "w" ? "Weekly" : "Daily",
      s: c.s || "char",
      c: c.c || 1,
      t: c.t || "Custom Mission",
      custom: true,
      goalId: c.goalId || null
    }))
  );
}

export function max(it) {
  return typeof it.c === "object" ? (isMain() ? it.c.Main : it.c.alt) : it.c;
}

export function key(it) {
  const st = getSt();
  return `d2|${it.id}|${it.s === "char" ? st.activeChar : "x"}|${pk(it.p)}`;
}

export function val(it) {
  return +S.get(key(it)) || 0;
}

export function dis(it) {
  return (it.s === "main" || it.s === "shared") && !isMain();
}

export function hid(it) {
  return getSt().hid.includes(it.id);
}

export function ordered(list) {
  const ord = getSt().ord;
  return list.slice().sort((a, b) => {
    const i = ord.indexOf(a.id), j = ord.indexOf(b.id);
    return (i < 0 ? 999 : i) - (j < 0 ? 999 : j);
  });
}

export function withChar(c, f) {
  const st = getSt();
  const o = st.activeChar;
  st.activeChar = c;
  try { return f(); } finally { st.activeChar = o; }
}

export function cnt(p, c) {
  return withChar(c, () => {
    const D = getAllMissions();
    const l = D.filter(i => i.p === p && !dis(i) && !hid(i));
    return [l.filter(i => val(i) >= max(i)).length, l.length];
  });
}

export function prog(p) {
  let a = 0, b = 0;
  getAllMissions()
    .filter(i => i.p === p && !dis(i) && !hid(i))
    .forEach(i => {
      b += max(i);
      a += Math.min(val(i), max(i));
    });
  return b ? Math.round((a / b) * 100) : 0;
}

export function card(it, ed) {
  const m = max(it), v = val(it);
  const d = dis(it) && !ed;
  const done = v >= m && !d && !ed;
  const sc = { char: "Per Character", shared: "Shared", main: "Main Only" }[it.s];
  const scClass = { char: "char", shared: "shared", main: "main" }[it.s];
  const isCustom = !!it.custom;
  const goalTag = it.goalId
    ? `<span class="tg" style="border-color:var(--amber);color:var(--amber)">🎯 Goal</span>`
    : "";

  const ctl = d
    ? `<span style="font-size:12px;color:var(--muted)">Main Only</span>`
    : ed
      ? `<div class="ctl">
          <button type="button" data-mv="${it.id}" data-d="-1">▲</button>
          <button type="button" data-mv="${it.id}" data-d="1">▼</button>
          <button type="button" data-hd="${it.id}">${hid(it) ? "Show" : "Hide"}</button>
          ${isCustom ? `<button type="button" data-cdel="${it.id}" class="btn-danger">Del</button>` : ""}
        </div>`
      : `<div class="ctl">
          <button type="button" data-k="${it.id}" data-d="-1">−</button>
          <b>${v}/${m}</b>
          <button type="button" data-k="${it.id}" data-d="1">+</button>
          <button type="button" data-k="${it.id}" data-d="all">Max</button>
        </div>`;

  return `<div class="row ${done ? "done" : ""} ${d ? "dis" : ""} ${ed && hid(it) ? "hid" : ""}">
    <span class="ic">${it.ic}</span>
    <div>
      <div class="hd">
        <h3>${esc(it.n)}</h3>
        <span class="tg ${scClass}">${sc}</span>
        <span class="tg">${it.f}</span>
        ${isCustom ? '<span class="tg custom">Custom</span>' : ""}
        ${goalTag}
      </div>
      <div class="tip">${esc(it.t)}</div>
    </div>
    ${ctl}
  </div>`;
}

export function missionsForGoal(goalId) {
  return getAllMissions().filter(m => m.goalId === goalId);
}
