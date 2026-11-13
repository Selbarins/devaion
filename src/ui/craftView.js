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
  // Prefer explicit type from data when available
  const t = (r.type || r.subType || "").toLowerCase();
  const name = (r.name || "").toLowerCase();
  const cat = (r.category || "").toLowerCase();
  const prof = r.profession || "";

  // Map game "type" values → filter labels used by SUB_FILTERS
  const TYPE_MAP = {
    greatsword: "Greatsword",
    sword: "Longsword",
    longsword: "Longsword",
    dagger: "Dagger",
    mace: "Mace",
    guarder: "Guard",
    guard: "Guard",
    shield: "Guard",
    helmet: "Helm",
    helm: "Helm",
    shoulder: "Pauldrons",
    pauldron: "Pauldrons",
    torso: "Top",
    top: "Top",
    chest: "Top",
    pants: "Legs",
    legs: "Legs",
    greave: "Legs",
    gloves: "Gloves",
    gauntlet: "Gloves",
    boots: "Shoes",
    shoes: "Shoes",
    cape: "Cloak",
    cloak: "Cloak",
    bow: "Bow",
    staff: "Staff",
    stave: "Staff",
    necklace: "Necklace",
    earring: "Earrings",
    earrings: "Earrings",
    ring: "Ring",
    bracelet: "Bracelet",
    magicbook: "Spellbook",
    spellbook: "Spellbook",
    book: "Spellbook",
    orb: "Orb",
    potion: "Potion",
    serum: "Potion",
    scroll: "Scroll",
    magicstone: "Manastone",
    manastone: "Manastone",
    soulstone: "Manastone",
    food: "Food",
    drink: "Food"
  };

  if (t && TYPE_MAP[t]) return TYPE_MAP[t];

  // Materials / misc
  if (
    cat === "material" ||
    t.startsWith("misc_") ||
    name.includes("ingot") ||
    name.includes("horn") ||
    name.includes("leather") ||
    name.includes("wood") ||
    name.includes("decoration") ||
    name.includes("powder") ||
    name.includes("paper") ||
    name.includes("solvent") ||
    name.includes("refining") ||
    name.includes("seasoning") ||
    name.includes("abrasive") ||
    name.includes("ore") ||
    name.includes("odyle")
  ) {
    return "Materials";
  }

  // Fallback heuristics by profession + name
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

  if (prof === "Cooking") return "Food";

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

