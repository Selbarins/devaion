import { getSt, persist } from "../state.js";
import { esc } from "../helpers.js";

let recipesCache = null;
let itemsCache = null;

function itemName(id) {
  return itemsCache?.[id]?.name || String(id);
}

function getRecipe(id) {
  return (recipesCache || []).find(r => r.id === id);
}

// ---------- Rarity ----------
function getRarity(r) {
  const n = (r.name || "").toLowerCase();
  if (n.includes("wise dragon") || n.includes("ebony dragon") ||
      n.startsWith("splendent wise") || n.startsWith("splendent ebony")) return "legendary";
  if (n.includes("star dragon") || n.includes("true dragon") ||
      n.includes("white dragon") || n.includes("dark dragon") ||
      (n.startsWith("splendent") && (n.includes("star") || n.includes("true") || n.includes("white") || n.includes("dark")))) return "epic";
  if (n.startsWith("splendent") || n.startsWith("artisan's")) return "rare";
  if (n.startsWith("expert's") || n.startsWith("fine ")) return "uncommon";
  return "common";
}

const RARITY_STYLE = {
  common:    { border: "transparent", bg: "transparent" },
  uncommon:  { border: "#4ade80", bg: "rgba(74,222,128,0.08)" },
  rare:      { border: "#60a5fa", bg: "rgba(96,165,250,0.09)" },
  epic:      { border: "#c084fc", bg: "rgba(192,132,252,0.10)" },
  legendary: { border: "#fbbf24", bg: "rgba(251,191,36,0.11)" }
};

// ---------- Sub-type ----------
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

function isTransfer(r) {
  return (r.rank === "Novice" && (r.level == null || r.level === 0)) ||
         (r.ingredients && r.ingredients.length <= 2 && !r.comboChance);
}

// ---------- Normalize ----------
function normalizeStructured(data) {
  const list = Array.isArray(data) ? data : (data.recipes || []);
  const items = {};

  const recipes = list.map(r => {
    const outputId = String(r.output?.id || "");
    const outputName = r.output?.name || r.name || `Recipe ${r.id}`;
    if (outputId) items[outputId] = { name: outputName };

    const ingredients = (r.ingredients || []).map(ing => {
      const id = String(ing.id || ing.itemId || "");
      if (id) items[id] = { name: ing.name || id };
      return { itemId: id, qty: Number(ing.qty) || 1 };
    });

    let rank = r.rank || null;
    let level = Number(r.level) || 0;
    if (!rank && level > 50) { rank = "Professional"; level = level - 50; }
    else if (!rank && level > 0) rank = "Novice";

    const profession = r.profession || "Unknown";
    const subType = inferSubType({ name: r.name || outputName, type: r.type, profession });
    const transfer = isTransfer({ rank, level, ingredients, comboChance: r.comboChance });

    return {
      id: String(r.id),
      name: r.name || outputName,
      profession,
      rank,
      level,
      subType,
      transfer,
      ingredients,
      output: { itemId: outputId, qty: Number(r.output?.qty) || 1 },
      comboChance: r.comboChance ?? null,
      rarity: getRarity({ name: r.name || outputName })
    };
  });

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
  try {
    const rRes = await fetch("/data/recipes.json");
    if (!rRes.ok) throw new Error("recipes.json missing");
    const data = await rRes.json();
    const normalized = normalizeStructured(data);
    recipesCache = normalized.recipes;
    itemsCache = normalized.items;

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
  }
}

// ---------- Profession ----------
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
        const stillNeeded = Math.max(0, totals[id].need - (have[id] || 0));
        if (stillNeeded > 0) addIngredients(sub.ingredients, qty * (stillNeeded / qty));
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
    if (!totals[id]) { delete expanded[id]; changed = true; }
  }
  if (changed) { st.craftExpanded = expanded; persist(); }
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
    if (price != null && price !== "") sum += missing * Number(price);
    else if (missing > 0) missingPrice++;
  }
  return { sum, missingPrice };
}

