/**
 * TradeWatch — static/app.js
 * Multi-provider AI frontend — Claude · GPT-4o · Gemini · Llama 3
 * Communicates with Flask Python backend
 * © 2026 TradeWatch
 */

"use strict";

// ─────────────────────────────────────────
//  Data from Flask server
// ─────────────────────────────────────────
const PRODUCTS   = window.SERVER_PRODUCTS   || [];
const INDUSTRIES = window.SERVER_INDUSTRIES || [];
const COUNTRIES  = window.SERVER_COUNTRIES  || [];
const PROVIDERS  = window.SERVER_PROVIDERS  || {};
const CATEGORIES = ["All","Tariffs","Sanctions","Agreements","Quotas","Regulations","Logistics"];

const PROVIDER_NAMES = {
  claude: "Claude (Anthropic)",
  openai: "GPT-4o mini (OpenAI)",
  gemini: "Gemini Flash (Google)",
  groq:   "Llama 3 (Groq)",
};

// ─────────────────────────────────────────
//  App state
// ─────────────────────────────────────────
const state = {
  provider: "claude",
  industry: "", country: "", partners: [],
  news: [], recs: [],
  filter: "All", expanded: null,
};

let worldData     = null;
let sentChart     = null;
let activeProduct = "Semi";
let sortCol       = "Semi";
let sortAsc       = false;
window._search    = "";

// ─────────────────────────────────────────
//  Colour scale
// ─────────────────────────────────────────
function demandColor(val) {
  if (!val || val < 10) return "#0d2035";
  if (val >= 80) return "#3dd9a4";
  if (val >= 60) return "#2080b8";
  if (val >= 40) return "#1a5c8a";
  if (val >= 20) return "#0f3a5c";
  return "#0d2035";
}

// ─────────────────────────────────────────
//  Splash
// ─────────────────────────────────────────
(function initSplash() {
  const texts = ["initialising...","loading trade data...","preparing intelligence...","ready."];
  let i = 0;
  const el = document.getElementById("splash-status");
  const iv = setInterval(() => { if (++i < texts.length) el.textContent = texts[i]; else clearInterval(iv); }, 700);
  setTimeout(() => {
    const s = document.getElementById("splash-screen");
    s.style.transition = "opacity 0.6s ease";
    s.style.opacity = "0";
    setTimeout(() => { s.style.display = "none"; showApiScreen(); }, 600);
  }, 3000);
})();

// ─────────────────────────────────────────
//  Provider selector
// ─────────────────────────────────────────
function selectProvider(key) {
  state.provider = key;
  document.querySelectorAll(".provider-card").forEach(c =>
    c.classList.toggle("selected", c.dataset.provider === key)
  );
  // Update placeholder hint
  const hints = {
    claude: "sk-ant-api03-...",
    openai: "sk-proj-...",
    gemini: "AIza...",
    groq:   "gsk_...",
  };
  document.getElementById("api-key-input").placeholder = hints[key] || "Paste your API key here...";
}

// ─────────────────────────────────────────
//  API Key Screen
// ─────────────────────────────────────────
function showApiScreen() {
  document.getElementById("home-page").style.display = "none";
  document.getElementById("api-screen").style.display = "flex";
}

async function submitApiKey() {
  const key = document.getElementById("api-key-input").value.trim();
  const err = document.getElementById("api-error");
  const btn = document.getElementById("api-submit-btn");
  err.textContent = "";

  if (!key) { err.textContent = "Please paste your API key."; return; }

  btn.textContent = "Validating...";
  btn.disabled = true;

  try {
    const resp = await fetch("/api/validate-key", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ api_key: key, provider: state.provider }),
    });
    const data = await resp.json();

    if (data.ok) {
      document.getElementById("api-screen").style.display = "none";
      await loadWorldData();
      initHomePage();
    } else {
      err.textContent = data.error || "Invalid key — please try again.";
    }
  } catch {
    err.textContent = "Cannot reach server. Is Flask running on port 5000?";
  }

  btn.textContent = "Launch →";
  btn.disabled = false;
}

