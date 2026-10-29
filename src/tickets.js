/** Ticket counters – overcap allowed + daily/weekly auto ticks */
import { S, getRoster } from "./state.js";
import { isMembership } from "./odyle.js";
import { pk } from "./helpers.js";

const KEYS = {
  nightmare:  { prefix: "a2nm_",   daily: 2, weekly: 0, cap: 14, perChar: true },
  ascension:  { prefix: "a2asc_",  daily: 0, weekly: 3, cap: 3,  perChar: true },
  shugo:      { prefix: "a2shugo", daily: 3, weekly: 0, capBase: 12, capMember: 21, perChar: false },
  dim:        { prefix: "a2dim",   daily: 1, weekly: 0, cap: 7,  perChar: false }
};

export function getTicket(kind, charId = null) {
  const def = KEYS[kind];
  if (!def) return 0;
  const key = def.perChar ? def.prefix + charId : def.prefix;
  return Math.max(0, +S.get(key) || 0);
}

/** Overcap allowed – no clamp to cap */
export function setTicket(kind, value, charId = null) {
  const def = KEYS[kind];
  if (!def) return 0;
  const key = def.perChar ? def.prefix + charId : def.prefix;
  const v = Math.max(0, +value || 0);
  S.set(key, String(v));
  return v;
}

export function getTicketCap(kind) {
  const def = KEYS[kind];
  if (!def) return 0;
  if (def.capMember) return isMembership() ? def.capMember : def.capBase;
  return def.cap;
}

export function adjTicket(kind, delta, charId = null) {
  return setTicket(kind, getTicket(kind, charId) + delta, charId);
}

export function ticketInfo(kind) {
  const def = KEYS[kind];
  return {
    daily: def.daily || 0,
    weekly: def.weekly || 0,
    cap: getTicketCap(kind),
    perChar: def.perChar
  };
}

/** Call once on load / tick – adds daily & weekly gains once per period */
export function applyTicketTicks() {
  const dayKey = pk("d");
  const weekKey = pk("w");
  const lastD = S.get("a2tk_last_d") || "";
  const lastW = S.get("a2tk_last_w") || "";

  const roster = getRoster();

  if (lastD !== dayKey) {
    // daily gains
    Object.entries(KEYS).forEach(([kind, def]) => {
      if (!def.daily) return;
      if (def.perChar) {
        roster.forEach(c => setTicket(kind, getTicket(kind, c.id) + def.daily, c.id));
      } else {
        setTicket(kind, getTicket(kind) + def.daily);
      }
    });
    S.set("a2tk_last_d", dayKey);
  }

  if (lastW !== weekKey) {
    // weekly gains
    Object.entries(KEYS).forEach(([kind, def]) => {
      if (!def.weekly) return;
      if (def.perChar) {
        roster.forEach(c => setTicket(kind, getTicket(kind, c.id) + def.weekly, c.id));
      } else {
        setTicket(kind, getTicket(kind) + def.weekly);
      }
    });
    S.set("a2tk_last_w", weekKey);
  }
}
