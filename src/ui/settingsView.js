/**
 * Settings view: Theme, Roster Management, Craft profession levels shortcut
 */
import {
  getSt, getRoster, setRoster, persist, activeChar
} from "../state.js";
import { CHAR_COLORS } from "../data.js";
import { esc } from "../helpers.js";
import { S } from "../storage.js";

const KISK_REGIONS = [
  { id: "eu", label: "EU" },
  { id: "na", label: "NA" },
  { id: "kr", label: "KR" },
  { id: "jp", label: "JP" },
  { id: "tw", label: "TW" },
  { id: "sea", label: "SEA" }
];

export function drawSettings(app, { onRender }) {
  const st = getSt();
  const roster = getRoster();
  const theme = st.theme === "light" ? "light" : "dark";

  app.innerHTML = `
    <div class="panel glass">
      <h2>Theme</h2>
      <div class="seg" style="max-width:240px; margin-top:8px">
        <button type="button" data-theme-set="dark" class="${theme !== "light" ? "on" : ""}" style="flex:1">Dark</button>
        <button type="button" data-theme-set="light" class="${theme === "light" ? "on" : ""}" style="flex:1">Light</button>
      </div>
      <p class="tip" style="margin-top:10px">Theme is saved with your account / local data.</p>
    </div>

    <div class="panel glass">
      <h2>Craft · Profession levels</h2>
      <p class="tip" style="margin-bottom:10px">Manage Novice / Professional levels in the Craft tab (affects recipe filtering &amp; doable checks).</p>
      <button type="button" class="btn-sm on" data-goto-craft-profs>Open Craft →</button>
    </div>

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
          <label class="tip">Region</label>
          <select id="newRegion">
            <option value="">—</option>
            ${KISK_REGIONS.map(rg => `<option value="${rg.id}">${rg.label}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="tip">Server</label>
          <input type="text" id="newServer" placeholder="e.g. Nezekan" maxlength="24">
        </div>
        <div class="color-pick" id="newColorPick">
          ${CHAR_COLORS.map(col =>
            `<button type="button" class="color-swatch" data-color="${col}" style="background:${col}"></button>`
          ).join("")}
          <input type="hidden" id="newColor" value="${CHAR_COLORS[0]}">
        </div>
        <button type="button" id="addChar" class="btn-sm on">+</button>
      </div>

      <div class="roster-grid">
        ${roster.map(c => {
          if (st.editingChar === c.id) {
            return `
            <div class="char-card editing" style="border-left:3px solid ${c.color}">
              <div class="row-fields">
                <input type="text" id="editName" value="${esc(c.name)}" maxlength="20">
                <input type="text" id="editClass" value="${esc(c.class || "")}" maxlength="16" style="width:110px" placeholder="Class">
              </div>
              <div class="row-fields">
                <select id="editRole">
                  <option value="main" ${c.role === "main" ? "selected" : ""}>Main</option>
                  <option value="alt" ${c.role === "alt" ? "selected" : ""}>Alt</option>
                </select>
                <select id="editRegion" title="Region">
                  <option value="">Region —</option>
                  ${KISK_REGIONS.map(rg =>
                    `<option value="${rg.id}" ${c.region === rg.id ? "selected" : ""}>${rg.label}</option>`
                  ).join("")}
                </select>
                <input type="text" id="editServer" value="${esc(c.server || "")}" maxlength="24" style="width:120px" placeholder="Server">
                <div class="color-pick" id="editColorPick">
                  ${CHAR_COLORS.map(col =>
                    `<button type="button" class="color-swatch ${col === c.color ? "on" : ""}" data-color="${col}" style="background:${col}"></button>`
                  ).join("")}
                </div>
                <input type="hidden" id="editColor" value="${c.color}">
              </div>
              <div class="actions">
                <button type="button" data-save-char="${c.id}" class="btn-sm on">Save</button>
                <button type="button" data-cancel-char class="btn-sm">✕</button>
              </div>
            </div>`;
          }
          const regionLbl = (KISK_REGIONS.find(x => x.id === c.region) || {}).label || "";
          const whereMeta = [regionLbl, c.server].filter(Boolean).join(" · ");
          return `
          <div class="char-card ${c.id === st.activeChar ? "active" : ""}" style="border-left:3px solid ${c.color}">
            <div class="name">
              <span class="char-dot" style="background:${c.color}"></span>
              ${esc(c.name)} ${c.role === "main" ? '<span class="tg main">Main</span>' : ""}
            </div>
            <div class="meta">${esc(c.class || "—")}${whereMeta ? ` · ${esc(whereMeta)}` : ""}</div>
            <div class="stats">
              <button type="button" data-edit-char="${c.id}" class="btn-sm" title="Edit">✎</button>
              <button type="button" data-set-active="${c.id}" class="btn-sm" title="Select">✓</button>
              ${roster.length > 1 ? `<button type="button" data-del="${c.id}" class="btn-sm btn-danger" title="Delete">✕</button>` : ""}
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>
  `;


  // Theme buttons handled globally via data-theme-set in main.js
  // Roster add/edit/save/delete handled by main.js delegated handlers

  app.querySelector("[data-goto-craft-profs]")?.addEventListener("click", () => {
    getSt().tab = "craft";
    getSt().craftShowProfs = true;
    persist();
    onRender();
  });
}