document.addEventListener("keydown", e => {
  if (e.key === "Enter" && document.activeElement.id === "api-key-input") submitApiKey();
});

// ─────────────────────────────────────────
//  Load world data from Flask
// ─────────────────────────────────────────
async function loadWorldData() {
  const resp = await fetch("/api/world-data");
  worldData = await resp.json();
}

// ─────────────────────────────────────────
//  Home page
// ─────────────────────────────────────────
function initHomePage() {
  document.getElementById("home-page").style.display = "block";

  // Show active provider in nav
  const badge = document.getElementById("nav-badge");
  const prov  = document.getElementById("nav-provider");
  if (badge) badge.textContent = "AI active";
  if (prov)  prov.textContent  = PROVIDER_NAMES[state.provider] || state.provider;

  // Show active AI in monitor section
  const aiBadge = document.getElementById("active-ai-badge");
  if (aiBadge) aiBadge.textContent = `Using: ${PROVIDER_NAMES[state.provider]}`;

  // Show provider in Ask AI label
  const askLabel = document.getElementById("ask-provider-label");
  if (askLabel) askLabel.textContent = `${PROVIDER_NAMES[state.provider]} · trade assistant`;

  // Show provider in recommendations panel
  const recSub = document.getElementById("rec-sub");
  if (recSub) recSub.textContent = `Generated by ${PROVIDER_NAMES[state.provider]}`;

  buildHeroButtons();
  buildMapTabs();
  buildProductCards();
  buildMonitorSetup();
  renderTable();
  setTimeout(initWorldMap, 80);
}

// ─────────────────────────────────────────
//  Hero product buttons
// ─────────────────────────────────────────
function buildHeroButtons() {
  const wrap = document.getElementById("hero-products");
  if (!wrap) return;
  wrap.innerHTML = PRODUCTS.map(p =>
    `<div class="hero-prod-btn ${p.key === activeProduct ? "active" : ""}"
      onclick="selectProduct('${p.key}')">${p.label}</div>`
  ).join("");
}

function selectProduct(key) {
  activeProduct = key;
  document.querySelectorAll(".hero-prod-btn").forEach(b =>
    b.classList.toggle("active", b.textContent === PRODUCTS.find(p => p.key === key)?.label)
  );
  document.querySelectorAll(".map-tab").forEach(t =>
    t.classList.toggle("active", t.dataset.key === key)
  );
  document.querySelectorAll(".prod-card").forEach(c =>
    c.classList.toggle("active", c.dataset.key === key)
  );
  const titleEl = document.getElementById("map-title");
  if (titleEl) titleEl.textContent = `${PRODUCTS.find(p => p.key === key)?.label} demand worldwide`;
  applyMapColors();
  buildTopGrid();
  document.getElementById("section-map")?.scrollIntoView({ behavior: "smooth" });
}

// ─────────────────────────────────────────
//  Map tabs
// ─────────────────────────────────────────
function buildMapTabs() {
  const wrap = document.getElementById("map-tabs");
  if (!wrap) return;
  wrap.innerHTML = PRODUCTS.map(p =>
    `<div class="map-tab ${p.key === activeProduct ? "active" : ""}"
      data-key="${p.key}" onclick="selectProduct('${p.key}')">${p.label}</div>`
  ).join("");
}

