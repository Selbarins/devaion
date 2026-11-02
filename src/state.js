/**
 * Global app state — single source of truth.
 */
import { getUser } from "./auth.js";
import { localGet, localSet, saveAll, S } from "./storage.js";
import { DEFAULT_ROSTER, CHAR_COLORS, D_BASE_SEED } from "./data.js";

let roster = localGet("devaion_roster") || DEFAULT_ROSTER.slice();
roster.forEach((c, i) => {
  if (!c.color) c.color = CHAR_COLORS[i % CHAR_COLORS.length];
});

let st = Object.assign(
  {
    theme: "default",
    corrWon: 0,
    tab: "hub",
    sub: "d",
    gsub: "d",
    gcat: "All",
    gCharFilter: "all",
    mview: "missions",
    activeChar: roster[0]?.id || "c1",
    hid: [],
    ord: [],
    evHide: [],
    evPin: [],
    evNotify: [],
    mEdit: false,
    evEdit: false,
    gEdit: null,
    showArch: false,
    showGoalForm: false,
    editMissionId: null,   // unified edit
    editingChar: null,
    linkMissionGoalId: null,
    cmPrefill: null
  },
  localGet("devaion_st") || {}
);

// Migrations
if (st.tab === "goals") {
  st.tab = "missions";
  st.mview = "goals";
}
if (st.tab === "resources" || st.tab === "roster" || st.tab === "dash") st.tab = "hub";
if (!st.mview) st.mview = "missions";
if (!st.gCharFilter) st.gCharFilter = "all";
if (!roster.find(c => c.id === st.activeChar)) st.activeChar = roster[0]?.id || "c1";
["hid", "ord", "evHide", "evPin", "evNotify"].forEach(k => {
  if (!Array.isArray(st[k])) st[k] = [];
});
// clean old fields
delete st.baseEditId;

let goals = localGet("devaion_goals", []);
let notes = localGet("devaion_notes", []);

// ---------- Unified missions ----------
function normalizeMission(m) {
  return {
    id: m.id,
    p: m.p || "d",
    n: m.n || "Mission",
    ic: m.ic || "⭐",
    s: m.s || "char",
    c: Math.max(1, +m.c || 1),
    t: m.t || "",
    ch: m.ch || null,
    goalId: m.goalId || null,
    consumes: m.consumes || null,
    consumesAmount: Math.max(1, +m.consumesAmount || 1)
  };
}

function migrateMissions() {
  const existing = localGet("devaion_missions");
  if (Array.isArray(existing) && existing.length > 0) {
    return existing.map(normalizeMission);
  }

  // One-time migration from old base + customs
  const oldBase = localGet("devaion_base_missions");
  const oldCustoms = localGet("devaion_customs", []);

  const base = (Array.isArray(oldBase) && oldBase.length > 0)
    ? oldBase
    : D_BASE_SEED.map(m => ({ ...m }));

  const merged = [
    ...base.map(normalizeMission),
    ...oldCustoms.map(normalizeMission)
  ];

  localSet("devaion_missions", merged);
  return merged;
}

let missions = migrateMissions();

export function getRoster() { return roster; }
export function setRoster(r) { roster = r; }
export function getSt() { return st; }
export function getGoals() { return goals; }
export function setGoals(g) { goals = g; }
export function getNotes() { return notes; }
export function setNotes(n) { notes = n; }

export function getMissions() { return missions; }
export function setMissions(list) {
  missions = list.map(normalizeMission);
  localSet("devaion_missions", missions);
}

// legacy shims (so other files don't break during transition)
export function getCustoms() { return []; }
export function setCustoms() {}
export function getBaseMissionsState() { return missions; }
export function setBaseMissionsState(list) { setMissions(list); }

export function activeChar() {
  return roster.find(c => c.id === st.activeChar) || roster[0];
}
export function isMain() {
  return activeChar()?.role === "main";
}

export { localGet, localSet };

export function persist() {
  const user = getUser();
  saveAll(user?.id ?? null, {
    roster,
    st,
    goals,
    notes,
    missions
  });
}

export { S };
