import { getSt, persist } from "../state.js";
import { esc } from "../helpers.js";

let recipesCache = null;
let itemsCache = null;
let loading = false;

function itemName(id) {
  return itemsCache?.[id]?.name || String(id);
}

function getRecipe(id) {
  return (recipesCache || []).find(r => r.id === id);
}

// ---------- Infer in-game sub-type from recipe ----------
function inferSubType(r) {
  const name = (r.name || "").toLowerCase();
  const cat = (r.category || "").toLowerCase();
  const prof = r.profession || "";

  // Materials always first
  if (cat === "material" || name.includes("ingot") || name.includes("horn") ||
      name.includes("leather") || name.includes("wood") || name.includes("decoration") ||
      name.includes("powder") || name.includes("paper") || name.includes("solvent") ||
      name.includes("refining") || name.includes("seasoning") || name.includes("abrasive")) {
    return "Materials";
  }

  if (prof === "Blacksmithing") {
    if (name.includes("greatsword")) return "Greatsword";
    if (name.includes("longsword") || name.includes("sword")) return "Longsword";
    if (name.includes("dagger")) return "Dagger";
    if (name.includes("mace")) return "Mace";
    if (name.includes("guard") || name.includes("shield")) return "Guard";
    return "Materials";
  }

  if (prof === "Armorsmithing") {
    if (name.includes("helm") || name.includes("helmet")) return "Helm";
    if (name.includes("pauldron") || name.includes("shoulder")) return "Pauldrons";
    if (name.includes("breastplate") || name.includes("chest") || name.includes("top") || name.includes("tunic") || name.includes("mail")) return "Top";
    if (name.includes("greave") || name.includes("leg") || name.includes("pants")) return "Legs";
    if (name.includes("glove") || name.includes("gauntlet") || name.includes("hand")) return "Gloves";
    if (name.includes("boot") || name.includes("shoe")) return "Shoes";
    if (name.includes("cloak") || name.includes("cape")) return "Cloak";
    return "Materials";
  }

  if (prof === "Handicrafting") {
    if (name.includes("bow")) return "Bow";
    if (name.includes("staff") || name.includes("stave")) return "Staff";
    if (name.includes("necklace")) return "Necklace";
    if (name.includes("earring")) return "Earrings";
    if (name.includes("ring")) return "Ring";
    if (name.includes("bracelet")) return "Bracelet";
    return "Materials";
  }

  if (prof === "Alchemy") {
    if (name.includes("spellbook") || name.includes("book")) return "Spellbook";
    if (name.includes("orb")) return "Orb";
    if (name.includes("potion") || name.includes("serum")) return "Potion";
    if (name.includes("scroll")) return "Scroll";
    if (name.includes("manastone") || name.includes("soulstone")) return "Manastone";
    return "Materials";
  }

  if (prof === "Cooking") {
    return "Food";
  }

  return "Other";
}

// Official sub-filter order per profession (matches game as closely as possible)
const SUB_FILTERS = {
  Blacksmithing: ["All", "Greatsword", "Longsword", "Dagger", "Mace", "Guard", "Materials"],
  Armorsmithing: ["All", "Helm", "Pauldrons", "Top", "Legs", "Gloves", "Shoes", "Cloak", "Materials"],
  Handicrafting: ["All", "Bow", "Staff", "Necklace", "Earrings", "Ring", "Bracelet", "Materials"],
  Alchemy: ["All", "Spellbook", "Orb", "Potion", "Scroll", "Manastone", "Materials"],
  Cooking: ["All", "Food"]
};

// ---------- Normalize raw format ----------
function normalizeRaw(raw) {
  const names = raw.names || {};
  const list = raw.r || [];
  const items = {};
  for (const [id, name] of Object.entries(names)) {
    items[id] = { name };
  }

  // Map internal client names → in-game display names
  const PROF_MAP = {
    "Blacksmithing": "Blacksmithing",
    "Tailoring": "Armorsmithing",
    "Jewelcrafting": "Handicrafting",
    "Alchemy": "Alchemy",
    "Cooking": "Cooking"
  };

  const recipes = list.map(arr => {
    const id = String(arr[0]);
    const rawProf = arr[1] || "Unknown";
    const profession = PROF_MAP[rawProf] || rawProf;
    const category = arr[2] || "Other";
    const level = arr[4] || 0;
    const comboChance = arr[6] || 0;
    const outputId = String(arr[7] || arr[8] || "");
    const ingredients = (arr[10] || []).map(pair => ({
      itemId: String(pair[0]),
      qty: pair[1] || 1
    }));

    let rank = null;
    let rankLevel = level;
    if (level > 0) {
      if (level <= 50) {
        rank = "Novice";
        rankLevel = level;
      } else {
        rank = "Professional";
        rankLevel = level - 50;
      }
    }

        const name = names[outputId] || names[arr[8]] || `Recipe ${id}`;
    const subType = inferSubType({ name, category, profession });

    // Detect Transfer recipes:
    // A recipe is Transfer if one of its ingredients is itself a craftable item
    // (most Transfer recipes take a previous-tier gear piece)
    const isTransfer = ingredients.some(ing => {
      return list.some(other => {
        const otherOutputId = String(other[7] || other[8] || "");
        return otherOutputId === String(ing.itemId);
          });
        });
    
        const tags = [category.toLowerCase()].filter(Boolean);
        if (isTransfer) tags.push("transfer");
    
        return {
          id,
          name,
          profession,
          rank,
          level: rankLevel,
          rawLevel: level,
          category,
          subType,
          ingredients,
          output: { itemId: outputId, qty: arr[9] || 1 },
          comboChance,
          isTransfer,          // boolean for easy checks
          tags
        };
  });

  recipes.sort((a, b) => (a.rawLevel || 0) - (b.rawLevel || 0));
  return { recipes, items };
}