// ─────────────────────────────────────────
//  World Map
// ─────────────────────────────────────────
function initWorldMap() {
  const wrap = document.getElementById("world-map-wrap");
  const tip  = document.getElementById("world-tooltip");
  if (!wrap || !tip || !worldData) return;
  if (window._mapReady) { applyMapColors(); buildTopGrid(); return; }

  const svg  = d3.select("#world-svg");
  const proj = d3.geoNaturalEarth1().scale(145).translate([450, 240]);
  const path = d3.geoPath(proj);
  const cMap = {};
  worldData.countries.forEach(c => { if (!cMap[c[0]]) cMap[c[0]] = c; });
  window._cMap = cMap;

  d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(world => {
    window._mapReady = true;
    svg.selectAll("path.country")
      .data(topojson.feature(world, world.objects.countries).features)
      .join("path").attr("class", "country")
      .attr("d", path)
      .attr("stroke", "rgba(255,255,255,.06)").attr("stroke-width", 0.4)
      .attr("fill", d => { const c = cMap[parseInt(d.id)]; return demandColor(c ? c[4][activeProduct] || 0 : 0); })
      .attr("cursor", "pointer")
      .on("mousemove", function(event, d) {
        const c = cMap[parseInt(d.id)];
        if (!c) { tip.style.opacity = "0"; return; }
        const val = c[4][activeProduct] || 0;
        document.getElementById("tt-flag").textContent   = c[1];
        document.getElementById("tt-name").textContent   = c[2];
        document.getElementById("tt-demand").textContent = val + "%";
        document.getElementById("tt-demand").style.color = demandColor(val);
        document.getElementById("tt-market").textContent = c[5];
        document.getElementById("tt-growth").textContent = c[6];
        document.getElementById("tt-growth").style.color = c[6].includes("▲") ? "#3dd9a4" : "#e05252";
        document.getElementById("tt-top").textContent    = c[7];
        const rect = wrap.getBoundingClientRect();
        let tx = event.clientX - rect.left + 14, ty = event.clientY - rect.top - 10;
        if (tx + 185 > rect.width)  tx = event.clientX - rect.left - 195;
        if (ty + 150 > rect.height) ty = ty - 140;
        tip.style.left = tx + "px"; tip.style.top = ty + "px"; tip.style.opacity = "1";
      })
      .on("mouseleave", () => tip.style.opacity = "0");
    buildTopGrid();
  }).catch(() => {
    svg.append("text").attr("x", 450).attr("y", 230).attr("text-anchor", "middle")
      .attr("fill", "#4d6a84").attr("font-size", 13).text("Map unavailable — check internet connection");
  });
}

function applyMapColors() {
  if (!window._mapReady || !window._cMap) return;
  d3.select("#world-svg").selectAll("path.country").attr("fill", d => {
    const c = window._cMap[parseInt(d.id)];
    return demandColor(c ? c[4][activeProduct] || 0 : 0);
  });
}

function buildTopGrid() {
  const el = document.getElementById("top-grid");
  if (!el || !worldData) return;
  const seen = {};
  worldData.countries.forEach(c => { if (!seen[c[0]]) seen[c[0]] = c; });
  const sorted = Object.values(seen)
    .filter(c => c[4][activeProduct] > 0)
    .sort((a, b) => (b[4][activeProduct] || 0) - (a[4][activeProduct] || 0))
    .slice(0, 9);
  el.innerHTML = sorted.map(c => {
    const val = c[4][activeProduct] || 0;
    return `<div class="top-item">
      <span class="top-name">${c[1]} ${c[2]}</span>
      <div class="top-bar-wrap"><div class="top-bar" style="width:${val}%;background:${demandColor(val)}"></div></div>
      <span class="top-val" style="color:${demandColor(val)}">${val}</span>
    </div>`;
  }).join("");
}

// ─────────────────────────────────────────
//  Product Cards
// ─────────────────────────────────────────
function buildProductCards() {
  const grid = document.getElementById("product-grid");
  if (!grid || !worldData) return;
  const seen = {};
  worldData.countries.forEach(c => { if (!seen[c[0]]) seen[c[0]] = c; });
  const countries = Object.values(seen);
  grid.innerHTML = PRODUCTS.map(p => {
    const top4 = [...countries].filter(c => c[4][p.key] > 0)
      .sort((a, b) => (b[4][p.key] || 0) - (a[4][p.key] || 0)).slice(0, 4);
    return `<div class="prod-card ${p.key === activeProduct ? "active" : ""}"
        data-key="${p.key}" onclick="selectProduct('${p.key}')">
      <div class="pc-name">${p.label}</div>
      <div class="pc-top">Top: <span>${top4[0] ? top4[0][1] + " " + top4[0][2] : "—"}</span></div>
      <div class="pc-bars">${top4.map(c => {
        const val = c[4][p.key] || 0;
        return `<div class="pc-bar-row">
          <span>${c[1]} ${c[2].slice(0, 10)}</span>
          <div class="pc-bar-track"><div class="pc-bar-fill" style="width:${val}%;background:${demandColor(val)}"></div></div>
          <span class="pc-bar-val" style="color:${demandColor(val)}">${val}</span>
        </div>`;
      }).join("")}</div>
    </div>`;
  }).join("");
}

