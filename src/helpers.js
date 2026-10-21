/** Shared pure helpers */

export const P2 = x => String(x).padStart(2, "0");

export function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

export function fmt(ms) {
  const s = Math.max(0, ms / 1e3 | 0);
  const d = s / 86400 | 0, h = s % 86400 / 3600 | 0, m = s % 3600 / 60 | 0;
  return (d ? d + "d " : "") + h + "h " + m + "m";
}

export function fmtShort(ms) {
  const s = Math.max(0, ms / 1e3 | 0);
  const h = s / 3600 | 0, m = s % 3600 / 60 | 0, sec = s % 60;
  if (h > 0) return h + "h " + m + "m";
  return m + "m " + sec + "s";
}

export function fmtUtcTime(ts) {
  const d = new Date(ts);
  return P2(d.getUTCHours()) + ":" + P2(d.getUTCMinutes());
}

export function tog(a, x) {
  const i = a.indexOf(x);
  i < 0 ? a.push(x) : a.splice(i, 1);
}

/** Daily reset = 07:00 UTC; Weekly = Wednesday 07:00 UTC */
export function lastReset(w) {
  const n = new Date(), d = new Date();
  d.setUTCHours(7, 0, 0, 0);
  if (w) {
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - 3 + 7) % 7));
    if (d > n) d.setUTCDate(d.getUTCDate() - 7);
  } else if (d > n) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d;
}

export const pk = p =>
  p === "w"
    ? "w" + lastReset(1).toISOString().slice(0, 10)
    : "d" + lastReset(0).toISOString().slice(0, 10);

export const nextReset = w => +lastReset(w) + (w ? 6048e5 : 864e5);
