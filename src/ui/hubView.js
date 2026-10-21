/** Overview hub: energy grid + roster management + backup */
import {
  getSt, getRoster, S, persist, activeChar
} from "../state.js";
import {
  applyOdyleTicks, getOdyleCap, isMembership, getOdyleVal, setOdyleVal,
  getOdyle, batteryLevel, fullInLabel, nextUtcTick
} from "../odyle.js";
import { cnt } from "../missions.js";
import { CHAR_COLORS } from "../data.js";
import { esc, fmtShort, fmtUtcTime } from "../helpers.js";

export function drawHub(app, { onRender }) {
  applyOdyleTicks();
  const st = getSt();
  const roster = getRoster();
  const cap = getOdyleCap();
  const om = isMembership();

  const rows = roster.map(r => ({
    r,
    md: cnt("d", r.id),
    mw: cnt("w", r.id),
    oe: getOdyleVal(r.id)
  }));

  const bar = (l, [a, b]) => `
    <div class="mb">
      <span>${l}</span>
      <div class="bt"><i class="${b && a === b ? "ok" : ""}" style="width:${b ? (a / b) * 100 : 0}%"></i></div>
      <b>${b ? a + "/" + b : "—"}</b>
    </div>`;

  app.innerHTML = `
    <div class="panel glass">
      <div class="ctrl-bar" style="margin-bottom:14px">
        <h2 style="margin:0">Characters · Energy & Progress</h2>
        <label class="tg" style="cursor:pointer;margin-left:auto">
          <input type="checkbox" id="om" ${om ? "checked" : ""}> Membership (840)
        </label>
      </div>
      <div class="dgrid dgrid-4">
        ${rows.map(({ r, md, mw, oe }) => {
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
            <div class="battery" style="margin:12px 0 10px">
              <div class="battery-body" style="width:100%;max-width:140px;height:32px">
                <div class="battery-fill ${lv}" style="width:${p}%"></div>
              </div>
              <div class="battery-meta">
                <div class="val" style="font-size:18px">${oe}<span style="font-size:12px;color:var(--muted)">/${cap}</span></div>
                <div class="sub full-at">${fullInLabel(oe, cap)}</div>
              </div>
            </div>
            <div class="energy-step per-char-energy">
              <button type="button" data-oe-char="${r.id}" data-oe-adj="-40" class="btn-sm oe-adj">−40</button>
              <input type="number" min="0" max="2000" data-oe-input="${r.id}" value="${oe}" style="width:64px;text-align:center">
              <button type="button" data-oe-char="${r.id}" data-oe-adj="40" class="btn-sm oe-adj">+40</button>
            </div>
            ${bar("Daily", md)}
            ${bar("Weekly", mw)}
            <button type="button" data-open="${r.id}" class="btn-sm" style="margin-top:10px;width:100%">Open Missions →</button>
          </div>`;
        }).join("")}
      </div>
      <div class="tip" style="margin-top:14px;line-height:1.7">
        ⏳ Next +15 in <b id="odyle-next" style="color:var(--cyan)">${fmtShort(Math.max(0, nextUtcTick() - Date.now()))}</b>
        · ${fmtUtcTime(nextUtcTick())} UTC
        · Natural 120/day · Morph/Shop +40
      </div>
    </div>

    <div class="panel glass" id="roster-section">
      <h2>Roster Management</h2>
      <div class="config-form">
        <input type="text" id="newName" placeholder="Name" maxlength="20">
        <select id="newRole"><option value="main">Main</option><option value="alt" selected>Alt</option></select>
        <input type="text" id="newClass" placeholder="Class" maxlength="16">
        <input type="number" id="newGS" placeholder="GS" min="0" style="width:80px">
        <div class="color-pick" id="newColorPick">
          ${CHAR_COLORS.map((col, i) =>
            `<button type="button" class="color-swatch ${i === 0 ? "on" : ""}" data-color="${col}" style="background:${col}"></button>`
          ).join("")}
        </div>
        <input type="hidden" id="newColor" value="${CHAR_COLORS[0]}">
        <button type="button" id="addChar" class="btn-sm on">+ Add</button>
      </div>
      <div class="roster-grid">
        ${roster.map(c => {
          if (st.editingChar === c.id) {
            return `
            <div class="char-card editing" style="border-left:3px solid ${c.color}">
              <div class="row-fields">
                <input type="text" id="editName" value="${esc(c.name)}" maxlength="20">
                <input type="text" id="editClass" value="${esc(c.class || "")}" maxlength="16" style="width:120px" placeholder="Class">
                <input type="number" id="editGS" value="${c.gs || 0}" min="0" style="width:80px">
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

    <div class="panel glass">
      <h2>Backup</h2>
      <div class="config-form">
        <button type="button" id="bkEx" class="btn-sm">Export Backup</button>
        <button type="button" id="bkIm" class="btn-sm">Import Backup</button>
        <input type="file" id="bkF" accept=".json" hidden>
      </div>
    </div>`;

  document.getElementById("om").onchange = () => {
    S.set("a2om", document.getElementById("om").checked ? "1" : "0");
    const cap2 = getOdyleCap();
    getRoster().forEach(c => {
      const v = getOdyleVal(c.id);
      if (v > cap2) setOdyleVal(c.id, cap2);
    });
    onRender();
  };
  document.querySelectorAll("#editColorPick .color-swatch, #newColorPick .color-swatch").forEach(btn => {
    btn.onclick = () => {
      const pick = btn.closest(".color-pick");
      pick.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("on"));
      btn.classList.add("on");
      const hidden =
        pick.parentElement.querySelector("input[type=hidden]") ||
        document.getElementById(pick.id === "newColorPick" ? "newColor" : "editColor");
      if (hidden) hidden.value = btn.dataset.color;
    };
  });
  document.querySelectorAll("[data-oe-input]").forEach(inp => {
    inp.addEventListener("change", () => {
      setOdyleVal(inp.dataset.oeInput, inp.value);
      persist();
      onRender();
    });
  });
}