// ─────────────────────────────────────────
//  Rankings Table
// ─────────────────────────────────────────
function renderTable() {
  const thead = document.getElementById("table-head");
  const tbody = document.getElementById("table-body");
  const countEl = document.getElementById("table-count");
  if (!thead || !tbody || !worldData) return;
  const search = (window._search || "").toLowerCase();
  thead.innerHTML = `<tr>
    <th></th>
    <th onclick="sortTable('name')"   class="${sortCol==='name'  ?(sortAsc?'sort-asc':'sort-desc'):''}">Country</th>
    <th onclick="sortTable('region')" class="${sortCol==='region'?(sortAsc?'sort-asc':'sort-desc'):''}">Region</th>
    ${PRODUCTS.map(p => `<th onclick="sortTable('${p.key}')"
      class="${sortCol===p.key?(sortAsc?'sort-asc':'sort-desc'):''}">${p.label}</th>`).join("")}
    <th onclick="sortTable('top')"    class="${sortCol==='top'   ?(sortAsc?'sort-asc':'sort-desc'):''}">Top Product</th>
    <th onclick="sortTable('market')" class="${sortCol==='market'?(sortAsc?'sort-asc':'sort-desc'):''}">Market</th>
    <th onclick="sortTable('growth')" class="${sortCol==='growth'?(sortAsc?'sort-asc':'sort-desc'):''}">Growth</th>
  </tr>`;
  const seen = {};
  worldData.countries.forEach(c => { if (!seen[c[0]]) seen[c[0]] = c; });
  let rows = Object.values(seen);
  if (search) rows = rows.filter(c =>
    c[2].toLowerCase().includes(search) ||
    c[3].toLowerCase().includes(search) ||
    c[7].toLowerCase().includes(search)
  );
  rows.sort((a, b) => {
    let av, bv;
    if (sortCol === "name")   { av = a[2]; bv = b[2]; }
    else if (sortCol === "region") { av = a[3]; bv = b[3]; }
    else if (sortCol === "top")    { av = a[7]; bv = b[7]; }
    else if (sortCol === "market") { av = parseFloat(a[5].replace(/[^0-9.]/g,"")); bv = parseFloat(b[5].replace(/[^0-9.]/g,"")); }
    else if (sortCol === "growth") { av = parseFloat(a[6].replace(/[^0-9.]/g,"")); bv = parseFloat(b[6].replace(/[^0-9.]/g,"")); }
    else { av = a[4][sortCol] || 0; bv = b[4][sortCol] || 0; }
    if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortAsc ? av - bv : bv - av;
  });
  if (countEl) countEl.textContent = `${rows.length} countries`;
  tbody.innerHTML = rows.map(c => `<tr>
    <td class="flag-cell">${c[1]}</td><td>${c[2]}</td><td>${c[3]}</td>
    ${PRODUCTS.map(p => {
      const val = c[4][p.key] || 0;
      const cls = val >= 70 ? "d-high" : val >= 40 ? "d-mid" : "d-low";
      return `<td><span class="d-cell ${cls}">
        <span class="d-bar" style="width:${Math.round(val*.3)}px;background:${demandColor(val)}"></span>
        ${val || "—"}</span></td>`;
    }).join("")}
    <td style="color:var(--green)">${c[7]}</td>
    <td>${c[5]}</td>
    <td style="color:${c[6].includes("▲")?"#3dd9a4":"#e05252"}">${c[6]}</td>
  </tr>`).join("");
}

function sortTable(col) {
  if (sortCol === col) sortAsc = !sortAsc; else { sortCol = col; sortAsc = false; }
  renderTable();
}

