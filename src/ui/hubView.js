/** Overview hub: energy + tickets + unfinished dailies + next events + roster + backup */
import {
  getSt, getRoster, setRoster, S, persist, activeChar
} from "../state.js";
import {
  applyOdyleTicks, getOdyleCap, isMembership, getOdyleVal, setOdyleVal,
  batteryLevel, fullInLabel
} from "../odyle.js";
import { cnt, unfinishedDailies } from "../missions.js";
import { getTicket, adjTicket, getTicketCap } from "../tickets.js";
import { CHAR_COLORS, EV, DN } from "../data.js";
import { esc, fmtShort, P2 } from "../helpers.js";

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
  .slice(0, 5);
}

/** SVG progress ring — pct 0–100 */
function ringSvg(pct, size = 44, stroke = 3.5, ok = false) {
  const r = (size / 2) - stroke;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  const cls = ok ? "ring-ok" : "ring-fill";
  return `
    <svg class="prog-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle class="ring-bg" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${stroke}" fill="none"/>
      <circle class="${cls}" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${stroke}" fill="none"
        stroke-dasharray="${c}" stroke-dashoffset="${offset}" transform="rotate(-90 ${size/2} ${size/2})"/>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" class="ring-text">${Math.round(pct)}%</text>
    </svg>`;
}

