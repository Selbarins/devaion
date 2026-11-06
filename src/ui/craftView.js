import { getSt, persist } from "../state.js";
import { esc } from "../helpers.js";

let recipesCache = null;
let itemsCache = null;

async function loadData() {
  if (recipesCache && itemsCache) return;
  try {
    const [rRes, iRes] = await Promise.all([
      fetch("/data/recipes.json"),
      fetch("/data/items.json")
    ]);
    recipesCache = await rRes.json();
    itemsCache = await iRes.json();
  } catch (e) {
    console.error("Failed to load craft data", e);
    recipesCache = [];
    itemsCache = {};
  }
}

function itemName(id) {
  return itemsCache?.[id]?.name || id;
}

function getRecipe(id) {
  return (recipesCache || []).find(r => r.id === id);
}

// ---------- Crafting Log helpers ----------
function getLog() {
  const st = getSt();
  if (!st.craftLog) st.craftLog = [];          // [{ recipeId, qty }]
  if (!st.craftHave) st.craftHave = {};        // { itemId: number }
  if (!st.craftExpanded) st.craftExpanded = {}; // { recipeId: true }
  return st;
}

function addToLog(recipeId, qty = 1) {
  const st = getLog();
  const existing = st.craftLog.find(x => x.recipeId === recipeId);
  if (existing) {
    existing.qty += qty;
  } else {
    st.craftLog.push({ recipeId, qty });
  }
  persist();
}

function setLogQty(recipeId, qty) {
  const st = getLog();
  const entry = st.craftLog.find(x => x.recipeId === recipeId);
  if (!entry) return;
  entry.qty = Math.max(1, qty | 0);
  persist();
}

function removeFromLog(recipeId) {
  const st = getLog();
  st.craftLog = st.craftLog.filter(x => x.recipeId !== recipeId);
  persist();
}

function setHave(itemId, amount) {
  const st = getLog();
  st.craftHave[itemId] = Math.max(0, amount | 0);
  persist();
}

// Aggregate materials (simple version – no cascade expand yet)
function aggregateMaterials() {
  const st = getLog();
  const totals = {}; // itemId → needed qty

  for (const entry of st.craftLog) {
    const recipe = getRecipe(entry.recipeId);
    if (!recipe) continue;
    for (const ing of recipe.ingredients || []) {
      totals[ing.itemId] = (totals[ing.itemId] || 0) + ing.qty * entry.qty;
    }
  }
  return totals;
}

// ---------- Main draw ----------
export async function drawCraft(app, { onRender }) {
  const st = getSt();
  if (!st.craftSub) st.craftSub = "browser";

  await loadData();

  const recipes = recipesCache || [];
  const search = (st.craftSearch || "").toLowerCase().trim();
  const profFilter = st.craftProfFilter || "All";

  let list = recipes;
  if (profFilter !== "All") {
    list = list.filter(r => r.profession === profFilter);
  }
  if (search) {
    list = list.filter(r =>
      r.name.toLowerCase().includes(search) ||
      r.profession.toLowerCase().includes(search) ||
      r.id.toLowerCase().includes(search)
    );
  }

  app.innerHTML = `
    <div class="panel glass">
      <div class="ctrl-bar">
        <h2 style="margin:0">Crafting</h2>
        <div class="seg" style="margin-left:14px">
          <button type="button" data-craft-sub="browser" class="${st.craftSub !== "log" ? "on" : ""}">Recipes</button>
          <button type="button" data-craft-sub="log" class="${st.craftSub === "log" ? "on" : ""}">Crafting Log</button>
        </div>
      </div>

      ${st.craftSub === "log" ? renderLog() : renderBrowser(list, st)}
    </div>
  `;
}

