/** Ticket / key counters – only the ones that can hit a hard cap */
import { S, getRoster } from "./state.js";
import { isMembership } from "./odyle.js";

const KEYS = {
  nightmare: { prefix: "a2nm_", daily: 2, cap: 14, perChar: true },
  shugo:     { prefix: "a2shugo", daily: 3, capBase: 12, capMember: 21, perChar: false },
  dim:       { prefix: "a2dim", daily: 1, cap: 7, perChar: false }
};

export function getTicket(kind, charId = null) {
  const def = KEYS[kind];
  if (!def) return 0;
  const key = def.perChar ? def.prefix + charId : def.prefix;
  return Math.max(0, +S.get(key) || 0);
}

export function setTicket(kind, value, charId = null) {
  const def = KEYS[kind];
  if (!def) return 0;
  const key = def.perChar ? def.prefix + charId : def.prefix;
  const cap = getTicketCap(kind);
  const v = Math.min(cap, Math.max(0, +value || 0));
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

/** Simple daily gain reminder (not auto-applied – user still spends) */
export function ticketInfo(kind) {
  const def = KEYS[kind];
  return {
    daily: def.daily,
    cap: getTicketCap(kind),
    perChar: def.perChar
  };
}