// ─────────────────────────────────────────
//  Monitor Setup
// ─────────────────────────────────────────
function buildMonitorSetup() {
  buildChips("chip-industry", INDUSTRIES, "industry");
  buildChips("chip-country",  COUNTRIES,  "country");
  buildChips("chip-partners", COUNTRIES.filter(c => c !== state.country), "partners", true);
}

function buildChips(id, items, key, multi = false) {
  const wrap = document.getElementById(id);
  if (!wrap) return;
  wrap.innerHTML = items.map(item => {
    const active = multi ? state.partners.includes(item) : state[key] === item;
    return `<div class="chip ${active ? "selected" : ""}"
      onclick="selectChip('${id}','${item}','${key}',${multi})">${item}</div>`;
  }).join("");
}

function selectChip(id, item, key, multi) {
  if (multi) {
    if (state.partners.includes(item)) state.partners = state.partners.filter(x => x !== item);
    else if (state.partners.length < 5) state.partners.push(item);
    buildChips(id, COUNTRIES.filter(c => c !== state.country), "partners", true);
  } else {
    state[key] = item;
    if (key === "country") {
      state.partners = state.partners.filter(p => p !== item);
      buildChips("chip-partners", COUNTRIES.filter(c => c !== item), "partners", true);
    }
    buildChips(id, key === "industry" ? INDUSTRIES : COUNTRIES, key);
  }
  const note = document.getElementById("setup-note");
  if (note) note.textContent = [state.industry, state.country,
    state.partners.length ? `${state.partners.length} partner${state.partners.length > 1 ? "s" : ""}` : ""]
    .filter(Boolean).join(" · ");
}

// ─────────────────────────────────────────
//  Launch Monitor
// ─────────────────────────────────────────
async function launchMonitor() {
  const err = document.getElementById("monitor-error");
  err.textContent = "";
  if (!state.industry) { err.textContent = "Please select your industry."; return; }
  if (!state.country)  { err.textContent = "Please select your home country."; return; }
  if (!state.partners.length) { err.textContent = "Select at least one trading partner."; return; }

  const btn = document.getElementById("launch-btn");
  btn.textContent = `Asking ${PROVIDER_NAMES[state.provider]}...`;
  btn.disabled = true;

  try {
    const resp = await fetch("/api/generate-news", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ industry: state.industry, country: state.country, partners: state.partners }),
    });
    const data = await resp.json();
    if (data.error) { err.textContent = data.error; }
    else {
      state.news = data.news || [];
      state.recs = data.recommendations || [];
      document.getElementById("monitor-setup").style.display    = "none";
      document.getElementById("monitor-dashboard").style.display = "block";
      renderDashboard();
    }
  } catch { err.textContent = "Could not connect to server. Is Flask running?"; }

  btn.textContent = "Generate AI intelligence ↗";
  btn.disabled = false;
}