// ---------- Main ----------
export async function drawCraft(app, { onRender }) {
  const st = getSt();
  if (!st.craftSub) st.craftSub = "browser";
  if (!st.craftCatFilter) st.craftCatFilter = "All";
  if (st.craftMode == null) st.craftMode = "regular";
  if (st.craftShowProfs == null) st.craftShowProfs = false;

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
      (r.subType || "").toLowerCase().includes(search)
    );
  }

  app.innerHTML = `
    <div class="panel glass">
      <div class="ctrl-bar" style="margin-bottom:14px; justify-content:space-between">
        <div class="seg">
          <button type="button" data-craft-sub="browser" class="${st.craftSub !== "log" ? "on" : ""}">Recipes</button>
          <button type="button" data-craft-sub="log" class="${st.craftSub === "log" ? "on" : ""}">
            Plan${(st.craftLog && st.craftLog.length) ? ` (${st.craftLog.length})` : ""}
          </button>
        </div>
        <button type="button" data-craft-toggle-profs title="Profession levels"
                style="padding:6px 10px; font-size:15px; line-height:1; opacity:${st.craftShowProfs ? 1 : 0.65}">
          ⚙️
        </button>
      </div>

      ${st.craftShowProfs ? renderProfsPanel() : ""}
      ${st.craftSub === "log" ? renderLog() : renderBrowser(list, st)}
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
      <div class="ctrl-bar" style="margin-bottom:12px">
        <input type="search" id="craftSearch" placeholder="Search…"
               value="${esc(st.craftSearch || "")}" style="min-width:180px; flex:1">
        <div class="seg">
          <button type="button" data-craft-mode="regular" class="${mode === "regular" ? "on" : ""}">Regular</button>
          <button type="button" data-craft-mode="transfer" class="${mode === "transfer" ? "on" : ""}">Transfer</button>
        </div>
      </div>

      <div class="ctrl-bar" style="margin-bottom:8px; gap:6px">
        ${profs.map(p => `
          <button type="button" data-craft-prof="${p}"
            class="${profFilter === p ? "on" : ""}"
            style="font-size:13px; font-weight:600">
            ${esc(p)}
          </button>
        `).join("")}
      </div>

      ${profFilter !== "All" ? `
        <div class="ctrl-bar" style="margin-bottom:14px; gap:5px">
          ${subFilters.map(c => `
            <button type="button" data-craft-cat="${esc(c)}"
              class="${catFilter === c ? "on" : ""}"
              style="font-size:12px; padding:4px 9px; opacity:${catFilter === c ? 1 : 0.72}">
              ${esc(c)}
            </button>
          `).join("")}
        </div>
      ` : ""}

      <div>
        ${list.length === 0
          ? `<p class="tip">No recipes match.</p>`
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
    <div class="row ${doable ? "" : "dis"}" style="
      border-left: 4px solid ${style.border};
      background: ${style.bg};
    ">
      <div class="ic">🔨</div>
      <div>
        <div class="hd">
          <h3>${esc(r.name)}</h3>
          <span class="tg">${esc(r.profession)}</span>
          ${rankLabel ? `<span class="tg">${esc(rankLabel)}</span>` : ""}
          ${r.comboChance ? `<span class="tg">Combo ${r.comboChance}%</span>` : ""}
          ${r.subType && r.subType !== "Other" && r.subType !== "Materials" ? `<span class="tg">${esc(r.subType)}</span>` : ""}
        </div>
        <p class="tip">${esc(mats)}</p>
      </div>
      <div class="ctl">
        <button type="button" class="btn-sm" data-add-craft="${r.id}" ${!doable ? "disabled" : ""} title="Add to Plan">+</button>
      </div>
    </div>
  `;
}

