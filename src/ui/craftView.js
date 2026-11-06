import { getSt, persist } from "../state.js";
import { esc } from "../helpers.js";

export function drawCraft(app, { onRender }) {
  const st = getSt();

  // default sub-view
  if (!st.craftSub) st.craftSub = "browser";

  app.innerHTML = `
    <div class="panel glass">
      <div class="ctrl-bar">
        <h2 style="margin:0">Crafting</h2>
        <div class="seg" style="margin-left:14px">
          <button type="button" data-craft-sub="browser" class="${st.craftSub !== "log" ? "on" : ""}">Recipes</button>
          <button type="button" data-craft-sub="log" class="${st.craftSub === "log" ? "on" : ""}">Crafting Log</button>
        </div>
      </div>

      ${st.craftSub === "log" ? renderLog() : renderBrowser()}
    </div>
  `;
}

function renderBrowser() {
  return `
    <div style="margin-top:8px">
      <div class="ctrl-bar">
        <input type="search" id="craftSearch" placeholder="Search recipes..." style="min-width:220px">
        <div class="seg">
          <button type="button" class="on">All</button>
          <button type="button">Blacksmithing</button>
          <button type="button">Armorsmithing</button>
          <button type="button">Handicrafting</button>
          <button type="button">Alchemy</button>
          <button type="button">Cooking</button>
        </div>
      </div>

      <div class="panel" style="margin-top:16px">
        <p class="tip" style="margin:0">
          Recipe browser will appear here.<br>
          Data is ready in <code>public/data/recipes.json</code>.
        </p>
      </div>
    </div>
  `;
}

function renderLog() {
  return `
    <div style="margin-top:8px">
      <div class="panel">
        <p class="tip" style="margin:0">
          Crafting Log (wishlist + materials + cost) will appear here.
        </p>
      </div>
    </div>
  `;
}