// ─────────────────────────────────────────
//  Render Dashboard
// ─────────────────────────────────────────
function renderDashboard() {
  const news     = state.news;
  const filtered = state.filter === "All" ? news : news.filter(n => n.category === state.filter);
  const high = news.filter(n => n.impact === "high").length;
  const pos  = news.filter(n => n.sentiment === "positive").length;
  const avg  = news.length ? Math.round(news.reduce((s, n) => s + n.relevanceScore, 0) / news.length) : 0;

  document.getElementById("mc-total").textContent   = news.length;
  document.getElementById("mc-high").textContent    = high;
  document.getElementById("mc-rel").textContent     = avg + "%";
  document.getElementById("mc-opp").textContent     = pos;
  document.getElementById("pc-industry").textContent = state.industry;
  document.getElementById("pc-country").textContent  = state.country;
  document.getElementById("pc-partners").textContent = state.partners.join(" · ");

  // Filters
  const fl = document.getElementById("filter-list");
  if (fl) {
    fl.innerHTML = "";
    CATEGORIES.forEach(cat => {
      const count = cat === "All" ? news.length : news.filter(n => n.category === cat).length;
      const d = document.createElement("div");
      d.className = "filter-item" + (state.filter === cat ? " active" : "");
      d.innerHTML = `<span>${cat}</span>${count > 0 ? `<span class="filter-count">${count}</span>` : ""}`;
      d.onclick = () => { state.filter = cat; state.expanded = null; renderDashboard(); };
      fl.appendChild(d);
    });
  }

  // News cards
  const feed = document.getElementById("news-feed");
  if (feed) {
    feed.innerHTML = "";
    const sorted = [...filtered].sort((a, b) => b.relevanceScore - a.relevanceScore);
    if (!sorted.length) {
      feed.innerHTML = '<div class="loading-msg">No alerts in this category.</div>';
    } else {
      const sentCol = { positive: "#3dd9a4", negative: "#e05252", neutral: "#4d6a84" };
      const sentSym = { positive: "▲", negative: "▼", neutral: "—" };
      const impactBadge = {
        high:   '<span class="badge badge-red">high impact</span>',
        medium: '<span class="badge badge-amber">medium impact</span>',
        low:    '<span class="badge badge-green">low impact</span>',
      };
      sorted.forEach((item, idx) => {
        const card = document.createElement("div");
        card.className = `news-card ${item.impact}`;
        card.style.animationDelay = `${idx * .06}s`;
        const fillClass = item.relevanceScore > 80 ? "fill-high" : item.relevanceScore > 60 ? "fill-medium" : "fill-low";
        card.innerHTML = `<div class="card-inner">
          <div class="card-rel">
            <span class="card-score">${item.relevanceScore}</span>
            <div class="card-bar"><div class="card-bar-fill ${fillClass}" style="height:${item.relevanceScore}%"></div></div>
          </div>
          <div class="card-body">
            <div class="card-tags">
              ${impactBadge[item.impact]}
              <span class="badge badge-gray">${item.category}</span>
              <span style="font-size:11px;font-weight:500;color:${sentCol[item.sentiment]};font-family:var(--mono)">
                ${sentSym[item.sentiment]} ${item.sentiment}
              </span>
              <span class="card-region">${item.region}</span>
            </div>
            <div class="card-title">${item.headline}</div>
            <div class="card-meta">${item.source} · ${item.date}</div>
            <div class="card-expand ${state.expanded === item.id ? "open" : ""}">
              <div class="ai-row">
                <div class="ai-icon">AI</div>
                <div class="ai-text">${item.summary}</div>
              </div>
            </div>
          </div>
        </div>`;
        card.onclick = () => { state.expanded = state.expanded === item.id ? null : item.id; renderDashboard(); };
        feed.appendChild(card);
      });
    }
  }

  renderRiskScore();
  renderSentimentChart();
  renderRecommendations();
}

function renderRiskScore() {
  const news = state.news; if (!news.length) return;
  const high   = news.filter(n => n.impact === "high").length;
  const neg    = news.filter(n => n.sentiment === "negative").length;
  const avgRel = Math.round(news.reduce((s, n) => s + n.relevanceScore, 0) / news.length);
  const score  = Math.min(100, Math.round((high * 20) + (neg * 7) + (avgRel * .3)));
  const label  = score >= 70 ? "HIGH RISK" : score >= 40 ? "MEDIUM RISK" : "LOW RISK";
  const color  = score >= 70 ? "#e05252" : score >= 40 ? "#f0a500" : "#3dd9a4";
  const arc = document.getElementById("gauge-arc");
  if (arc) { arc.style.strokeDashoffset = 251 - (score / 100) * 251; arc.style.stroke = color; }
  const se = document.getElementById("gauge-score"); if (se) se.textContent = score;
  const le = document.getElementById("gauge-label"); if (le) { le.textContent = label; le.style.color = color; }
  const bd = document.getElementById("gauge-breakdown"); if (!bd) return;
  bd.innerHTML = [
    { label: "High impact alerts", value: high,   max: 8,   color: "#e05252" },
    { label: "Negative sentiment",  value: neg,   max: 8,   color: "#f0a500" },
    { label: "Avg relevance",       value: avgRel, max: 100, color: "#4a9eff" },
  ].map(it => `<div class="gb-item">
    <div class="gb-label"><span>${it.label}</span><span style="color:var(--text)">${it.value}</span></div>
    <div class="gb-track"><div class="gb-fill" style="width:${Math.round((it.value/it.max)*100)}%;background:${it.color}"></div></div>
  </div>`).join("");
}