async function loadData() {
  if (recipesCache && itemsCache) return;
  loading = true;
  try {
    try {
      const rawRes = await fetch("/data/recipes.raw.json");
      if (rawRes.ok) {
        const raw = await rawRes.json();
        const normalized = normalizeRaw(raw);
        recipesCache = normalized.recipes;
        itemsCache = normalized.items;
        return;
      }
    } catch (e) {
      console.warn("Could not load recipes.raw.json", e);
    }

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
  } finally {
    loading = false;
  }
}

// ---------- Profession levels ----------
function getProfs() {
  const st = getSt();
  if (!st.craftProfs) st.craftProfs = {};
  return st.craftProfs;
}

function getProfLevel(profession) {
  return getProfs()[profession] || { rank: "Novice", level: 1 };
}

function isDoable(recipe) {
  if (!recipe.rank) return true;
  const user = getProfLevel(recipe.profession);
  if (recipe.rank === "Novice") {
    if (user.rank === "Professional") return true;
    return user.level >= (recipe.level || 1);
  }
  if (user.rank !== "Professional") return false;
  return user.level >= (recipe.level || 1);
}

// ---------- Crafting Log helpers ----------
function getLog() {
  const st = getSt();
  if (!st.craftLog) st.craftLog = [];
  if (!st.craftHave) st.craftHave = {};
  if (!st.craftExpanded) st.craftExpanded = {};
  if (!st.craftPrices) st.craftPrices = {};
  return st;
}

function findRecipeByOutput(itemId) {
  return (recipesCache || []).find(r => r.output && String(r.output.itemId) === String(itemId));
}

function aggregateMaterials() {
  const st = getLog();
  const totals = {};
  const expanded = st.craftExpanded || {};
  const have = st.craftHave || {};

  function addIngredients(ingredients, multiplier) {
    for (const ing of ingredients || []) {
      const id = String(ing.itemId);
      const qty = (ing.qty || 1) * multiplier;
      const sub = findRecipeByOutput(id);

      if (sub && expanded[id]) {
        // Expanded intermediate
        if (!totals[id]) totals[id] = { need: 0, expanded: true };
        totals[id].need += qty;
        totals[id].expanded = true;

        // Only push what is still missing after "Have"
        const haveAmt = have[id] || 0;
        const stillNeeded = Math.max(0, totals[id].need - haveAmt);

        if (stillNeeded > 0) {
          // Scale children by the remaining need
          const scale = stillNeeded / qty;
          addIngredients(sub.ingredients, qty * scale);
        }
      } else {
        if (!totals[id]) totals[id] = { need: 0, expanded: false };
        totals[id].need += qty;
      }
    }
  }

  for (const entry of st.craftLog) {
    const recipe = getRecipe(entry.recipeId);
    if (!recipe) continue;
    addIngredients(recipe.ingredients, entry.qty);
  }

  // Clean up expanded flags for materials that are no longer present
  let changed = false;
  for (const id of Object.keys(expanded)) {
    if (!totals[id]) {
      delete expanded[id];
      changed = true;
    }
  }
  if (changed) {
    st.craftExpanded = expanded;
    persist();
  }

  return totals;
}
function totalCost(totals) {
  const st = getLog();
  const prices = st.craftPrices || {};
  const have = st.craftHave || {};
  let sum = 0;
  let missingPrice = 0;

  for (const [id, info] of Object.entries(totals)) {
    if (info.expanded) continue;
    const need = info.need;
    const haveAmt = have[id] || 0;
    const missing = Math.max(0, need - haveAmt);
    const price = prices[id];
    if (price != null && price !== "") {
      sum += missing * Number(price);
    } else if (missing > 0) {
      missingPrice++;
    }
  }
  return { sum, missingPrice };
}