// ---------- Recipes browser ----------
function renderBrowser(list, st) {
  const profs = ["All", "Blacksmithing", "Armorsmithing", "Handicrafting", "Alchemy", "Cooking"];

  return `
    <div style="margin-top:8px">
      <div class="ctrl-bar">
        <input type="search" id="craftSearch" placeholder="Search recipes..."
               value="${esc(st.craftSearch || "")}" style="min-width:220px">
        <div class="seg">
          ${profs.map(p => `
            <button type="button" data-craft-prof="${p}"
                    class="${(st.craftProfFilter || "All") === p ? "on" : ""}">${p}</button>
          `).join("")}
        </div>
      </div>

      <div style="margin-top:16px">
        ${list.length === 0
          ? `<div class="panel"><p class="tip" style="margin:0">No recipes found.</p></div>`
          : list.map(r => recipeRow(r)).join("")
        }
      </div>
    </div>
  `;
}

function recipeRow(r) {
  const rankLabel = r.rank ? `${r.rank} ${r.level || ""}`.trim() : (r.level ? `Lv ${r.level}` : "");
  const mats = (r.ingredients || [])
    .map(ing => `${ing.qty}× ${itemName(ing.itemId)}`)
    .join(", ");

  return `
    <div class="row">
      <div class="ic">🔨</div>
      <div>
        <div class="hd">
          <h3>${esc(r.name)}</h3>
          <span class="tg">${esc(r.profession)}</span>
          ${rankLabel ? `<span class="tg">${esc(rankLabel)}</span>` : ""}
        </div>
        <div class="tip">${esc(mats || "No materials listed")}</div>
      </div>
      <div class="ctl">
        <button type="button" class="btn-sm" data-add-craft="${r.id}">+ Log</button>
      </div>
    </div>
  `;
}

// ---------- Crafting Log ----------
function renderLog() {
  const st = getLog();
  const log = st.craftLog || [];
  const totals = aggregateMaterials();
  const have = st.craftHave || {};

  // Planned recipes section
  const plannedHtml = log.length === 0
    ? `<p class="tip">No recipes in the log yet. Go to Recipes and click “+ Log”.</p>`
    : log.map(entry => {
        const r = getRecipe(entry.recipeId);
        if (!r) return "";
        return `
          <div class="row">
            <div class="ic">📋</div>
            <div>
              <div class="hd">
                <h3>${esc(r.name)}</h3>
                <span class="tg">${esc(r.profession)}</span>
              </div>
            </div>
            <div class="ctl">
              <input type="number" min="1" value="${entry.qty}"
                     data-log-qty="${entry.recipeId}" style="width:64px">
              <button type="button" class="btn-sm btn-danger" data-log-remove="${entry.recipeId}">✕</button>
            </div>
          </div>
        `;
      }).join("");

  // Materials section
  const matIds = Object.keys(totals);
  const matsHtml = matIds.length === 0
    ? `<p class="tip">No materials to show.</p>`
    : `
      <div class="row" style="font-weight:600; color:var(--mut); border-bottom:1px solid var(--line); margin-bottom:6px;">
        <div></div>
        <div>Material</div>
        <div class="ctl" style="gap:12px;">
          <span style="width:70px; text-align:center;">Have</span>
          <span style="width:70px; text-align:center;">Need</span>
          <span style="width:70px; text-align:center;">Missing</span>
        </div>
      </div>
      ${matIds.map(id => {
        const need = totals[id];
        const haveAmt = have[id] || 0;
        const missing = Math.max(0, need - haveAmt);
        const missingClass = missing > 0 ? "craft-missing" : "craft-ok";
        return `
          <div class="row">
            <div class="ic">🧱</div>
            <div>
              <div class="hd"><h3>${esc(itemName(id))}</h3></div>
            </div>
            <div class="ctl" style="gap:12px;">
              <input type="number" min="0" value="${haveAmt}"
                     data-have="${id}" style="width:70px; text-align:center;">
              <span style="width:70px; text-align:center;">${need}</span>
              <span class="${missingClass}" style="width:70px; text-align:center; font-weight:600;">${missing}</span>
            </div>
          </div>
        `;
      }).join("")}
    `;

  return `
    <div style="margin-top:8px">
      <div class="panel">
        <h2>Planned Crafts</h2>
        ${plannedHtml}
      </div>

      <div class="panel" style="margin-top:16px">
        <h2>Materials Needed</h2>
        ${matsHtml}
      </div>
    </div>
  `;
}
