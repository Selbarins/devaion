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

// ---------- Rarity inference from name ----------
function getRarity(r) {
  const n = (r.name || "").toLowerCase();
  if (n.startsWith("splendent wise") || n.startsWith("splendent ebony") ||
      n.includes("wise dragon") || n.includes("ebony dragon")) return "legendary";
  if (n.startsWith("splendent") && (n.includes("star") || n.includes("true") || n.includes("white") || n.includes("dark"))) return "epic";
  if (n.includes("star dragon") || n.includes("true dragon") || n.includes("white dragon") || n.includes("dark dragon")) return "epic";
  if (n.startsWith("splendent") || n.startsWith("artisan's")) return "rare";
  if (n.startsWith("expert's")) return "uncommon";
  return "common";
}

const RARITY_STYLE = {
  common:    { border: "transparent", bg: "transparent" },
  uncommon:  { border: "#38bdf8", bg: "rgba(56,189,248,0.08)" },
  rare:      { border: "#a78bfa", bg: "rgba(167,139,250,0.10)" },
  epic:      { border: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
  legendary: { border: "#e879f9", bg: "rgba(232,121,249,0.12)" }
};

// ---------- Sub-type (for filters) ----------
function inferSubType(r) {
  const t = (r.type || "").toLowerCase();
  const name = (r.name || "").toLowerCase();
  const TYPE_MAP = {
    greatsword: "Greatsword", sword: "Longsword", longsword: "Longsword",
    dagger: "Dagger", mace: "Mace", guarder: "Guard", guard: "Guard", shield: "Guard",
    helmet: "Helm", helm: "Helm", shoulder: "Pauldrons", pauldron: "Pauldrons",
    torso: "Top", top: "Top", chest: "Top", pants: "Legs", legs: "Legs", greave: "Legs",
    gloves: "Gloves", gauntlet: "Gloves", boots: "Shoes", shoes: "Shoes",
    cape: "Cloak", cloak: "Cloak", bow: "Bow", staff: "Staff", stave: "Staff",
    necklace: "Necklace", earring: "Earrings", earrings: "Earrings", ring: "Ring",
    bracelet: "Bracelet", magicbook: "Spellbook", spellbook: "Spellbook", book: "Spellbook",
    orb: "Orb", potion: "Potion", serum: "Potion", scroll: "Scroll",
    magicstone: "Manastone", manastone: "Manastone", soulstone: "Manastone",
    food: "Food", drink: "Food"
  };
  if (t && TYPE_MAP[t]) return TYPE_MAP[t];
  if (t.startsWith("misc_") || name.includes("ingot") || name.includes("horn") ||
      name.includes("leather") || name.includes("wood") || name.includes("powder") ||
      name.includes("ore") || name.includes("odyle") || name.includes("scale") ||
      name.includes("refining") || name.includes("seasoning")) return "Materials";
  return "Other";
}

const SUB_FILTERS = {
  Blacksmithing: ["All", "Greatsword", "Longsword", "Dagger", "Mace", "Guard", "Materials"],
  Armorsmithing: ["All", "Helm", "Pauldrons", "Top", "Legs", "Gloves", "Shoes", "Cloak", "Materials"],
  Handicrafting: ["All", "Bow", "Staff", "Necklace", "Earrings", "Ring", "Bracelet", "Materials"],
  Alchemy: ["All", "Spellbook", "Orb", "Potion", "Scroll", "Manastone", "Materials"],
  Cooking: ["All", "Food"]
};

// ---------- Detect Transfer recipes ----------
function isTransfer(r) {
  // Transfer crafts: usually no real level requirement and short material list
  return (r.rank === "Novice" && (r.level == null || r.level === 0)) ||
         (r.ingredients && r.ingredients.length <= 2 && !r.comboChance);
}

// ---------- Normalize structured recipes.json ----------
function normalizeStructured(data) {
  const list = Array.isArray(data) ? data : (data.recipes || []);
  const items = {};

  const recipes = list.map(r => {
    const outputId = String(r.output?.id || "");
    const outputName = r.output?.name || r.name || `Recipe ${r.id}`;
    const outputQty = Number(r.output?.qty) || 1;

    if (outputId) items[outputId] = { name: outputName };

    const ingredients = (r.ingredients || []).map(ing => {
      const id = String(ing.id || ing.itemId || "");
      const name = ing.name || id;
      if (id) items[id] = { name };
      return { itemId: id, qty: Number(ing.qty) || 1 };
    });

    let rank = r.rank || null;
    let level = Number(r.level) || 0;
    let rawLevel = level;

    // Structured file already has sensible rank/level; keep as-is
    if (!rank && level > 50) {
      rank = "Professional";
      level = level - 50;
    } else if (!rank && level > 0) {
      rank = "Novice";
    }

    const profession = r.profession || "Unknown";
    const subType = inferSubType({ name: r.name || outputName, type: r.type, profession });
    const transfer = isTransfer({ rank, level, ingredients, comboChance: r.comboChance });

    return {
      id: String(r.id),
      name: r.name || outputName,
      profession,
      rank,
      level,
      rawLevel,
      category: r.type || "Other",
      type: r.type || null,
      subType,
      transfer,
      ingredients,
      output: { itemId: outputId, qty: outputQty },
      comboChance: r.comboChance ?? null,
      rarity: getRarity({ name: r.name || outputName })
    };
  });

  // Game-like sort: rank order → level → name
  const rankOrder = { Novice: 1, Professional: 2 };
  recipes.sort((a, b) => {
    const ra = rankOrder[a.rank] || 0;
    const rb = rankOrder[b.rank] || 0;
    if (ra !== rb) return ra - rb;
    if ((a.level || 0) !== (b.level || 0)) return (a.level || 0) - (b.level || 0);
    return (a.name || "").localeCompare(b.name || "");
  });

  return { recipes, items };
}

async function loadData() {
  if (recipesCache && itemsCache) return;
  loading = true;
  try {
    const rRes = await fetch("/data/recipes.json");
    if (!rRes.ok) throw new Error("recipes.json not found");
    const data = await rRes.json();
    const normalized = normalizeStructured(data);
    recipesCache = normalized.recipes;
    itemsCache = normalized.items;

    // Optional merge of items.json
    try {
      const iRes = await fetch("/data/items.json");
      if (iRes.ok) {
        const extra = await iRes.json();
        if (extra && typeof extra === "object") {
          for (const [id, val] of Object.entries(extra)) {
            if (!itemsCache[id] && val?.name) itemsCache[id] = { name: val.name };
          }
        }
      }
    } catch (_) {}
  } catch (e) {
    console.error("Failed to load craft data", e);
    recipesCache = [];
    itemsCache = {};
  } finally {
    loading = false;
  }
}

// ---------- Profession helpers ----------
function getProfs() {
  const st = getSt();
  if (!st.craftProfs) st.craftProfs = {};
  return st.craftProfs;
}

function getProfLevel(profession) {
  return getProfs()[profession] || { rank: "Novice", level: 1 };
}

function isDoable(recipe) {
  if (recipe.transfer || !recipe.rank) return true;
  const user = getProfLevel(recipe.profession);
  if (recipe.rank === "Novice") {
    if (user.rank === "Professional") return true;
    return user.level >= (recipe.level || 1);
  }
  if (user.rank !== "Professional") return false;
  return user.level >= (recipe.level || 1);
}

// ---------- Plan helpers ----------
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
        if (!totals[id]) totals[id] = { need: 0, expanded: true };
        totals[id].need += qty;
        totals[id].expanded = true;
        const haveAmt = have[id] || 0;
        const stillNeeded = Math.max(0, totals[id].need - haveAmt);
        if (stillNeeded > 0) {
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
    const missing = Math.max(0, info.need - (have[id] || 0));
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
  if (st.craftMode == null) st.craftMode = "regular"; // "regular" | "transfer"

  await loadData();

  const recipes = Array.isArray(recipesCache) ? recipesCache : [];
  const search = (st.craftSearch || "").toLowerCase().trim();
  const profFilter = st.craftProfFilter || "All";
  const catFilter = st.craftCatFilter || "All";
  const mode = st.craftMode || "regular";

  let list = recipes.filter(r => mode === "transfer" ? r.transfer : !r.transfer);

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
      <div class="ctrl-bar" style="margin-bottom:12px;">
        <div class="seg">
          <button type="button" data-craft-sub="browser" class="${st.craftSub !== "log" && st.craftSub !== "profs" ? "on" : ""}">Recipes</button>
          <button type="button" data-craft-sub="log" class="${st.craftSub === "log" ? "on" : ""}">My Plan${(st.craftLog && st.craftLog.length) ? ` (${st.craftLog.length})` : ""}</button>
          <button type="button" data-craft-sub="profs" class="${st.craftSub === "profs" ? "on" : ""}">Professions</button>
        </div>
      </div>
      ${st.craftSub === "log" ? renderLog() : st.craftSub === "profs" ? renderProfs() : renderBrowser(list, st)}
    </div>
  `;
}

function renderBrowser(list, st) {
  const existingProfs = [...new Set((recipesCache || []).map(r => r.profession))].filter(Boolean).sort();
  const profs = ["All", ...existingProfs];
  const profFilter = st.craftProfFilter || "All";
  const catFilter = st.craftCatFilter || "All";
  const mode = st.craftMode || "regular";
  const subFilters = SUB_FILTERS[profFilter] || ["All"];

  return `
    <div>
      <!-- Search + Mode toggle -->
      <div class="ctrl-bar" style="flex-wrap:wrap; gap:10px; margin-bottom:12px;">
        <input type="search" id="craftSearch" placeholder="Search recipes..."
               value="${esc(st.craftSearch || "")}" style="min-width:200px; flex:1;">
        <div class="seg">
          <button type="button" data-craft-mode="regular" class="${mode === "regular" ? "on" : ""}">Regular</button>
          <button type="button" data-craft-mode="transfer" class="${mode === "transfer" ? "on" : ""}">Transfer</button>
        </div>
      </div>

      <!-- Profession filters -->
      <div class="ctrl-bar" style="flex-wrap:wrap; gap:6px; margin-bottom:10px;">
        ${profs.map(p => `
          <button type="button" data-craft-prof="${p}" class="${profFilter === p ? "on" : ""}">${esc(p)}</button>
        `).join("")}
      </div>

      ${profFilter !== "All" ? `
        <div class="ctrl-bar" style="flex-wrap:wrap; gap:6px; margin-bottom:14px;">
          ${subFilters.map(c => `
            <button type="button" data-craft-cat="${esc(c)}" class="${catFilter === c ? "on" : ""}">${esc(c)}</button>
          `).join("")}
        </div>
      ` : ""}

      <div style="display:flex; flex-direction:column; gap:8px;">
        ${list.length === 0
          ? `<p class="tip">No recipes match your filters.</p>`
          : list.map(r => renderRecipeCard(r)).join("")}
      </div>
    </div>
  `;
}

function renderRecipeCard(r) {
  const doable = isDoable(r);
  const rarity = r.rarity || "common";
  const style = RARITY_STYLE[rarity] || RARITY_STYLE.common;
  const mats = (r.ingredients || [])
    .map(ing => `${ing.qty}× ${itemName(ing.itemId)}`)
    .join(" · ");

  const rankLabel = r.transfer
    ? "Transfer"
    : r.rank
      ? `${r.rank} ${r.level || ""}`
      : "";

  return `
    <div class="row" style="
      border-left: 4px solid ${style.border};
      background: ${style.bg};
      opacity: ${doable ? 1 : 0.55};
      border-radius: 8px;
      padding: 10px 12px;
    ">
      <div style="flex:1; min-width:0;">
        <div class="hd" style="gap:8px; flex-wrap:wrap;">
          <h3 style="margin:0; font-size:15px;">${esc(r.name)}</h3>
          <span class="tg">${esc(r.profession)}</span>
          ${rankLabel ? `<span class="tg">${esc(rankLabel)}</span>` : ""}
          ${r.comboChance ? `<span class="tg" style="color:var(--cyan);">Combo ${r.comboChance}%</span>` : ""}
          ${r.subType && r.subType !== "Other" && r.subType !== "Materials" ? `<span class="tg">${esc(r.subType)}</span>` : ""}
        </div>
        <p class="tip" style="margin:6px 0 0; font-size:13px; line-height:1.4;">${esc(mats)}</p>
      </div>
      <div class="ctl" style="margin-left:12px;">
        <button type="button" class="btn-sm" data-add-craft="${r.id}" ${!doable ? "disabled" : ""}>+ Plan</button>
      </div>
    </div>
  `;
}

function renderProfs() {
  const existingProfs = [...new Set((recipesCache || []).map(r => r.profession))].filter(Boolean).sort();
  const st = getSt();
  if (!st.craftProfs) st.craftProfs = {};

  return `
    <div style="margin-top:4px">
      <p class="tip" style="margin-bottom:14px">
        Set your profession ranks so recipes you can’t craft yet appear dimmed.
      </p>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${existingProfs.map(p => {
          const cur = st.craftProfs[p] || { rank: "Novice", level: 1 };
          return `
            <div class="row" style="border-radius:8px; padding:10px 12px;">
              <div style="flex:1"><h3 style="margin:0; font-size:15px;">${esc(p)}</h3></div>
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

// ---------- My Plan ----------
function renderLog() {
  const st = getLog();
  const log = st.craftLog || [];
  const totals = aggregateMaterials();
  const have = st.craftHave || {};
  const prices = st.craftPrices || {};
  const cost = totalCost(totals);

  const matIds = Object.keys(totals).sort((a, b) => {
    const ea = totals[a].expanded ? 0 : 1;
    const eb = totals[b].expanded ? 0 : 1;
    return ea - eb;
  });

  const plannedHtml = log.length === 0
    ? `<p class="tip">Nothing planned yet. Go to Recipes and click “+ Plan”.</p>`
    : log.map(entry => {
        const r = getRecipe(entry.recipeId);
        if (!r) return "";
        return `
          <div class="row" style="border-radius:8px; padding:10px 12px;">
            <div style="flex:1">
              <div class="hd">
                <h3 style="margin:0; font-size:15px;">${esc(r.name)}</h3>
                <span class="tg">${esc(r.profession)}</span>
              </div>
            </div>
            <div class="ctl" style="gap:8px;">
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
      <div style="
        display:grid;
        grid-template-columns: 1fr 70px 70px 70px 90px 80px;
        gap:8px;
        padding:8px 4px;
        font-size:12px;
        color:var(--mut);
        border-bottom:1px solid var(--line);
        margin-bottom:6px;
        font-weight:600;
      ">
        <div>Material</div>
        <div style="text-align:center">Have</div>
        <div style="text-align:center">Need</div>
        <div style="text-align:center">Missing</div>
        <div style="text-align:center">Price</div>
        <div></div>
      </div>
      ${matIds.map(id => {
        const info = totals[id];
        const need = info.need;
        const haveAmt = have[id] || 0;
        const missing = Math.max(0, need - haveAmt);
        const canExpand = !!findRecipeByOutput(id);
        const isExpanded = !!info.expanded;
        const priceVal = prices[id] ?? "";

        return `
          <div style="
            display:grid;
            grid-template-columns: 1fr 70px 70px 70px 90px 80px;
            gap:8px;
            align-items:center;
            padding:8px 4px;
            border-radius:6px;
            background: ${isExpanded ? "rgba(46,230,255,0.06)" : "transparent"};
          ">
            <div style="min-width:0;">
              <div style="font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${isExpanded ? "📂 " : ""}${esc(itemName(id))}
              </div>
              ${canExpand && !isExpanded ? `<div class="tip" style="font-size:11px;">Craftable</div>` : ""}
            </div>
            <input type="number" min="0" value="${haveAmt}" data-have="${id}"
                   style="width:100%; text-align:center;">
            <div style="text-align:center">${need}</div>
            <div style="text-align:center; font-weight:600; color:${missing > 0 ? "var(--rose,#f43f5e)" : "inherit"}">
              ${isExpanded ? "—" : missing}
            </div>
            <input type="number" min="0" step="any" placeholder="—" value="${priceVal}"
                   data-price="${id}" style="width:100%; text-align:center;">
            <div>
              ${canExpand || isExpanded
                ? `<button type="button" class="btn-sm" data-expand="${id}" style="width:100%">
                     ${isExpanded ? "Collapse" : "Expand"}
                   </button>`
                : ""}
            </div>
          </div>
        `;
      }).join("")}
    `;

  const costHtml = matIds.length === 0 ? "" : `
    <div style="
      margin-top:18px;
      padding:16px 18px;
      border-radius:12px;
      background: linear-gradient(135deg, rgba(46,230,255,0.08), rgba(192,132,252,0.08));
      border: 1px solid rgba(46,230,255,0.18);
      display:flex;
      flex-wrap:wrap;
      align-items:center;
      gap:12px;
    ">
      <div>
        <div class="tip" style="margin-bottom:4px">Estimated cost of missing materials</div>
        <div style="font-size:22px; font-weight:700; color:var(--cyan); letter-spacing:-0.02em;">
          ${cost.sum.toLocaleString()} <span style="font-size:14px; font-weight:500; opacity:0.8">Kinah</span>
        </div>
      </div>
      ${cost.missingPrice > 0
        ? `<div class="tip" style="margin-left:auto">${cost.missingPrice} item${cost.missingPrice > 1 ? "s" : ""} without price</div>`
        : ""}
    </div>
  `;

  return `
    <div style="margin-top:4px">
      <div style="margin-bottom:20px">
        <h2 style="margin:0 0 12px; font-size:16px;">Planned Crafts</h2>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${plannedHtml}
        </div>
      </div>

      <div>
        <h2 style="margin:0 0 8px; font-size:16px;">Materials Needed</h2>
        <p class="tip" style="margin-bottom:12px">
          Expand a craftable material to break it down further. Prices are optional but power the cost estimate.
        </p>
        ${matsHtml}
        ${costHtml}
      </div>
    </div>
  `;
}
