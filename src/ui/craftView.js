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

export async function drawCraft(app, { onRender }) {
  const st = getSt();
  if (!st.craftSub) st.craftSub = "browser";

  // Load data the first time
  await loadData();

  const recipes = recipesCache || [];
  const search = (st.craftSearch || "").toLowerCase().trim();
  const profFilter = st.craftProfFilter || "All";

  // Filter recipes
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
  const rankLabel = r.rank ? `${r.rank} ${r.level || ""}` : (r.level ? `Lv ${r.level}` : "");
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

function renderLog() {
  return `
    <div style="margin-top:8px">
      <div class="panel">
        <p class="tip" style="margin:0">
          Crafting Log coming next.<br>
          (You will be able to add recipes, track materials you have, and see total cost.)
        </p>
      </div>
    </div>
  `;
}
