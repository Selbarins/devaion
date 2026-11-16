/** Overview hub: energy + tickets + unfinished dailies + next events + roster + backup */
import {
  getSt, getRoster, setRoster, S, persist, activeChar
} from "../state.js";
import {
  applyOdyleTicks, getOdyleCap, isMembership, getOdyleVal, setOdyleVal,
  batteryLevel, fullInLabel
} from "../odyle.js";
import { cnt } from "../missions.js";
import { getTicket, adjTicket, getTicketCap } from "../tickets.js";
import { CHAR_COLORS, EV } from "../data.js";
import { esc } from "../helpers.js";

export function nextEventTimes() {
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

export const KISK_REGIONS = [
  { id: "naw", label: "NA West" },
  { id: "nae", label: "NA East" },
  { id: "eu", label: "Europe" },
  { id: "as", label: "Asia" },
  { id: "la", label: "LatAm" }
];

/** Build kisk upgrades URL when region + server + name are set */
export function kiskUpgradesUrl(c) {
  if (!c || !c.region || !c.server || !c.name) return null;
  const region = String(c.region).toLowerCase().trim();
  const server = encodeURIComponent(String(c.server).trim());
  const name = encodeURIComponent(String(c.name).trim());
  return `https://kisk.app/c/${region}/${server}/${name}/upgrades`;
}

/** Parse kisk upgrades.md into { grade, cp, actions[] } */
function parseKiskUpgrades(md) {
  if (!md || typeof md !== "string") return null;
  if (md.includes("kisk hasn't seen this character")) return { unseen: true };

  const gradeMatch = md.match(/\*\*([A-Z+]{1,3})\*\*\s*Gear/i);
  const grade = gradeMatch ? gradeMatch[1].toUpperCase() : null;

  const cpMatch = md.match(/([\d,]+)\s*CP/);
  const cp = cpMatch ? cpMatch[1].replace(/,/g, "") : null;

  const actions = [];
  const blocks = md.split(/\n(?=\d+\.\s\+?\d)/).slice(1);

  for (const block of blocks.slice(0, 6)) {
    const lines = block.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    const head = lines[0];
    const enhMatch = head.match(/^\d+\.\s*\+?(\d+)/);
    const enhance = enhMatch ? "+" + enhMatch[1] : null;

    let item = null;
    let fromGrade = null, toGrade = null, fromScore = null;

    for (const ln of lines.slice(0, 5)) {
      const up = ln.match(/Up next\s+\*\*([^*]+)\*\*/i);
      if (up) item = up[1].trim();

      if (!item) {
        for (const m of ln.matchAll(/\*\*([^*]+)\*\*/g)) {
          const t = m[1].trim();
          if (t.length > 3 && !/^(Best|Good|Fine|S\+?|A|B|C|D|BiS)$/i.test(t) && !t.startsWith("+")) {
            item = t;
            break;
          }
        }
      }

      const tm = ln.match(/\*\*([A-Z+]+)\*\*\s*(\d+)\s*→\s*\*\*([A-Z+]+)\*\*/i);
      if (tm) {
        fromGrade = tm[1];
        fromScore = tm[2];
        toGrade = tm[3];
      }
    }

    let action = null;
    for (const ln of lines) {
      if (/reroll|bind it fully/i.test(ln) && !/on average/i.test(ln)) {
        action = ln.replace(/^\d+\.\s*/, "").replace(/\*\*/g, "").trim();
        action = action.replace(/^1\s+/, "");
        break;
      }
    }

    if (item || enhance) {
      actions.push({ enhance, item, fromGrade, toGrade, fromScore, action });
    }
  }

  return { grade, cp, actions, unseen: false };
}

const GRADE_COLORS = {
  BiS: "#fbbf24",
  "S+": "#f59e0b",
  S: "#a78bfa",
  A: "#60a5fa",
  B: "#34d399",
  C: "#94a3b8",
  D: "#64748b"
};

function renderGearCard(c) {
  const url = kiskUpgradesUrl(c);
  const regionLabel = (KISK_REGIONS.find(x => x.id === c.region) || {}).label || c.region || "";
  const where = [regionLabel, c.server].filter(Boolean).join(" · ");
  const charKey = c.id;
  const color = c.color || "var(--cyan)";

  if (url) {
    return `
      <div class="panel glass gear-card" style="border-left:3px solid ${color}"
           data-kisk-char="${esc(charKey)}" data-kisk-region="${esc(c.region)}" data-kisk-server="${esc(c.server)}" data-kisk-name="${esc(c.name)}">
        <div class="gear-card-head">
          <span class="tg" style="opacity:0.75">kisk</span>
        </div>
        <p class="tip gear-card-meta">${esc(where || "Linked")}</p>
        <div class="kisk-body">
          <p class="gear-card-status tip" style="opacity:0.7">Loading upgrade plan…</p>
        </div>
        <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap">
          <a class="btn-sm on gear-kisk-link" href="${url}" target="_blank" rel="noopener noreferrer">
            Open upgrades ↗
          </a>
          <button type="button" class="btn-sm" data-kisk-refresh title="Clear cache and re-fetch from kisk">
            Refresh
          </button>
        </div>
      </div>`;
  }

  return `
    <div class="panel glass gear-card gear-card-empty" style="border-left:3px solid ${color}">
      <div class="gear-card-head">
        <span class="tg" style="opacity:0.5">kisk</span>
      </div>
      <p class="tip">Set <b>region</b> and <b>server</b> in Settings → Roster to open this character’s upgrade plan on kisk.</p>
    </div>`;
}

function renderKiskBody(data, url) {
  if (!data || data.unseen) {
    return `
      <p class="gear-card-status">Upgrade plan available on kisk</p>
      <p class="tip" style="margin-top:6px; opacity:0.55; font-size:11px">
        kisk hasn’t seen this character yet. Open upgrades once (or hit Refresh) so kisk can look it up, then Refresh again.
      </p>`;
  }

  const gradeColor = GRADE_COLORS[data.grade] || "var(--cyan)";
  const gradeHtml = data.grade
    ? `<span class="tg" style="background:${gradeColor}22; color:${gradeColor}; border:1px solid ${gradeColor}55; font-weight:700">${esc(data.grade)}</span>`
    : "";

  const cpHtml = data.cp ? `<span class="tip" style="margin-left:6px">${Number(data.cp).toLocaleString()} CP</span>` : "";

  let actionsHtml = "";
  if (data.actions && data.actions.length) {
    actionsHtml = `<div class="kisk-actions" style="margin-top:10px; display:flex; flex-direction:column; gap:6px">
      ${data.actions.slice(0, 4).map((a, i) => {
        const title = a.item
          ? `${a.enhance ? a.enhance + " " : ""}${a.item}`
          : (a.enhance || "Piece");
        const trans = a.fromGrade && a.toGrade
          ? `${a.fromGrade}${a.fromScore ? " " + a.fromScore : ""} → ${a.toGrade}`
          : "";
        return `
          <div style="font-size:12px; line-height:1.35; padding:6px 8px; border-radius:8px; background:rgba(255,255,255,0.03); border:1px solid var(--line)">
            <div style="font-weight:600; opacity:0.95">${i + 1}. ${esc(title)}</div>
            ${trans ? `<div class="tip" style="margin-top:2px">${esc(trans)}</div>` : ""}
            ${a.action ? (() => {
              const m = a.action.match(/(\d+(?:\.\d+)?)\s*%\s*(?:a try|chance|success)?/i);
              const pct = m ? m[1] : null;
              const rest = pct ? a.action.replace(m[0], "").replace(/\s{2,}/g, " ").trim() : a.action;
              return `<div class="tip" style="margin-top:2px; opacity:0.85; display:flex; align-items:center; gap:6px; flex-wrap:wrap">
                ${pct ? `<span class="tg" style="font-variant-numeric:tabular-nums">${esc(pct)}%</span>` : ""}
                <span style="opacity:0.75">${esc((rest || a.action).slice(0, 90))}${(rest || a.action).length > 90 ? "…" : ""}</span>
              </div>`;
            })() : ""}
          </div>`;
      }).join("")}
    </div>`;
  }

  return `
    <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px">
      ${gradeHtml}${cpHtml}
    </div>
    ${actionsHtml || `<p class="tip" style="opacity:0.6">No detailed next actions parsed.</p>`}
  `;
}

/** Fetch & fill one gear card. force=true clears local cache first. */
async function fillOneKiskCard(card, { force = false, openKisk = false } = {}) {
  const region = card.dataset.kiskRegion;
  const server = card.dataset.kiskServer;
  const name = card.dataset.kiskName;
  const body = card.querySelector(".kisk-body");
  if (!body || !region || !server || !name) return;

  const cacheKey = `kisk_${region}_${server}_${name}`.toLowerCase();
  const url = kiskUpgradesUrl({ region, server, name });

  if (force) {
    try { localStorage.removeItem(cacheKey); } catch {}
    body.innerHTML = `<p class="gear-card-status tip" style="opacity:0.7">Refreshing…</p>`;
  }

  // Optionally open kisk so it can re-query the armory (markdown alone does not)
  if (openKisk && url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  let data = null;
  if (!force) {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Date.now() - parsed.ts < 180000) data = parsed.data;
      }
    } catch {}
  }

  if (!data) {
    try {
      const qs = new URLSearchParams({ region, server, name });
      if (force) qs.set("_", String(Date.now()));
      const res = await fetch(`/api/kisk?${qs}`);
      if (!res.ok) throw new Error(res.status);
      const md = await res.text();
      data = parseKiskUpgrades(md);
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
      } catch {}
    } catch (e) {
      console.warn("kisk fetch failed", e);
      body.innerHTML = `
        <p class="gear-card-status">Upgrade plan available on kisk</p>
        <p class="tip" style="margin-top:6px; opacity:0.55; font-size:11px">
          Could not load live data. Open the link below, then hit Refresh.
        </p>`;
      return;
    }
  }

  body.innerHTML = renderKiskBody(data, url);
}

