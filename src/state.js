/**
 * Global app state — single source of truth.
 */
import { localGet, saveAll, S } from "./storage.js";
import { DEFAULT_ROSTER, CHAR_COLORS } from "./data.js";

let roster = localGet("devaion_roster") || DEFAULT_ROSTER.slice();
roster.forEach((c, i) => {
  if (!c.color) c.color = CHAR_COLORS[i % CHAR_COLORS.length];
});

let st = Object.assign(
  {
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
    mEdit: false,
    evEdit: false,
    gEdit: null,
    showArch: false,
    showGoalForm: false,
    editingChar: null,
    linkMissionGoalId: null
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
["hid", "ord", "evHide", "evPin"].forEach(k => {
  if (!Array.isArray(st[k])) st[k] = [];
});

let goals = localGet("devaion_goals", []);
let notes = localGet("devaion_notes", []);
let customs = localGet("devaion_customs", []);

export function getRoster() { return roster; }
export function setRoster(r) { roster = r; }
export function getSt() { return st; }
export function getGoals() { return goals; }
export function setGoals(g) { goals = g; }
export function getNotes() { return notes; }
export function setNotes(n) { notes = n; }
export function getCustoms() { return customs; }
export function setCustoms(c) { customs = c; }

export function activeChar() {
  return roster.find(c => c.id === st.activeChar) || roster[0];
}
export function isMain() {
  return activeChar()?.role === "main";
}
export function persist() {
  saveAll({ roster, st, goals, notes, customs });
}
export { S };
