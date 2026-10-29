/** Overview hub: energy + tickets + unfinished dailies + next events + roster + backup */
import {
  getSt, getRoster, S, persist, activeChar
} from "../state.js";
import {
  applyOdyleTicks, getOdyleCap, isMembership, getOdyleVal, setOdyleVal,
  batteryLevel, fullInLabel, nextUtcTick
} from "../odyle.js";
import { cnt, unfinishedDailies } from "../missions.js";
import { getTicket, setTicket, adjTicket, getTicketCap } from "../tickets.js";
import { CHAR_COLORS, EV, DN, SIEGE_DAYS } from "../data.js";
import { esc, fmtShort, fmtUtcTime, P2 } from "../helpers.js";

function nextEventTimes() {
  const n = Date.now();
  return EV.map(e => {
    let best = null;
    for (let k = -1; k < 8; k++) {
      const b = new Date();
      b.setUTCDate(b.getUTCDate() + k);
      if (e[3] && !e[3].includes(b.getUTCDay())) continue;
      for (const h of e[4]) {
        const s = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate(), h, e[5]);
        if (s + e[2] * 6e4 > n && (best === null || s < best)) best = s;
      }
    }
    return { e, s: best };
  })
  .filter(o => o.s)
  .sort((a, b) => a.s - b.s)
  .slice(0, 3);
}