/** After hub render, fill every gear card and wire Refresh buttons */
async function loadKiskCards(root) {
  const cards = root.querySelectorAll("[data-kisk-char]");
  if (!cards.length) return;

  for (const card of cards) {
    await fillOneKiskCard(card, { force: false });
  }

  root.querySelectorAll("[data-kisk-refresh]").forEach(btn => {
    btn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const card = btn.closest("[data-kisk-char]");
      if (!card) return;
      btn.disabled = true;
      btn.textContent = "…";
      // force re-fetch; also open kisk so armory data can update
      await fillOneKiskCard(card, { force: true, openKisk: true });
      btn.disabled = false;
      btn.textContent = "Refresh";
    };
  });
}

/** SVG progress ring — pct 0–100 */
function ringSvg(pct, size = 42, stroke = 3.2, ok = false) {
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  const cls = ok ? "ring-ok" : "ring-fill";
  return `
    <svg class="prog-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle class="ring-bg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none"/>
      <circle class="${cls}" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none"
        stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
        transform="rotate(-90 ${size / 2} ${size / 2})"/>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" class="ring-text">${Math.round(pct)}%</text>
    </svg>`;
}

export function drawHub(app, { onRender }) {
  applyOdyleTicks();
  const st = getSt();
  const roster = getRoster();
  const cap = getOdyleCap();
  const om = isMembership();
  const corrWon = +S.get("a2corr_won") || 0;
  const expanded = new Set(Array.isArray(st.hubExpanded) ? st.hubExpanded : []);

  const rows = roster.map(r => {
    const md = cnt("d", r.id);
    const mw = cnt("w", r.id);
    const oe = getOdyleVal(r.id);
    const nm = getTicket("nightmare", r.id);
    const asc = getTicket("ascension", r.id);
    const nmCap = getTicketCap("nightmare");
    const ascCap = getTicketCap("ascension");
    const dailyPct = md[1] ? (md[0] / md[1]) * 100 : 0;
    const weeklyPct = mw[1] ? (mw[0] / mw[1]) * 100 : 0;
    const runs = Math.floor(oe / 80);
    const atCap = oe >= cap;
    const nearCap = !atCap && oe >= cap - 30;
    const nmNear = nmCap > 0 && nm >= nmCap - 2;
    const ascNear = ascCap > 0 && asc >= ascCap - 1;
    const allClear = md[1] > 0 && md[0] >= md[1];
    return { r, md, mw, oe, nm, asc, nmCap, ascCap, dailyPct, weeklyPct, runs, atCap, nearCap, nmNear, ascNear, allClear };
  });

  const shugo = getTicket("shugo");
  const dim = getTicket("dim");
  const shugoCap = getTicketCap("shugo");
  const dimCap = getTicketCap("dim");
  app.innerHTML = `
    <div class="panel glass wing-motif">
      <div class="ctrl-bar">
        <h2>Characters · Energy & Tickets</h2>
        <label class="tg" style="cursor:pointer;margin-left:auto">
          <input type="checkbox" id="om" ${om ? "checked" : ""}> Membership
        </label>
      </div>

      <div class="shared-tickets">
        <div class="ticket-card ${shugo >= shugoCap - 2 ? "ticket-near" : ""}">
          <div class="ticket-head">
            <span class="ticket-label">🎁 Shugo</span>
            <div class="ticket-controls">
              <button type="button" data-tk="shugo" data-d="-1">−</button>
              <span class="ticket-val">${shugo}/${shugoCap}</span>
              <button type="button" data-tk="shugo" data-d="1">+</button>
            </div>
          </div>
          <div class="tbar ${shugo > shugoCap ? "over" : shugo >= shugoCap ? "full" : ""}">
            <i style="width:${Math.min(100, (shugo / Math.max(1, shugoCap)) * 100)}%"></i>
          </div>
        </div>

        <div class="ticket-card ${dim >= dimCap - 1 ? "ticket-near" : ""}">
          <div class="ticket-head">
            <span class="ticket-label">🕳 Dimensional</span>
            <div class="ticket-controls">
              <button type="button" data-tk="dim" data-d="-1">−</button>
              <span class="ticket-val">${dim}/${dimCap}</span>
              <button type="button" data-tk="dim" data-d="1">+</button>
            </div>
          </div>
          <div class="tbar ${dim > dimCap ? "over" : dim >= dimCap ? "full" : ""}">
            <i style="width:${Math.min(100, (dim / Math.max(1, dimCap)) * 100)}%"></i>
          </div>
        </div>

        <div class="ticket-card">
          <div class="ticket-head">
            <span class="ticket-label">🌀 Corridors</span>
            <div class="ticket-controls">
              <button type="button" data-corr="-1">−</button>
              <span class="ticket-val">${corrWon}/3</span>
              <button type="button" data-corr="1">+</button>
            </div>
          </div>
          <div class="tbar ${corrWon >= 3 ? "full" : ""}">
            <i style="width:${Math.min(100, (corrWon / 3) * 100)}%"></i>
          </div>
        </div>
      </div>

      <div class="dgrid dgrid-4">
        ${rows.map(({ r, md, mw, oe, nm, asc, nmCap, ascCap, dailyPct, weeklyPct, runs, atCap, nearCap, nmNear, ascNear, allClear }) => {
          const p = Math.min(100, Math.round((oe / Math.max(1, cap)) * 100));
          const lv = batteryLevel(oe, cap);
          const isExp = expanded.has(r.id);
          const cardCls = [
            "dc", "char-hub-card",
            atCap ? "cap-hit-card" : "",
            nearCap ? "cap-warn-card pulse-red" : "",
            allClear ? "all-clear-card" : "",
            (nmNear || ascNear) ? "ticket-urgency" : "",
            isExp ? "expanded" : "collapsed"
          ].filter(Boolean).join(" ");

          return `
          <div class="char-stack">
          <div class="${cardCls}" style="border-left:3px solid ${r.color}" data-char-card="${r.id}">

            <div class="hub-card-head">
              <div class="hub-card-id">
                <span class="char-dot" style="background:${r.color}"></span>
                <div>
                  <div class="hub-card-name">
                    ${esc(r.name)}
                    ${r.role === "main" ? '<span class="tg main">Main</span>' : ""}
                    ${allClear ? '<span class="clear-badge" title="All dailies done">✓</span>' : ""}
                  </div>
                  <div class="tip">${esc(r.class || "—")}</div>
                </div>
              </div>
            </div>

            <div class="hub-odyle-row">
              <div class="battery-body mini">
                <div class="battery-fill ${lv}" style="width:${p}%"></div>
              </div>
              <div class="hub-odyle-meta">
                <div><b>${oe}</b><span class="oe-cap">/${cap}</span>
                  <span class="runs-pill" title="Double runs (energy ÷ 80)">${runs} Runs</span>
                </div>
                <div class="tip">${fullInLabel(oe, cap)}</div>
              </div>
            </div>

            <div class="hub-summary-row">
              <div class="hub-mini-tickets">
                <span class="mini-tk ${nmNear ? "near" : ""}">🌑 ${nm}/${nmCap}</span>
                <span class="mini-tk ${ascNear ? "near" : ""}">🗼 ${asc}/${ascCap}</span>
              </div>
              <div class="strip-rings">
                <div class="ring-wrap" title="Daily ${md[0]}/${md[1]}">
                  ${ringSvg(dailyPct, 40, 3.2, allClear)}
                  <span class="ring-label">D</span>
                </div>
                <div class="ring-wrap" title="Weekly ${mw[0]}/${mw[1]}">
                  ${ringSvg(weeklyPct, 40, 3.2, mw[1] > 0 && mw[0] >= mw[1])}
                  <span class="ring-label">W</span>
                </div>
              </div>
            </div>

            <button type="button" class="hub-expand-btn" data-toggle-expand="${r.id}" title="${isExp ? "Collapse" : "Expand"}">
              ${isExp ? "−" : "+"}
            </button>

            <div class="card-details" ${isExp ? "" : "hidden"}>
              <div class="oe-btns">
                <button type="button" data-oe-adj="-40" data-oe-char="${r.id}" class="btn-sm">−40</button>
                <input type="number" min="0" max="2000" data-oe-input="${r.id}" value="${oe}" style="width:64px;text-align:center">
                <button type="button" data-oe-adj="40" data-oe-char="${r.id}" class="btn-sm">+40</button>
              </div>

              <div class="ticket-block ${nmNear ? "ticket-near" : ""}">
                <div class="ticket-head">
                  <span class="ticket-label">🌑 Nightmare</span>
                  <div class="ticket-controls">
                    <button type="button" data-tk="nightmare" data-char="${r.id}" data-d="-1">−</button>
                    <span class="ticket-val">${nm}/${nmCap}</span>
                    <button type="button" data-tk="nightmare" data-char="${r.id}" data-d="1">+</button>
                  </div>
                </div>
                <div class="tbar ${nm > nmCap ? "over" : nm >= nmCap ? "full" : ""}">
                  <i style="width:${Math.min(100, (nm / Math.max(1, nmCap)) * 100)}%"></i>
                </div>
              </div>

              <div class="ticket-block ${ascNear ? "ticket-near" : ""}">
                <div class="ticket-head">
                  <span class="ticket-label">🗼 Ascension</span>
                  <div class="ticket-controls">
                    <button type="button" data-tk="ascension" data-char="${r.id}" data-d="-1">−</button>
                    <span class="ticket-val">${asc}/${ascCap}</span>
                    <button type="button" data-tk="ascension" data-char="${r.id}" data-d="1">+</button>
                  </div>
                </div>
                <div class="tbar ${asc > ascCap ? "over" : asc >= ascCap ? "full" : ""}">
                  <i style="width:${Math.min(100, (asc / Math.max(1, ascCap)) * 100)}%"></i>
                </div>
              </div>

              <div class="mb">
                <span>Daily</span>
                <div class="bt"><i class="${allClear ? "ok" : ""}" style="width:${dailyPct}%"></i></div>
                <b>${md[0]}/${md[1]}</b>
              </div>
              <div class="mb">
                <span>Weekly</span>
                <div class="bt"><i class="${mw[1] > 0 && mw[0] >= mw[1] ? "ok" : ""}" style="width:${weeklyPct}%"></i></div>
                <b>${mw[0]}/${mw[1]}</b>
              </div>

              <button type="button" data-open="${r.id}" class="btn-open">Open Missions →</button>
            </div>
          </div>
          ${renderGearCard(r)}
          </div>`;
        }).join("")}
      </div>
    </div>
  `;

  // Fill kisk gear cards asynchronously
  loadKiskCards(app);

  document.getElementById("om").onchange = () => {
    S.set("a2om", document.getElementById("om").checked ? "1" : "0");
    persist();
    onRender();
  };

  app.querySelectorAll("[data-toggle-expand]").forEach(el => {
    el.onclick = () => {
      const id = el.dataset.toggleExpand;
      const list = Array.isArray(getSt().hubExpanded) ? getSt().hubExpanded.slice() : [];
      const i = list.indexOf(id);
      if (i >= 0) list.splice(i, 1);
      else list.push(id);
      getSt().hubExpanded = list;
      persist();
      onRender();
    };
  });

  app.querySelectorAll("[data-tk]").forEach(btn => {
    btn.onclick = () => {
      adjTicket(btn.dataset.tk, +btn.dataset.d, btn.dataset.char || null);
      persist();
      onRender();
    };
  });

  app.querySelectorAll("[data-corr]").forEach(btn => {
    btn.onclick = () => {
      const v = Math.max(0, Math.min(3, corrWon + +btn.dataset.corr));
      S.set("a2corr_won", String(v));
      persist();
      onRender();
    };
  });

  app.querySelectorAll("[data-oe-input]").forEach(inp => {
    inp.addEventListener("change", () => {
      setOdyleVal(inp.dataset.oeInput, inp.value);
      persist();
      onRender();
    });
  });
}
