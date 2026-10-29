/** Event timers view */
import { EV, DN } from "../data.js";
import { getSt } from "../state.js";
import { P2, fmt, esc } from "../helpers.js";

function nxt(e) {
  const n = Date.now();
  let best = null;
  for (let k = -1; k < 10; k++) {
    const b = new Date();
    b.setUTCDate(b.getUTCDate() + k);
    if (e[3] && !e[3].includes(b.getUTCDay())) continue;
    for (const h of e[4]) {
      const s = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate(), h, e[5]);
      if (s + e[2] * 6e4 > n && (best === null || s < best)) best = s;
    }
  }
  return best;
}

export function drawEvents(app) {
  const st = getSt();
  const n = Date.now();
  const ed = st.evEdit;
  const notifyList = st.evNotify || [];

  const items = EV.map(e => ({ e, s: nxt(e) }))
    .filter(o => ed || !st.evHide.includes(o.e[0]))
    .sort((a, b) => (st.evPin.includes(b.e[0]) - st.evPin.includes(a.e[0])) || a.s - b.s);

  app.innerHTML = `
    <div class="panel glass">
      <div class="ctrl-bar">
        <h2 style="margin:0">Event Timers</h2>
        <button type="button" data-ee="1" class="btn-sm" style="margin-left:auto">${ed ? "Done" : "Filter"}</button>
      </div>
      <div id="evlist">
        ${items.map(({ e, s }) => {
          const on = s <= n, end = s + e[2] * 6e4, d = new Date(s);
          const h = st.evHide.includes(e[0]);
          const p = st.evPin.includes(e[0]);
          const ntf = notifyList.includes(e[0]);
          const local = DN[d.getUTCDay()] + " " + P2(d.getUTCHours()) + ":" + P2(d.getUTCMinutes()) + " UTC";
          const when = e[4].length === 24
            ? `Every Hour At :${P2(e[5])}`
            : (e[3] ? e[3].map(x => DN[x]).join("/") + " " : "Daily ") +
              e[4].map(h => P2(h) + ":" + P2(e[5])).join(", ") + " UTC";
          return `<div class="event-row ${on && !h ? "open" : ""}" ${h ? 'style="opacity:.45"' : ""}>
            <span class="ic">${e[1]}</span>
            <div>
              <div class="hd"><h3 style="font-size:13.5px;font-weight:600">${p ? "★ " : ""}${e[0]}</h3></div>
              <div class="when">${when} · Next: ${local}</div>
              <div class="tip">${e[6]}</div>
            </div>
            <div style="text-align:right">
              <div class="status ${on ? "open" : (s - n < 36e5 ? "soon" : "")}">${on ? "Open · " + fmt(end - n) : "In " + fmt(s - n)}</div>
              <div class="ctl" style="justify-content:flex-end;margin-top:4px;gap:4px">
                <button type="button" data-en="${esc(e[0])}" class="btn-sm ${ntf ? "on" : ""}" title="Toggle notification">
                  ${ntf ? "🔔" : "🔕"}
                </button>
                ${ed ? `
                  <button type="button" data-ep="${esc(e[0])}">${p ? "Unpin" : "★ Pin"}</button>
                  <button type="button" data-eh="${esc(e[0])}">${h ? "Show" : "Hide"}</button>
                ` : ""}
              </div>
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
}
