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
    baseEditId: null,
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

let goals = localGet("devaion_goals", []);
let notes = localGet("devaion_notes", []);
let customs = localGet("devaion_customs", []);
let baseMissions = localGet("devaion_base_missions");

if (!Array.isArray(baseMissions) || baseMissions.length === 0) {
  baseMissions = D_BASE_SEED.map(m => ({ ...m, consumes: null, consumesAmount: 1 }));
  localSet("devaion_base_missions", baseMissions);
}

export function getRoster() { return roster; }
export function setRoster(r) { roster = r; }
export function getSt() { return st; }
export function getGoals() { return goals; }
export function setGoals(g) { goals = g; }
export function getNotes() { return notes; }
export function setNotes(n) { notes = n; }
export function getCustoms() { return customs; }
export function setCustoms(c) { customs = c; }
export function getBaseMissionsState() { return baseMissions; }
export function setBaseMissionsState(list) { baseMissions = list; }

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
    customs,
    baseMissions
  });
}

export { S };