function renderSentimentChart() {
  const news = state.news; if (!news.length) return;
  const canvas = document.getElementById("sentiment-chart"); if (!canvas) return;
  if (sentChart) { sentChart.destroy(); sentChart = null; }
  sentChart = new Chart(canvas, {
    type: "bar",
    data: { labels: ["Positive","Negative","Neutral"], datasets: [{ data: [
      news.filter(n => n.sentiment === "positive").length,
      news.filter(n => n.sentiment === "negative").length,
      news.filter(n => n.sentiment === "neutral").length,
    ], backgroundColor: ["rgba(61,217,164,.7)","rgba(224,82,82,.7)","rgba(77,106,132,.7)"],
      borderColor: ["#3dd9a4","#e05252","#4d6a84"], borderWidth: 1, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { x: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { color: "#4d6a84", font: { size: 11 } } },
                y: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { color: "#4d6a84", font: { size: 11 }, stepSize: 1 }, beginAtZero: true } } },
  });
}

function renderRecommendations() {
  const panel = document.getElementById("rec-panel");
  const body  = document.getElementById("rec-body");
  if (!panel || !body) return;
  panel.style.display = "block";
  if (state.recs && state.recs.length) {
    body.innerHTML = `<div class="rec-body">${state.recs.map((r, i) => `
      <div class="rec-item">
        <div class="rec-num">${i + 1}</div>
        <div class="rec-text"><strong>${r.title}</strong> — ${r.detail}</div>
      </div>`).join("")}</div>`;
  }
}

// ─────────────────────────────────────────
//  Ask AI
// ─────────────────────────────────────────
function fillAsk(text) { document.getElementById("ask-input").value = text; document.getElementById("ask-input").focus(); }

async function askAI() {
  const input    = document.getElementById("ask-input");
  const btn      = document.getElementById("ask-btn");
  const history  = document.getElementById("ask-history");
  const question = input.value.trim();
  if (!question) return;
  input.value = ""; btn.disabled = true; btn.textContent = "...";

  const userEl = document.createElement("div");
  userEl.className = "ask-msg user";
  userEl.innerHTML = `<div class="ask-avatar">You</div><div class="ask-bubble">${question}</div>`;
  history.appendChild(userEl);

  const aiEl = document.createElement("div");
  aiEl.className = "ask-msg ai";
  aiEl.innerHTML = `<div class="ask-avatar">AI</div><div class="ask-bubble" style="color:var(--text3)">Thinking...</div>`;
  history.appendChild(aiEl);
  history.scrollTop = history.scrollHeight;

  try {
    const resp = await fetch("/api/ask", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ question, news: state.news, industry: state.industry, country: state.country, partners: state.partners }),
    });
    const data = await resp.json();
    aiEl.innerHTML = data.error
      ? `<div class="ask-avatar">AI</div><div class="ask-bubble" style="color:var(--red)">${data.error}</div>`
      : `<div class="ask-avatar">AI</div><div class="ask-bubble">${data.answer}</div>`;
  } catch {
    aiEl.innerHTML = `<div class="ask-avatar">AI</div><div class="ask-bubble" style="color:var(--red)">Server error — is Flask running?</div>`;
  }
  history.scrollTop = history.scrollHeight;
  btn.disabled = false; btn.textContent = "Ask ↗";
}

document.addEventListener("keydown", e => {
  if (e.key === "Enter" && document.activeElement.id === "ask-input") askAI();
});

// ─────────────────────────────────────────
//  Email Digest
// ─────────────────────────────────────────
async function generateDigest() {
  const panel = document.getElementById("digest-panel");
  const body  = document.getElementById("digest-body");
  if (!panel || !body) return;
  panel.style.display = "block";
  body.textContent = "Generating digest...";
  try {
    const resp = await fetch("/api/email-digest", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industry: state.industry, country: state.country, partners: state.partners, news: state.news }),
    });
    const data = await resp.json();
    body.textContent = data.digest || data.error || "Failed to generate.";
  } catch { body.textContent = "Server error — is Flask running?"; }
  panel.scrollIntoView({ behavior: "smooth" });
}