export function drawHub(app, { onRender }) {
  applyOdyleTicks();
  const st = getSt();
  const roster = getRoster();
  const cap = getOdyleCap();
  const om = isMembership();
  const corrWon = +S.get("a2corr_won") || 0;
  const expanded = new Set(st.hubExpanded || []);

  const rows = roster.map(r => {
    const md = cnt("d", r.id);
    const mw = cnt("w", r.id);
    const oe = getOdyleVal(r.id);
    const nm = getTicket("nightmare", r.id);
    const asc = getTicket("ascension", r.id);
    const nmCap = getTicketCap("nightmare");
    const ascCap = getTicketCap("ascension");
    const dailyPct = md[1] ? (md[0] / md[1]) * 100 : 0;
    const weeklyPct = mw[1] ? (mw[0] / mw[1]) * 100 : 0;
    const runs = Math.floor(oe / 80);
    const atCap = oe >= cap;
    const nearCap = oe >= cap - 30;
    const nmNear = nm >= nmCap - 2 && nmCap > 0;
    const ascNear = asc >= ascCap - 1 && ascCap > 0;
    const allClear = md[1] > 0 && md[0] >= md[1];
    return { r, md, mw, oe, nm, asc, nmCap, ascCap, dailyPct, weeklyPct, runs, atCap, nearCap, nmNear, ascNear, allClear };
  });

  const shugo = getTicket("shugo");
  const dim = getTicket("dim");
  const unfinished = unfinishedDailies();
  const nextEv = nextEventTimes();

  app.innerHTML = `
    <div class="panel glass wing-motif">
      <div class="ctrl-bar">
        <h2>Characters · Energy & Tickets</h2>
        <label class="tg" style="cursor:pointer;margin-left:auto">
          <input type="checkbox" id="om" ${om ? "checked" : ""}> Membership
        </label>
        <div class="theme-toggle seg" title="Theme">
          <button type="button" data-theme-set="dark" class="${(st.theme || "dark") !== "light" ? "on" : ""}">Dark</button>
          <button type="button" data-theme-set="light" class="${st.theme === "light" ? "on" : ""}">Light</button>
        </div>
      </div>

      <div class="shared-tickets">
        <div class="ticket-card ${shugo >= getTicketCap("shugo") - 2 ? "ticket-near" : ""}">
          <div class="ticket-head">
            <span class="ticket-label">🎁 Shugo</span>
            <div class="ticket-controls">
              <button type="button" data-tk="shugo" data-d="-1">−</button>
              <span class="ticket-val">${shugo}/${getTicketCap("shugo")}</span>
              <button type="button" data-tk="shugo" data-d="1">+</button>
            </div>
          </div>
          <div class="tbar ${shugo > getTicketCap("shugo") ? "over" : shugo >= getTicketCap("shugo") ? "full" : ""}">
            <i style="width:${Math.min(100, (shugo / Math.max(1, getTicketCap("shugo"))) * 100)}%"></i>
          </div>
        </div>

        <div class="ticket-card ${dim >= getTicketCap("dim") - 1 ? "ticket-near" : ""}">
          <div class="ticket-head">
            <span class="ticket-label">🕳 Dimensional</span>
            <div class="ticket-controls">
              <button type="button" data-tk="dim" data-d="-1">−</button>
              <span class="ticket-val">${dim}/${getTicketCap("dim")}</span>
              <button type="button" data-tk="dim" data-d="1">+</button>
            </div>
          </div>
          <div class="tbar ${dim > getTicketCap("dim") ? "over" : dim >= getTicketCap("dim") ? "full" : ""}">
            <i style="width:${Math.min(100, (dim / Math.max(1, getTicketCap("dim"))) * 100)}%"></i>
          </div>
        </div>

        <div class="ticket-card">
          <div class="ticket-head">
            <span class="ticket-label">🌀 Corridors</span>
            <div class="ticket-controls">
              <button type="button" data-corr="-1">−</button>
              <span class="ticket-val">${corrWon}/3</span>
              <button type="button" data-corr="1">+</button>
            </div>
          </div>
          <div class="tbar ${corrWon >= 3 ? "full" : ""}">
            <i style="width:${Math.min(100, (corrWon / 3) * 100)}%"></i>
          </div>
        </div>
      </div>

      <div class="dgrid dgrid-4">
        ${rows.map(({ r, md, mw, oe, nm, asc, nmCap, ascCap, dailyPct, weeklyPct, runs, atCap, nearCap, nmNear, ascNear, allClear }) => {
          const p = Math.min(100, Math.round((oe / cap) * 100));
          const lv = batteryLevel(oe, cap);
          const isExp = expanded.has(r.id);
          const urgency = atCap ? "cap-hit-card" : nearCap ? "cap-warn-card pulse-red" : allClear ? "all-clear-card" : "";
          const ticketUrgency = (nmNear || ascNear) ? "ticket-urgency" : "";
          return `
          <div class="dc char-hub-card ${urgency} ${ticketUrgency} ${isExp ? "expanded" : "collapsed"}"
               style="border-left:3px solid ${r.color}" data-char-card="${r.id}">

            <!-- ===== STATUS STRIP (always visible) ===== -->
            <div class="status-strip" data-toggle-expand="${r.id}">
              <div class="strip-left">
                <div class="strip-name">
                  <span class="char-dot" style="background:${r.color}"></span>
                  <span class="name-text">${esc(r.name)}</span>
                  ${r.role === "main" ? '<span class="tg main">Main</span>' : ""}
                  ${allClear ? '<span class="clear-badge" title="All dailies done">✓</span>' : ""}
                </div>
                <div class="tip strip-meta">${esc(r.class || "—")}</div>
              </div>

              <div class="strip-odyle">
                <div class="battery-mini">
                  <div class="battery-body mini">
                    <div class="battery-fill ${lv}" style="width:${p}%"></div>
                  </div>
                  <div class="oe-meta">
                    <b>${oe}</b><span class="oe-cap">/${cap}</span>
                    <span class="runs-pill" title="Double runs (energy ÷ 80)">${runs} Runs</span>
                  </div>
                </div>
                <div class="tip oe-full">${fullInLabel(oe, cap)}</div>
              </div>

              <div class="strip-tickets">
                <span class="mini-tk ${nmNear ? "near" : ""}" title="Nightmare">🌑 ${nm}/${nmCap}</span>
                <span class="mini-tk ${ascNear ? "near" : ""}" title="Ascension">🗼 ${asc}/${ascCap}</span>
              </div>

              <div class="strip-rings">
                <div class="ring-wrap" title="Daily ${md[0]}/${md[1]}">
                  ${ringSvg(dailyPct, 40, 3.2, allClear)}
                  <span class="ring-label">D</span>
                </div>
                <div class="ring-wrap" title="Weekly ${mw[0]}/${mw[1]}">
                  ${ringSvg(weeklyPct, 40, 3.2, mw[1] > 0 && mw[0] >= mw[1])}
                  <span class="ring-label">W</span>
                </div>
              </div>

              <label class="gs strip-gs" onclick="event.stopPropagation()">
                GS <input type="number" min="0" data-gs="${r.id}" value="${r.gs || 0}">
              </label>

              <button type="button" class="expand-chevron" data-toggle-expand="${r.id}" aria-label="Expand">
                ${isExp ? "▴" : "▾"}
              </button>
            </div>

            <!-- ===== EXPANDED DETAILS (no info dropped) ===== -->
            <div class="card-details" ${isExp ? "" : "hidden"}>
              <div class="oe-btns">
                <button type="button" data-oe-adj="-40" data-oe-char="${r.id}" class="btn-sm">−40</button>
                <input type="number" min="0" max="2000" data-oe-input="${r.id}" value="${oe}" style="width:64px;text-align:center">
                <button type="button" data-oe-adj="40" data-oe-char="${r.id}" class="btn-sm">+40</button>
              </div>

              <div class="ticket-block ${nmNear ? "ticket-near" : ""}">
                <div class="ticket-head">
                  <span class="ticket-label">🌑 Nightmare</span>
                  <div class="ticket-controls">
                    <button type="button" data-tk="nightmare" data-char="${r.id}" data-d="-1">−</button>
                    <span class="ticket-val">${nm}/${nmCap}</span>
                    <button type="button" data-tk="nightmare" data-char="${r.id}" data-d="1">+</button>
                  </div>
                </div>
                <div class="tbar ${nm > nmCap ? "over" : nm >= nmCap ? "full" : ""}">
                  <i style="width:${Math.min(100, (nm / Math.max(1, nmCap)) * 100)}%"></i>
                </div>
              </div>

              <div class="ticket-block ${ascNear ? "ticket-near" : ""}">
                <div class="ticket-head">
                  <span class="ticket-label">🗼 Ascension</span>
                  <div class="ticket-controls">
                    <button type="button" data-tk="ascension" data-char="${r.id}" data-d="-1">−</button>
                    <span class="ticket-val">${asc}/${ascCap}</span>
                    <button type="button" data-tk="ascension" data-char="${r.id}" data-d="1">+</button>
                  </div>
                </div>
                <div class="tbar ${asc > ascCap ? "over" : asc >= ascCap ? "full" : ""}">
                  <i style="width:${Math.min(100, (asc / Math.max(1, ascCap)) * 100)}%"></i>
                </div>
              </div>

              <div class="mb">
                <span>Daily</span>
                <div class="bt"><i class="${allClear ? "ok" : ""}" style="width:${dailyPct}%"></i></div>
                <b>${md[0]}/${md[1]}</b>
              </div>
              <div class="mb">
                <span>Weekly</span>
                <div class="bt"><i class="${mw[1] > 0 && mw[0] >= mw[1] ? "ok" : ""}" style="width:${weeklyPct}%"></i></div>
                <b>${mw[0]}/${mw[1]}</b>
              </div>

              <button type="button" data-open="${r.id}" class="btn-open">Open Missions →</button>
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>

    <div class="grid-2">
      <div class="panel glass">
        <h2>Today · Unfinished Dailies</h2>
        ${unfinished.length === 0
          ? `<div class="empty-celebrate">
               <div class="celebrate-icon">🎉</div>
               <p class="tip">All clear — great work</p>
             </div>`
          : `<div class="mini-list">
              ${unfinished.slice(0, 8).map(u => `
              <div class="mini-row">
                  <span class="ic">${u.ic}</span>
                  <div>
                    <div class="mini-title">${esc(u.n)}</div>
                  </div>
                  <b>${u.remaining} left</b>
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
              <div class="mini-row ${on ? "open" : ""}" data-ev-start="${s}">
                <span class="ic">${e[1]}</span>
                <div>
                  <div class="mini-title">${esc(e[0])}</div>
                  <div class="tip">${label}</div>
                </div>
              <b class="ev-countdown" style="color:${on ? "var(--green)" : "var(--cyan)"}">${on ? "OPEN" : "in " + fmtShort(s - Date.now())}</b>
              </div>`;
          }).join("")}
        </div>
      </div>
    </div>

    <!-- ROSTER MANAGEMENT -->
    <div class="panel glass">
      <h2>Roster Management</h2>

      <div class="roster-add">
        <div>
          <label class="tip">Name</label>
          <input type="text" id="newName" placeholder="Character name" maxlength="20">
        </div>
        <div>
          <label class="tip">Role</label>
          <select id="newRole">
            <option value="alt">Alt</option>
            <option value="main">Main</option>
          </select>
        </div>
        <div>
          <label class="tip">Class</label>
          <input type="text" id="newClass" placeholder="Class" maxlength="16">
        </div>
        <div>
          <label class="tip">GS</label>
          <input type="number" id="newGS" value="0" min="0">
        </div>
        <div class="color-pick" id="newColorPick">
          ${CHAR_COLORS.map(col =>
            `<button type="button" class="color-swatch" data-color="${col}" style="background:${col}"></button>`
          ).join("")}
          <input type="hidden" id="newColor" value="${CHAR_COLORS[0]}">
        </div>
        <button type="button" id="addChar" class="btn-sm on">+ Add</button>
      </div>

      <div class="roster-grid">
        ${roster.map(c => {
          if (st.editingChar === c.id) {
            return `
            <div class="char-card editing" style="border-left:3px solid ${c.color}">
              <div class="row-fields">
                <input type="text" id="editName" value="${esc(c.name)}" maxlength="20">
                <input type="text" id="editClass" value="${esc(c.class || "")}" maxlength="16" style="width:110px" placeholder="Class">
                <input type="number" id="editGS" value="${c.gs || 0}" min="0" style="width:70px">
              </div>
              <div class="row-fields">
                <select id="editRole">
                  <option value="main" ${c.role === "main" ? "selected" : ""}>Main</option>
                  <option value="alt" ${c.role === "alt" ? "selected" : ""}>Alt</option>
                </select>
                <div class="color-pick" id="editColorPick">
                  ${CHAR_COLORS.map(col =>
                    `<button type="button" class="color-swatch ${col === c.color ? "on" : ""}" data-color="${col}" style="background:${col}"></button>`
                  ).join("")}
                </div>
                <input type="hidden" id="editColor" value="${c.color}">
              </div>
              <div class="actions">
                <button type="button" data-save-char="${c.id}" class="btn-sm on">Save</button>
                <button type="button" data-cancel-char class="btn-sm">Cancel</button>
              </div>
            </div>`;
          }
          return `
          <div class="char-card ${c.id === st.activeChar ? "active" : ""}" style="border-left:3px solid ${c.color}">
            <div class="name">
              <span class="char-dot" style="background:${c.color}"></span>
              ${esc(c.name)} ${c.role === "main" ? '<span class="tg main">Main</span>' : ""}
            </div>
            <div class="meta">${esc(c.class || "—")} · GS ${c.gs || "—"}</div>
            <div class="stats">
              <button type="button" data-edit-char="${c.id}" class="btn-sm">Edit</button>
              <button type="button" data-set-active="${c.id}" class="btn-sm">Select</button>
              ${roster.length > 1 ? `<button type="button" data-del="${c.id}" class="btn-sm btn-danger">Delete</button>` : ""}
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>
  `;

  // Membership
  document.getElementById("om").onchange = () => {
    S.set("a2om", document.getElementById("om").checked ? "1" : "0");
    persist();
    onRender();
  };

  // Theme toggle
  app.querySelectorAll("[data-theme-set]").forEach(btn => {
    btn.onclick = () => {
      const t = btn.dataset.themeSet;
      getSt().theme = t;
      document.documentElement.setAttribute("data-theme", t);
      persist();
      onRender();
    };
  });

  // Expand / collapse character cards
  app.querySelectorAll("[data-toggle-expand]").forEach(el => {
    el.onclick = (e) => {
      e.stopPropagation();
      const id = el.dataset.toggleExpand;
      const list = getSt().hubExpanded || [];
      const i = list.indexOf(id);
      if (i >= 0) list.splice(i, 1);
      else list.push(id);
      getSt().hubExpanded = list;
      persist();
      onRender();
    };
  });

  // Color pickers
  document.querySelectorAll("#newColorPick .color-swatch, #editColorPick .color-swatch").forEach(btn => {
    btn.onclick = () => {
      const pick = btn.closest(".color-pick");
      pick.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("on"));
      btn.classList.add("on");
      const hidden = pick.querySelector("input[type=hidden]") ||
        document.getElementById(pick.id === "newColorPick" ? "newColor" : "editColor");
      if (hidden) hidden.value = btn.dataset.color;
    };
  });

  // Ticket buttons
  app.querySelectorAll("[data-tk]").forEach(btn => {
    btn.onclick = () => {
      adjTicket(btn.dataset.tk, +btn.dataset.d, btn.dataset.char || null);
      persist();
      onRender();
    };
  });

  // Corridor
  app.querySelectorAll("[data-corr]").forEach(btn => {
    btn.onclick = () => {
      const v = Math.max(0, Math.min(3, corrWon + +btn.dataset.corr));
      S.set("a2corr_won", String(v));
      persist();
      onRender();
    };
  });

  // Add character
  document.getElementById("addChar").onclick = () => {
    const name = document.getElementById("newName").value.trim();
    if (!name) return;
    const role = document.getElementById("newRole").value;
    const list = getRoster();
    if (role === "main") list.forEach(c => c.role = "alt");
    list.push({
      id: "c" + Date.now(),
      name,
      role,
      class: document.getElementById("newClass").value.trim(),
      gs: +document.getElementById("newGS").value || 0,
      color: document.getElementById("newColor").value || CHAR_COLORS[0]
    });
    setRoster(list);
    persist();
    onRender();
  };

  // Manual Odyle value
  app.querySelectorAll("[data-oe-input]").forEach(inp => {
    inp.addEventListener("change", () => {
      setOdyleVal(inp.dataset.oeInput, inp.value);
      persist();
      onRender();
    });
  });

  // GS inputs (hub cards)
  app.querySelectorAll("[data-gs]").forEach(inp => {
    inp.addEventListener("change", () => {
      const list = getRoster();
      const c = list.find(x => x.id === inp.dataset.gs);
      if (c) {
        c.gs = Math.max(0, +inp.value || 0);
        setRoster(list);
        persist();
      }
    });
  });
}