// ---------- Main draw ----------
export async function drawCraft(app, { onRender }) {
  const st = getSt();
  if (!st.craftSub) st.craftSub = "browser";
  if (!st.craftCatFilter) st.craftCatFilter = "All";

  await loadData();

  const recipes = recipesCache || [];
  const search = (st.craftSearch || "").toLowerCase().trim();
  const profFilter = st.craftProfFilter || "All";
  const catFilter = st.craftCatFilter || "All";

  let list = recipes;
  if (profFilter !== "All") list = list.filter(r => r.profession === profFilter);
  if (catFilter !== "All") list = list.filter(r => r.subType === catFilter);
  if (search) {
    list = list.filter(r =>
      (r.name || "").toLowerCase().includes(search) ||
      (r.profession || "").toLowerCase().includes(search) ||
      (r.subType || "").toLowerCase().includes(search) ||
      (r.id || "").toLowerCase().includes(search)
    );
  }

  app.innerHTML = `
    <div class="panel glass">
      <div class="ctrl-bar">
        <h2 style="margin:0">Crafting</h2>
        <div class="seg" style="margin-left:14px">
          <button type="button" data-craft-sub="browser" class="${st.craftSub !== "log" && st.craftSub !== "profs" ? "on" : ""}">Recipes</button>
          <button type="button" data-craft-sub="log" class="${st.craftSub === "log" ? "on" : ""}">Crafting Log</button>
          <button type="button" data-craft-sub="profs" class="${st.craftSub === "profs" ? "on" : ""}">Professions</button>
        </div>
        <span class="pct" style="margin-left:auto">${recipes.length} recipes</span>
      </div>

      ${st.craftSub === "log" ? renderLog() :
        st.craftSub === "profs" ? renderProfs() :
        renderBrowser(list, st, profFilter)}
    </div>
  `;
}