export function drawHub(app, { onRender }) {
  applyOdyleTicks();
  const st = getSt();
  const roster = getRoster();
  const cap = getOdyleCap();
  const om = isMembership();
  const corrWon = +S.get("a2corr_won") || 0;

  const rows = roster.map(r => ({
    r,
    md: cnt("d", r.id),
    mw: cnt("w", r.id),
    oe: getOdyleVal(r.id),
    nm: getTicket("nightmare", r.id)
  }));

  const shugo = getTicket("shugo");
  const dim = getTicket("dim");
  const unfinished = unfinishedDailies();
  const nextEv = nextEventTimes();

  app.innerHTML = `
    <div class="panel glass">
      <div class="ctrl-bar" style="margin-bottom:14px">
        <h2 style="margin:0">Characters · Energy & Tickets</h2>
        <label class="tg" style="cursor:pointer;margin-left:auto">
          <input type="checkbox" id="om" ${om ? "checked" : ""}> Membership
        </label>
      </div>

      <!-- Shared tickets bar -->
      <div class="shared-tickets" style="display:flex;gap:18px;margin-bottom:16px;flex-wrap:wrap">
        <div class="ticket-pill">
          <span>🎁 Shugo</span>
          <button type="button" data-tk="shugo" data-d="-1">−</button>
          <b>${shugo}/${getTicketCap("shugo")}</b>
          <button type="button" data-tk="shugo" data-d="1">+</button>
        </div>
        <div class="ticket-pill">
          <span>🕳 Dimensional</span>
          <button type="button" data-tk="dim" data-d="-1">−</button>
          <b>${dim}/${getTicketCap("dim")}</b>
          <button type="button" data-tk="dim" data-d="1">+</button>
        </div>
        <div class="ticket-pill">
          <span>🌀 Corridors won</span>
          <button type="button" data-corr="-1">−</button>
          <b id="corrWonVal">${corrWon}</b>
          <button type="button" data-corr="1">+</button>
          <span class="tip" style="margin-left:6px">max 3 · resets siege day 00:00 UTC</span>
        </div>
      </div>

      <div class="dgrid dgrid-4">
        ${rows.map(({ r, md, mw, oe, nm }) => {
          const p = Math.min(100, Math.round((oe / cap) * 100));
          const lv = batteryLevel(oe, cap);
          const atCap = oe >= cap;
          const nearCap = oe >= cap - 30;
          const nmCap = getTicketCap("nightmare");
          return `
          <div class="dc ${atCap ? "cap-hit-card" : nearCap ? "cap-warn-card" : ""}" style="border-left:3px solid ${r.color}">
            <div class="top">
              <div>
                <div style="font-weight:600;font-size:15px;display:flex;align-items:center;gap:8px">
                  <span class="char-dot" style="background:${r.color}"></span>
                  ${esc(r.name)} ${r.role === "main" ? '<span class="tg main">Main</span>' : ""}
                </div>
                <div class="tip">${esc(r.class || "—")}</div>
              </div>
              <label class="gs">GS <input type="number" min="0" data-gs="${r.id}" value="${r.gs || 0}"></label>
            </div>

            <div class="battery" style="margin:12px 0 8px">
              <div class="battery-body" style="width:100%;max-width:140px;height:28px">
                <div class="battery-fill ${lv}" style="width:${p}%"></div>
              </div>
              <div style="font-size:12px;color:var(--mut)">
                <b>${oe}</b>/${cap}<br>
                <span class="tip">${fullInLabel(oe, cap)}</span>
              </div>
            </div>

            <div class="oe-btns" style="display:flex;gap:6px;margin-bottom:10px">
              <button type="button" data-oe-adj="-40" data-oe-char="${r.id}" class="btn-sm">−40</button>
              <button type="button" data-oe-adj="0" data-oe-char="${r.id}" class="btn-sm">0</button>
              <button type="button" data-oe-adj="40" data-oe-char="${r.id}" class="btn-sm">+40</button>
            </div>

            <!-- Per-char Nightmare -->
            <div class="ticket-row" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px">
              <span>🌑 Nightmare</span>
              <button type="button" data-tk="nightmare" data-char="${r.id}" data-d="-1" class="btn-sm">−</button>
              <b>${nm}/${nmCap}</b>
              <button type="button" data-tk="nightmare" data-char="${r.id}" data-d="1" class="btn-sm">+</button>
            </div>

            <div class="mb">
              <span>Daily</span>
              <div class="bt"><i class="${md[0] === md[1] && md[1] ? "ok" : ""}" style="width:${md[1] ? (md[0]/md[1])*100 : 0}%"></i></div>
              <b>${md[0]}/${md[1]}</b>
            </div>
            <div class="mb">
              <span>Weekly</span>
              <div class="bt"><i class="${mw[0] === mw[1] && mw[1] ? "ok" : ""}" style="width:${mw[1] ? (mw[0]/mw[1])*100 : 0}%"></i></div>
              <b>${mw[0]}/${mw[1]}</b>
            </div>

            <button type="button" data-open="${r.id}" class="btn-sm" style="width:100%;margin-top:8px">Open Missions →</button>
          </div>`;
        }).join("")}
      </div>
    </div>

    <!-- Unfinished dailies + Next events -->
    <div class="grid-2" style="margin-bottom:18px">
      <div class="panel glass">
        <h2>Today · Unfinished Dailies</h2>
        ${unfinished.length === 0
          ? '<p class="tip">All clear 🎉</p>'
          : `<div class="mini-list">
              ${unfinished.slice(0, 8).map(u => `
                <div class="mini-row">
                  <span class="ic">${u.ic}</span>
                  <span>${esc(u.n)}</span>
                  <b style="margin-left:auto">${u.remaining} left</b>
                </div>`).join("")}
            </div>`}
      </div>

      <div class="panel glass">
        <h2>Next Events</h2>
        <div class="mini-list">
          ${nextEv.map(({ e, s }) => {
            const on = s <= Date.now();
            const d = new Date(s);
            const label = DN[d.getUTCDay()] + " " + P2(d.getUTCHours()) + ":" + P2(d.getUTCMinutes()) + " UTC";
            return `
              <div class="mini-row ${on ? "open" : ""}">
                <span class="ic">${e[1]}</span>
                <div>
                  <div style="font-weight:600">${esc(e[0])}</div>
                  <div class="tip">${label}</div>
                </div>
                <b style="margin-left:auto;color:${on ? "var(--green)" : "var(--cyan)"}">
                  ${on ? "OPEN" : "in " + fmtShort(s - Date.now())}
                </b>
              </div>`;
          }).join("")}
        </div>
      </div>
    </div>

    <!-- Roster management (unchanged location) -->
    <div class="panel glass">
      <h2>Roster Management</h2>
      <!-- keep your existing roster add / edit / delete UI here – it was already good -->
      <!-- (copy the roster cards part from your current hubView) -->
    </div>

    <div class="panel glass">
      <h2>Backup & Theme</h2>
      <div class="config-form" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
        <button type="button" id="bkEx" class="btn-sm">Export Backup</button>
        <button type="button" id="bkIm" class="btn-sm">Import Backup</button>
        <input type="file" id="bkF" accept=".json" hidden>
        <select id="themeSelect" style="margin-left:auto">
          <option value="default" ${st.theme === "default" ? "selected" : ""}>Default Neon</option>
          <option value="contrast" ${st.theme === "contrast" ? "selected" : ""}>Higher Contrast</option>
          <option value="dense" ${st.theme === "dense" ? "selected" : ""}>Dense</option>
        </select>
      </div>
    </div>
  `;

  // Membership toggle
  document.getElementById("om").onchange = () => {
    S.set("a2om", document.getElementById("om").checked ? "1" : "0");
    onRender();
  };

  // Theme
  document.getElementById("themeSelect").onchange = (e) => {
    st.theme = e.target.value;
    document.documentElement.setAttribute("data-theme", st.theme);
    persist();
  };

  // Ticket buttons
  app.querySelectorAll("[data-tk]").forEach(btn => {
    btn.onclick = () => {
      const kind = btn.dataset.tk;
      const char = btn.dataset.char || null;
      const d = +btn.dataset.d;
      adjTicket(kind, d, char);
      onRender();
    };
  });

  // Corridor won
  app.querySelectorAll("[data-corr]").forEach(btn => {
    btn.onclick = () => {
      const v = Math.max(0, Math.min(3, corrWon + +btn.dataset.corr));
      S.set("a2corr_won", String(v));
      onRender();
    };
  });
}