function renderProfsPanel() {
  const existingProfs = [...new Set((recipesCache || []).map(r => r.profession))].filter(Boolean).sort();
  const st = getSt();
  if (!st.craftProfs) st.craftProfs = {};

  return `
    <div style="margin-bottom:16px; padding:12px 14px; border-radius:10px; background:rgba(255,255,255,0.03); border:1px solid var(--line)">
      <div style="font-size:13px; font-weight:600; margin-bottom:10px; opacity:0.9">Profession levels</div>
      ${existingProfs.map(p => {
        const cur = st.craftProfs[p] || { rank: "Novice", level: 1 };
        return `
          <div class="row" style="padding:6px 0">
            <div class="ic" style="opacity:0.7">⚒️</div>
            <div><div class="hd"><h3 style="font-size:13.5px">${esc(p)}</h3></div></div>
            <div class="ctl">
              <select data-prof-rank="${esc(p)}" style="font-size:12px">
                <option value="Novice" ${cur.rank === "Novice" ? "selected" : ""}>Novice</option>
                <option value="Professional" ${cur.rank === "Professional" ? "selected" : ""}>Professional</option>
              </select>
              <input type="number" min="1" max="50" value="${cur.level}"
                     data-prof-level="${esc(p)}" style="width:56px; font-size:12px">
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

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

  // Planned crafts
  const plannedHtml = log.length === 0
    ? `<p class="tip">Nothing planned yet.</p>`
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
                     data-log-qty="${entry.recipeId}" style="width:52px; text-align:center">
              <button type="button" class="btn-sm btn-danger" data-log-remove="${entry.recipeId}" title="Remove">✕</button>
            </div>
          </div>
        `;
      }).join("");

  // Column header (aligned with the numbers)
  const header = matIds.length === 0 ? "" : `
    <div class="row" style="opacity:0.55; font-size:11px; font-weight:600; pointer-events:none; border:none; background:transparent">
      <div class="ic"></div>
      <div></div>
      <div class="ctl" style="gap:6px; min-width:280px; justify-content:flex-end">
        <span style="width:56px; text-align:center">Have</span>
        <span style="width:40px; text-align:center">Need</span>
        <span style="width:40px; text-align:center">Miss</span>
        <span style="width:88px; text-align:center">Kinah</span>
        <span style="width:32px"></span>
      </div>
    </div>
  `;

  const matsHtml = matIds.length === 0
    ? `<p class="tip">No materials.</p>`
    : matIds.map(id => {
        const info = totals[id];
        const need = info.need;
        const haveAmt = have[id] || 0;
        const missing = Math.max(0, need - haveAmt);
        const canExpand = !!findRecipeByOutput(id);
        const isExpanded = !!info.expanded;
        const priceVal = prices[id] ?? "";

        return `
          <div class="row ${isExpanded ? "expanded" : ""}">
            <div class="ic">${isExpanded ? "📂" : "🧱"}</div>
            <div>
              <div class="hd">
                <h3>${esc(itemName(id))}</h3>
                ${canExpand && !isExpanded ? `<span class="tg">craftable</span>` : ""}
              </div>
            </div>
            <div class="ctl" style="gap:6px; min-width:280px; justify-content:flex-end">
              <input type="number" min="0" value="${haveAmt}" data-have="${id}"
                     style="width:56px; text-align:center" title="Have">
              <span style="width:40px; text-align:center; opacity:0.9">${need}</span>
              <span style="width:40px; text-align:center; font-weight:600; color:${missing > 0 && !isExpanded ? "var(--rose,#f43f5e)" : "inherit"}">
                ${isExpanded ? "—" : missing}
              </span>
              <input type="number" min="0" step="any" placeholder="—" value="${priceVal}"
                     data-price="${id}" style="width:88px; text-align:right; font-variant-numeric:tabular-nums" title="Price per unit">
              ${canExpand || isExpanded
                ? `<button type="button" class="btn-sm" data-expand="${id}" title="${isExpanded ? "Collapse" : "Expand"}" style="min-width:32px; width:32px">
                     ${isExpanded ? "−" : "+"}
                   </button>`
                : `<span style="width:32px; display:inline-block"></span>`}
            </div>
          </div>
        `;
      }).join("");

  // Compact total — same column as the Kinah inputs, no big frame
    const costHtml = matIds.length === 0 ? "" : `
    <div class="row" style="border:none; background:transparent; margin-top:4px; opacity:0.95">
      <div class="ic"></div>
      <div></div>
      <div class="ctl" style="gap:6px; min-width:280px; justify-content:flex-end; align-items:center">
        <span style="width:56px"></span>
        <span style="width:40px"></span>
        <span style="width:40px; text-align:center; font-size:12px; opacity:0.7">Total</span>
        <span style="width:88px; text-align:right; font-weight:700; font-variant-numeric:tabular-nums; color:var(--cyan); font-size:15px">
          ${cost.sum.toLocaleString()}
        </span>
        <span style="width:32px; font-size:11px; opacity:0.6">K</span>
      </div>
    </div>
    ${cost.missingPrice > 0
      ? `<div style="text-align:right; font-size:11px; opacity:0.55; margin-top:2px; padding-right:40px">${cost.missingPrice} without price</div>`
      : ""}
  `;
    return `
    <div>
      <div style="margin-bottom:16px">
        ${plannedHtml}
      </div>
      <div>
        ${header}
        ${matsHtml}
        ${costHtml}
      </div>
    </div>
  `;
}