// ---------- Recipes browser ----------
function renderBrowser(list, st, profFilter) {
  const existingProfs = [...new Set((recipesCache || []).map(r => r.profession))].filter(Boolean);
  const allProfs = ["All", ...existingProfs];

  // Sub-filters (in-game style)
  let catButtons = "";
  if (profFilter !== "All" && SUB_FILTERS[profFilter]) {
    const filters = SUB_FILTERS[profFilter];
    catButtons = `
      <div class="ctrl-bar" style="margin-top:8px">
        <div class="seg" style="flex-wrap:wrap">
          ${filters.map(c => `
            <button type="button" data-craft-cat="${esc(c)}"
                    class="${(st.craftCatFilter || "All") === c ? "on" : ""}">${esc(c)}</button>
          `).join("")}
        </div>
      </div>
    `;
  }

  if (loading) {
    return `<div class="panel" style="margin-top:16px"><p class="tip">Loading recipes…</p></div>`;
  }

  return `
    <div style="margin-top:8px">
      <div class="ctrl-bar">
        <input type="search" id="craftSearch" placeholder="Search recipes..."
               value="${esc(st.craftSearch || "")}" style="min-width:220px">
        <div class="seg" style="flex-wrap:wrap">
          ${allProfs.map(p => `
            <button type="button" data-craft-prof="${p}"
                    class="${(st.craftProfFilter || "All") === p ? "on" : ""}">${p}</button>
          `).join("")}
        </div>
      </div>

      ${catButtons}

      <div style="margin-top:12px">
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
  const doable = isDoable(r);
  const rowClass = doable ? "row" : "row dis";

  return `
    <div class="${rowClass}">
      <div class="ic">${doable ? "🔨" : "🔒"}</div>
      <div>
        <div class="hd">
          <h3>${esc(r.name)}</h3>
          <span class="tg">${esc(r.profession)}</span>
          ${rankLabel ? `<span class="tg">${esc(rankLabel)}</span>` : ""}
          ${r.subType && r.subType !== "Other" ? `<span class="tg">${esc(r.subType)}</span>` : ""}
          ${r.isTransfer ? `<span class="tg" style="background:var(--amber);color:#000">Transfer</span>` : ""}
          ${r.comboChance ? `<span class="tg">Combo ${(r.comboChance * 100).toFixed(0)}%</span>` : ""}
          ${!doable ? `<span class="tg" style="color:var(--amber)">Need higher level</span>` : ""}
        </div>
        <div class="tip">${esc(mats || "No materials listed")}</div>
      </div>
      <div class="ctl">
        <button type="button" class="btn-sm" data-add-craft="${r.id}" ${!doable ? "disabled" : ""}>+ Log</button>
      </div>
    </div>
  `;
}

// ---------- Professions panel ----------
function renderProfs() {
  const existingProfs = [...new Set((recipesCache || []).map(r => r.profession))].filter(Boolean);
  const profs = getProfs();

  if (existingProfs.length === 0) {
    return `<div class="panel" style="margin-top:16px"><p class="tip">No professions found in data.</p></div>`;
  }

  return `
    <div style="margin-top:8px">
      <div class="panel">
        <h2>Account Profession Levels</h2>
        <p class="tip" style="margin-bottom:14px">Shared across the account. Used to grey out recipes you cannot craft yet.</p>
        ${existingProfs.map(p => {
          const cur = profs[p] || { rank: "Novice", level: 1 };
          return `
            <div class="row">
              <div class="ic">⚒️</div>
              <div><div class="hd"><h3>${esc(p)}</h3></div></div>
              <div class="ctl" style="gap:8px;">
                <select data-prof-rank="${esc(p)}">
                  <option value="Novice" ${cur.rank === "Novice" ? "selected" : ""}>Novice</option>
                  <option value="Professional" ${cur.rank === "Professional" ? "selected" : ""}>Professional</option>
                </select>
                <input type="number" min="1" max="50" value="${cur.level}"
                       data-prof-level="${esc(p)}" style="width:64px">
              </div>
            </div>
          `;
        }).join("")}
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
  const prices = st.craftPrices || {};
  const cost = totalCost(totals);

  // Sort: expanded parents first, then the rest
  const matIds = Object.keys(totals).sort((a, b) => {
    const ea = totals[a].expanded ? 0 : 1;
    const eb = totals[b].expanded ? 0 : 1;
    return ea - eb;
  });

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

  const matsHtml = matIds.length === 0
    ? `<p class="tip">No materials to show.</p>`
    : `
      <div class="row" style="font-weight:600; color:var(--mut); border-bottom:1px solid var(--line); margin-bottom:6px;">
        <div></div>
        <div>Material</div>
        <div class="ctl" style="gap:10px;">
          <span style="width:60px; text-align:center;">Have</span>
          <span style="width:60px; text-align:center;">Need</span>
          <span style="width:60px; text-align:center;">Missing</span>
          <span style="width:80px; text-align:center;">Price</span>
          <span style="width:70px;"></span>
        </div>
      </div>
      ${matIds.map(id => {
        const info = totals[id];
        const need = info.need;
        const haveAmt = have[id] || 0;
        const missing = Math.max(0, need - haveAmt);
        const missingClass = missing > 0 ? "craft-missing" : "craft-ok";
        const canExpand = !!findRecipeByOutput(id);
        const isExpanded = !!info.expanded;
        const priceVal = prices[id] ?? "";
        const rowClass = isExpanded ? "row expanded" : "row";

        return `
          <div class="${rowClass}">
            <div class="ic">${isExpanded ? "📂" : "🧱"}</div>
            <div>
              <div class="hd">
                <h3>${esc(itemName(id))}</h3>
                ${isExpanded ? `<span class="tg">Expanded</span>` : canExpand ? `<span class="tg">Craftable</span>` : ""}
              </div>
            </div>
            <div class="ctl" style="gap:10px;">
              <input type="number" min="0" value="${haveAmt}"
                     data-have="${id}" style="width:60px; text-align:center;">
              <span style="width:60px; text-align:center;">${need}</span>
              <span class="${missingClass}" style="width:60px; text-align:center; font-weight:600;">${isExpanded ? "—" : missing}</span>
              <input type="number" min="0" step="any" placeholder="—"
                     value="${priceVal}" data-price="${id}" style="width:80px; text-align:center;">
              ${canExpand || isExpanded
                ? `<button type="button" class="btn-sm" data-expand="${id}"
                     style="width:78px; min-width:78px; opacity:1 !important; pointer-events:auto !important;">
                     ${isExpanded ? "Collapse" : "Expand"}
                   </button>`
                : `<span style="width:78px; display:inline-block;"></span>`
              }
            </div>
          </div>
        `;
      }).join("")}
    `;

  const costHtml = matIds.length === 0 ? "" : `
    <div style="margin-top:14px; padding-top:12px; border-top:1px solid var(--line);">
      <span class="tip">Estimated cost of missing materials:</span>
      <b style="margin-left:8px; color:var(--cyan); font-size:16px;">
        ${cost.sum.toLocaleString()} Kinah
      </b>
      ${cost.missingPrice > 0 ? `<span class="tip" style="margin-left:8px;">(${cost.missingPrice} items without price)</span>` : ""}
    </div>
  `;

  return `
    <div style="margin-top:8px">
      <div class="panel">
        <h2>Planned Crafts</h2>
        ${plannedHtml}
      </div>

      <div class="panel" style="margin-top:16px">
        <h2>Materials Needed</h2>
        <p class="tip" style="margin-bottom:10px">
          Expand moves the intermediate to the top and shows its materials. Collapse returns it to normal.
        </p>
        ${matsHtml}
        ${costHtml}
      </div>
    </div>
  `;
}
