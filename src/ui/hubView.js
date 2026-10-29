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
    nm: getTicket("nightmare", r.id),
    asc: getTicket("ascension", r.id)
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

      <div class="shared-tickets">
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
          <b>${corrWon}</b>
          <button type="button" data-corr="1">+</button>
          <span class="tip">max 3 · resets siege day 00:00 UTC</span>
        </div>
      </div>

      <div class="dgrid dgrid-4">
        ${rows.map(({ r, md, mw, oe, nm, asc }) => {
          const p = Math.min(100, Math.round((oe / cap) * 100));
          const lv = batteryLevel(oe, cap);
          const atCap = oe >= cap;
          const nearCap = oe >= cap - 30;
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

            <div class="oe-btns">
              <button type="button" data-oe-adj="-40" data-oe-char="${r.id}" class="btn-sm">−40</button>
              <button type="button" data-oe-adj="0" data-oe-char="${r.id}" class="btn-sm">0</button>
              <button type="button" data-oe-adj="40" data-oe-char="${r.id}" class="btn-sm">+40</button>
            </div>

            <div class="ticket-row">
              <span>🌑 Nightmare</span>
              <button type="button" data-tk="nightmare" data-char="${r.id}" data-d="-1" class="btn-sm">−</button>
              <b>${nm}/${getTicketCap("nightmare")}</b>
              <button type="button" data-tk="nightmare" data-char="${r.id}" data-d="1" class="btn-sm">+</button>
            </div>
            <div class="ticket-row">
              <span>🗼 Ascension</span>
              <button type="button" data-tk="ascension" data-char="${r.id}" data-d="-1" class="btn-sm">−</button>
              <b>${asc}/${getTicketCap("ascension")}</b>
              <button type="button" data-tk="ascension" data-char="${r.id}" data-d="1" class="btn-sm">+</button>
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

    <!-- ROSTER MANAGEMENT -->
    <div class="panel glass">
      <h2>Roster Management</h2>

      <div class="roster-add" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;align-items:flex-end">
        <div>
          <label class="tip">Name</label>
          <input type="text" id="newName" placeholder="Character name" maxlength="20" style="width:140px">
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
          <input type="text" id="newClass" placeholder="Class" maxlength="16" style="width:110px">
        </div>
        <div>
          <label class="tip">GS</label>
          <input type="number" id="newGS" value="0" min="0" style="width:70px">
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
    onRender();
  };


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
      onRender();
    };
  });

  // Corridor
  app.querySelectorAll("[data-corr]").forEach(btn => {
    btn.onclick = () => {
      const v = Math.max(0, Math.min(3, corrWon + +btn.dataset.corr));
      S.set("a2corr_won", String(v));
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
}