function copyDigest() {
  const text = document.getElementById("digest-body")?.textContent;
  if (text) navigator.clipboard.writeText(text).then(() => alert("Copied!"));
}

// ─────────────────────────────────────────
//  Refresh & Reset
// ─────────────────────────────────────────
async function refreshNews() {
  const btn = document.getElementById("refresh-btn");
  const feed = document.getElementById("news-feed");
  btn.textContent = "Loading..."; btn.disabled = true;
  state.expanded = null;
  if (feed) feed.innerHTML = `<div class="loading-msg"><div class="loader-bars">
    <div class="loader-bar"></div><div class="loader-bar"></div>
    <div class="loader-bar"></div><div class="loader-bar"></div>
    </div>Generating fresh intelligence...</div>`;
  try {
    const resp = await fetch("/api/generate-news", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industry: state.industry, country: state.country, partners: state.partners }),
    });
    const data = await resp.json();
    if (!data.error) { state.news = data.news || []; state.recs = data.recommendations || []; }
  } catch {}
  renderDashboard();
  btn.textContent = "AI refresh ↗"; btn.disabled = false;
}

function resetMonitor() {
  state.news = []; state.recs = []; state.filter = "All"; state.expanded = null;
  document.getElementById("monitor-setup").style.display    = "block";
  document.getElementById("monitor-dashboard").style.display = "none";
}

// ─────────────────────────────────────────
//  PDF Export
// ─────────────────────────────────────────
function exportPDF() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString();
    doc.setFillColor(10,22,40); doc.rect(0,0,210,297,"F");
    doc.setTextColor(240,244,248);
    doc.setFontSize(22); doc.setFont("helvetica","bold"); doc.text("TradeWatch Intelligence Report",14,20);
    doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(141,168,192);
    doc.text(`${state.industry} · ${state.country} · AI: ${PROVIDER_NAMES[state.provider]} · ${now}`,14,28);
    doc.setDrawColor(61,217,164); doc.line(14,32,196,32);
    const high = state.news.filter(n => n.impact==="high").length;
    const avg  = state.news.length ? Math.round(state.news.reduce((s,n)=>s+n.relevanceScore,0)/state.news.length) : 0;
    doc.setFontSize(11); doc.setTextColor(240,244,248);
    doc.text(`Total: ${state.news.length}   High: ${high}   Avg relevance: ${avg}%`,14,42);
    doc.setFontSize(13); doc.setFont("helvetica","bold"); doc.setTextColor(61,217,164);
    doc.text("Trade Alerts",14,56);
    let y = 64;
    state.news.forEach(item => {
      if (y > 260) { doc.addPage(); doc.setFillColor(10,22,40); doc.rect(0,0,210,297,"F"); y=20; }
      const ic = item.impact==="high"?[224,82,82]:item.impact==="medium"?[240,165,0]:[61,217,164];
      doc.setFillColor(...ic); doc.roundedRect(14,y-4,20,6,1,1,"F");
      doc.setFontSize(7); doc.setFont("helvetica","bold"); doc.setTextColor(10,22,40);
      doc.text(item.impact.toUpperCase(),15,y+.5);
      doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.setTextColor(240,244,248);
      const lines = doc.splitTextToSize(item.headline,155); doc.text(lines,38,y); y+=lines.length*5+1;
      doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(141,168,192);
      doc.text(`${item.source} · ${item.date} · ${item.category} · Relevance: ${item.relevanceScore}`,38,y); y+=5;
      const sl = doc.splitTextToSize(item.summary,155);
      doc.setTextColor(100,130,160); doc.text(sl,38,y); y+=sl.length*4+8;
    });
    doc.setFontSize(8); doc.setTextColor(77,106,132);
    doc.text(`© 2026 TradeWatch · ${PROVIDER_NAMES[state.provider]}`,14,287);
    doc.save(`TradeWatch_${state.industry}_${now.replace(/\//g,"-")}.pdf`);
  } catch { alert("PDF export failed."); }
}