// ---------- Normalize raw format (kept for future raw files) ----------
function normalizeRaw(raw) {
  const names = raw.names || {};
  const list = raw.r || [];
  const items = {};

  for (const [id, name] of Object.entries(names)) {
    items[id] = { name };
  }

  const PROF_MAP = {
    Blacksmithing: "Blacksmithing",
    Tailoring: "Armorsmithing",
    Jewelcrafting: "Handicrafting",
    Alchemy: "Alchemy",
    Cooking: "Cooking"
  };

  const recipes = list.map(arr => {
    const id = String(arr[0]);
    const rawProf = arr[1] || "Unknown";
    const profession = PROF_MAP[rawProf] || rawProf;
    const category = arr[2] || "Other";
    const level = Number(arr[4]) || 0;
    const comboChance = Number(arr[6]) || 0;
    const outputId = String(arr[7] || arr[8] || "");
    const outputQty = Number(arr[9]) || 1;

    const ingredients = (arr[10] || []).map(pair => ({
      itemId: String(pair[0]),
      qty: Number(pair[1]) || 1
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
      output: { itemId: outputId, qty: outputQty },
      comboChance,
      tags: [category.toLowerCase()].filter(Boolean)
    };
  });

  recipes.sort((a, b) => (a.rawLevel || 0) - (b.rawLevel || 0));
  return { recipes, items };
}

// ---------- Normalize the current recipes.json shape ----------
function normalizeStructured(data) {
  const list = Array.isArray(data) ? data : (data.recipes || []);
  const items = {};

  const recipes = list.map(r => {
    const outputId = String(r.output?.id || r.output?.itemId || "");
    const outputName = r.output?.name || r.name || `Recipe ${r.id}`;
    const outputQty = Number(r.output?.qty) || 1;

    // Build items map from embedded names
    if (outputId) items[outputId] = { name: outputName };
    if (r.name && outputId) items[outputId] = { name: r.name };

    const ingredients = (r.ingredients || []).map(ing => {
      const id = String(ing.id || ing.itemId || "");
      const name = ing.name || id;
      if (id) items[id] = { name };
      return {
        itemId: id,
        qty: Number(ing.qty) || 1
      };
    });

    // Rank / level: data already has rank + level in the structured file
    let rank = r.rank || null;
    let level = Number(r.level) || 0;
    let rawLevel = level;
    if (!rank && level > 0) {
      if (level <= 50) {
        rank = "Novice";
      } else {
        rank = "Professional";
        level = level - 50;
      }
    }

    const profession = r.profession || "Unknown";
    const subType = inferSubType({
      name: r.name || outputName,
      category: r.category || r.type || "",
      profession,
      type: r.type
    });

    return {
      id: String(r.id),
      name: r.name || outputName,
      profession,
      rank,
      level,
      rawLevel,
      category: r.category || r.type || "Other",
      type: r.type || null,
      subType,
      ingredients,
      output: { itemId: outputId, qty: outputQty },
      comboChance: r.comboChance ?? null,
      tags: [(r.type || r.category || "").toLowerCase()].filter(Boolean)
    };
  });

  recipes.sort((a, b) => (a.rawLevel || 0) - (b.rawLevel || 0));
  return { recipes, items };
}

async function loadData() {
  if (recipesCache && itemsCache) return;
  loading = true;
  try {
    // 1) Prefer raw if it exists again someday
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

    // 2) Structured recipes.json (current format)
    const [rRes, iRes] = await Promise.all([
      fetch("/data/recipes.json"),
      fetch("/data/items.json").catch(() => null)
    ]);

    if (!rRes.ok) throw new Error("recipes.json not found");

    const data = await rRes.json();
    const normalized = normalizeStructured(data);
    recipesCache = normalized.recipes;
    itemsCache = normalized.items;

    // Merge any extra names from items.json (optional)
    if (iRes && iRes.ok) {
      try {
        const extra = await iRes.json();
        if (extra && typeof extra === "object") {
          for (const [id, val] of Object.entries(extra)) {
            if (!itemsCache[id] && val?.name) {
              itemsCache[id] = { name: val.name };
            }
          }
        }
      } catch (_) {}
    }
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
  return (recipesCache || []).find(
    r => r.output && String(r.output.itemId) === String(itemId)
  );
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

  const recipes = Array.isArray(recipesCache) ? recipesCache : [];
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
        <div class="seg">
          <button type="button" data-craft-sub="browser" class="${st.craftSub !== "log" && st.craftSub !== "profs" ? "on" : ""}">Recipes</button>
          <button type="button" data-craft-sub="log" class="${st.craftSub === "log" ? "on" : ""}">Crafting Log</button>
          <button type="button" data-craft-sub="profs" class="${st.craftSub === "profs" ? "on" : ""}">Professions</button>
        </div>
      </div>
      ${st.craftSub === "log" ? renderLog() : st.craftSub === "profs" ? renderProfs() : renderBrowser(list, st)}
    </div>
  `;
}

function renderBrowser(list, st) {
  const existingProfs = [...new Set((recipesCache || []).map(r => r.profession))].filter(Boolean);
  const profs = ["All", ...existingProfs.sort()];
  const profFilter = st.craftProfFilter || "All";
  const catFilter = st.craftCatFilter || "All";
  const subFilters = SUB_FILTERS[profFilter] || ["All"];

  return `
    <div style="margin-top:10px">
      <div class="ctrl-bar" style="flex-wrap:wrap; gap:8px;">
        <input type="search" id="craftSearch" placeholder="Search recipes..."
               value="${esc(st.craftSearch || "")}" style="min-width:180px; flex:1;">
        <div class="seg">
          ${profs.map(p => `
            <button type="button" data-craft-prof="${p}"
              class="${profFilter === p ? "on" : ""}">${esc(p)}</button>
          `).join("")}
        </div>
      </div>

      ${profFilter !== "All" ? `
        <div class="ctrl-bar" style="margin-top:8px; flex-wrap:wrap; gap:6px;">
          ${subFilters.map(c => `
            <button type="button" data-craft-cat="${esc(c)}"
              class="${catFilter === c ? "on" : ""}">${esc(c)}</button>
          `).join("")}
        </div>
      ` : ""}

      <div style="margin-top:14px">
        ${list.length === 0
          ? `<p class="tip">No recipes match.</p>`
          : list.map(r => renderRecipeRow(r)).join("")}
      </div>
    </div>
  `;
}

function renderRecipeRow(r) {
  const doable = isDoable(r);
  const mats = (r.ingredients || [])
    .map(ing => `${ing.qty}× ${itemName(ing.itemId)}`)
    .join(", ");

  return `
    <div class="row ${doable ? "" : "dim"}">
      <div class="ic">🔨</div>
      <div>
        <div class="hd">
          <h3>${esc(r.name)}</h3>
          <span class="tg">${esc(r.profession)}</span>
          ${r.rank ? `<span class="tg">${esc(r.rank)} ${r.level || ""}</span>` : ""}
          ${r.subType && r.subType !== "Other" ? `<span class="tg">${esc(r.subType)}</span>` : ""}
          ${r.comboChance ? `<span class="tg">Combo ${r.comboChance}%</span>` : ""}
        </div>
        <p class="tip" style="margin-top:4px">${esc(mats)}</p>
      </div>
      <div class="ctl">
        <button type="button" class="btn-sm" data-add-craft="${r.id}" ${!doable ? "disabled" : ""}>+ Log</button>
      </div>
    </div>
  `;
}

function renderProfs() {
  const existingProfs = [...new Set((recipesCache || []).map(r => r.profession))].filter(Boolean).sort();
  const st = getSt();
  if (!st.craftProfs) st.craftProfs = {};

  return `
    <div style="margin-top:10px">
      <p class="tip" style="margin-bottom:12px">
        Set your profession rank & level so the recipe list can grey out what you can’t craft yet.
      </p>
      <div class="panel">
        ${existingProfs.map(p => {
          const cur = st.craftProfs[p] || { rank: "Novice", level: 1 };
          return `
            <div class="row">
              <div class="ic">⚒️</div>
              <div>
                <div class="hd"><h3>${esc(p)}</h3></div>
              </div>
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
        const missingClass = missing > 0 ? "miss" : "";
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
