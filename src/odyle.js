/** Odyle energy regeneration (global UTC ticks) */
import { S, getRoster } from "./state.js";

const ODYLE_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];
export const ODYLE_PER_TICK = 15;

export function getOdyleCap() {
  return S.get("a2om") === "1" ? 840 : 560;
}
export function isMembership() {
  return S.get("a2om") === "1";
}
export function getOdyleVal(charId) {
  return Math.max(0, +S.get("a2oe_" + charId) || 0);
}
export function setOdyleVal(charId, value) {
  const v = Math.min(2000, Math.max(0, +value || 0));
  S.set("a2oe_" + charId, String(v));
  return v;
}
function getLastAppliedTick() {
  return +S.get("a2oe_last_tick") || 0;
}
function setLastAppliedTick(ts) {
  S.set("a2oe_last_tick", String(ts));
}

export function lastUtcTick(before = Date.now()) {
  const d = new Date(before);
  const h = d.getUTCHours();
  let tickH = ODYLE_HOURS[0];
  for (const x of ODYLE_HOURS) if (x <= h) tickH = x;
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), tickH, 0, 0, 0);
  if (t > before)
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - 1, 21, 0, 0, 0);
  return t;
}

export function nextUtcTick(from = Date.now()) {
  const d = new Date(from);
  for (const x of ODYLE_HOURS) {
    const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), x, 0, 0, 0);
    if (t > from) return t;
  }
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
}

export function applyOdyleTicks() {
  const now = Date.now();
  const latest = lastUtcTick(now);
  let last = getLastAppliedTick();
  if (!last) {
    setLastAppliedTick(latest);
    return;
  }
  if (latest <= last) return;
  let ticks = 0,
    cursor = last;
  while (cursor < latest) {
    cursor = nextUtcTick(cursor);
    if (cursor <= latest) ticks++;
    else break;
    if (ticks > 100) break;
  }
  if (ticks <= 0) {
    setLastAppliedTick(latest);
    return;
  }
  const cap = getOdyleCap();
  getRoster().forEach(c => {
    const v = getOdyleVal(c.id);
    if (v < cap) setOdyleVal(c.id, Math.min(cap, v + ticks * ODYLE_PER_TICK));
  });
  setLastAppliedTick(latest);
}

export function getOdyle(charId) {
  applyOdyleTicks();
  const v = getOdyleVal(charId);
  const next = nextUtcTick();
  return { v, nextIn: Math.max(0, next - Date.now()), nextAt: next };
}

export function batteryLevel(v, cap) {
  const p = v / cap;
  if (p >= 0.95) return "full";
  if (p >= 0.55) return "high";
  if (p >= 0.25) return "mid";
  return "low";
}

export function fullAtTs(v, cap) {
  if (v >= cap) return null;
  const need = Math.ceil((cap - v) / ODYLE_PER_TICK);
  let t = nextUtcTick();
  for (let i = 1; i < need; i++) t = nextUtcTick(t);
  return t;
}

export function fullInLabel(v, cap) {
  if (v >= cap) return "Full now";
  const need = Math.ceil((cap - v) / ODYLE_PER_TICK);
  const hours = need * 3;
  if (hours < 24) return "Full in " + hours + "h";
  const days = hours / 24;
  const s = days % 1 === 0 ? String(days | 0) : days.toFixed(1);
  return "Full in " + s + "d";
}
