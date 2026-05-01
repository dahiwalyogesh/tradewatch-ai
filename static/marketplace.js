/**
 * TradeWatch — marketplace.js
 * Live marketplace — real buyers post what they need
 * Sellers browse and contact buyers directly
 * © 2026 TradeWatch
 */

"use strict";

// ─────────────────────────────────────────
//  Auth state
// ─────────────────────────────────────────
let currentUser = null;

// Called on every page load
async function checkLoginStatus() {
  try {
    const resp = await fetch("/api/me");
    const data = await resp.json();
    currentUser = data.logged_in ? data : null;
  } catch {
    currentUser = null;
  }
  updateNavUser();
  populateFilters();
  loadMarketplace();
}

function updateNavUser() {
  // Update nav right area
  const area = document.getElementById("nav-right-area");
  if (area) {
    if (currentUser) {
      area.innerHTML = `
        <div class="user-menu">
          <span class="user-name">👤 ${currentUser.name}</span>
          <button class="logout-btn" onclick="logoutUser()">Sign out</button>
        </div>`;
    } else {
      area.innerHTML = `
        <button class="nav-btn" onclick="showAuthModal('login')">Sign in</button>
        <button class="post-btn" onclick="showAuthModal('signup')"
          style="font-size:11px;padding:5px 12px">Join free →</button>`;
    }
  }

  // Update post button area inside marketplace
  const postArea = document.getElementById("post-btn-area");
  if (postArea) {
    if (currentUser) {
      postArea.innerHTML = `
        <button class="post-btn" onclick="showPostModal()">+ Post buying request</button>`;
    } else {
      postArea.innerHTML = `
        <span class="auth-prompt">
          <span onclick="showAuthModal('signup')">Sign up free</span> to post a request
        </span>`;
    }
  }
}

// ─────────────────────────────────────────
//  Populate filter dropdowns
// ─────────────────────────────────────────
function populateFilters() {
  const productSel = document.getElementById("filter-product");
  const countrySel = document.getElementById("filter-country");

  if (productSel && productSel.options.length <= 1) {
    (window.SERVER_PRODUCTS || []).forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.key; opt.textContent = p.label;
      productSel.appendChild(opt);
    });
  }

  if (countrySel && countrySel.options.length <= 1) {
    (window.SERVER_COUNTRIES || []).forEach(c => {
      const opt = document.createElement("option");
      opt.value = c; opt.textContent = c;
      countrySel.appendChild(opt);
    });
  }
}

// ─────────────────────────────────────────
//  Auth Modal — Sign in / Sign up
// ─────────────────────────────────────────
function showAuthModal(tab = "login") {
  removeModal();
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.id = "auth-modal";

  const countryOptions = (window.SERVER_COUNTRIES || [])
    .map(c => `<option value="${c}">${c}</option>`).join("");

  modal.innerHTML = `
    <div class="modal-box" style="position:relative">
      <button class="modal-close" onclick="removeModal()">✕</button>
      <h2>TradeWatch Marketplace</h2>
      <p>Connect buyers and sellers across 50+ countries.</p>
      <div class="modal-tabs">
        <div class="modal-tab ${tab==="login"?"active":""}" onclick="switchTab('login')">Sign in</div>
        <div class="modal-tab ${tab==="signup"?"active":""}" onclick="switchTab('signup')">Sign up free</div>
      </div>

      <!-- LOGIN TAB -->
      <div id="tab-login" style="display:${tab==="login"?"block":"none"}">
        <div class="form-group">
          <label>Email</label>
          <input class="form-input" id="login-email" type="email" placeholder="you@company.com"/>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input class="form-input" id="login-password" type="password" placeholder="Your password"/>
        </div>
        <div class="modal-error" id="login-error"></div>
        <button class="submit-btn" id="login-btn" onclick="submitLogin()">Sign in →</button>
        <div class="modal-switch">
          No account? <span onclick="switchTab('signup')">Sign up free</span>
        </div>
        <div style="margin-top:12px;padding:10px;background:var(--bg3);border-radius:var(--radius);font-size:11px;color:var(--text3);font-family:var(--mono)">
          💡 Demo account — Email: rajesh@tata-demo.com · Password: demo1234
        </div>
      </div>

      <!-- SIGNUP TAB -->
      <div id="tab-signup" style="display:${tab==="signup"?"block":"none"}">
        <div class="form-row">
          <div class="form-group">
            <label>Full name</label>
            <input class="form-input" id="signup-name" type="text" placeholder="John Smith"/>
          </div>
          <div class="form-group">
            <label>Company</label>
            <input class="form-input" id="signup-company" type="text" placeholder="Acme Ltd"/>
          </div>
        </div>
        <div class="form-group">
          <label>Country</label>
          <select class="form-select" id="signup-country">
            <option value="">Select country...</option>
            ${countryOptions}
          </select>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input class="form-input" id="signup-email" type="email" placeholder="you@company.com"/>
        </div>
        <div class="form-group">
          <label>Password (min 6 characters)</label>
          <input class="form-input" id="signup-password" type="password" placeholder="Create a password"/>
        </div>
        <div class="modal-error" id="signup-error"></div>
        <button class="submit-btn" id="signup-btn" onclick="submitSignup()">
          Create free account →
        </button>
        <div class="modal-switch">
          Already have an account? <span onclick="switchTab('login')">Sign in</span>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) removeModal(); });

  // Auto-focus first input
  setTimeout(() => {
    const first = modal.querySelector("input");
    if (first) first.focus();
  }, 100);
}

function switchTab(tab) {
  document.getElementById("tab-login").style.display  = tab === "login"  ? "block" : "none";
  document.getElementById("tab-signup").style.display = tab === "signup" ? "block" : "none";
  document.querySelectorAll(".modal-tab").forEach((t, i) =>
    t.classList.toggle("active", (i === 0 && tab === "login") || (i === 1 && tab === "signup"))
  );
}

function removeModal() {
  ["auth-modal","post-modal","contact-modal"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

async function submitLogin() {
  const email    = document.getElementById("login-email")?.value.trim();
  const password = document.getElementById("login-password")?.value;
  const err      = document.getElementById("login-error");
  const btn      = document.getElementById("login-btn");
  err.textContent = "";

  if (!email || !password) { err.textContent = "Please enter email and password."; return; }

  btn.disabled = true; btn.textContent = "Signing in...";

  try {
    const resp = await fetch("/api/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await resp.json();

    if (data.ok) {
      currentUser = { name: data.name, company: data.company, country: data.country };
      removeModal();
      updateNavUser();
      loadMarketplace();
      showToast(`Welcome back, ${data.name}! 👋`);
    } else {
      err.textContent = data.error || "Login failed.";
      btn.disabled = false; btn.textContent = "Sign in →";
    }
  } catch {
    err.textContent = "Server error. Is Flask running?";
    btn.disabled = false; btn.textContent = "Sign in →";
  }
}

async function submitSignup() {
  const name     = document.getElementById("signup-name")?.value.trim();
  const company  = document.getElementById("signup-company")?.value.trim();
  const country  = document.getElementById("signup-country")?.value;
  const email    = document.getElementById("signup-email")?.value.trim();
  const password = document.getElementById("signup-password")?.value;
  const err      = document.getElementById("signup-error");
  const btn      = document.getElementById("signup-btn");
  err.textContent = "";

  if (!name || !company || !country || !email || !password) {
    err.textContent = "Please fill in all fields."; return;
  }

  btn.disabled = true; btn.textContent = "Creating account...";

  try {
    const resp = await fetch("/api/signup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, company, country, email, password }),
    });
    const data = await resp.json();

    if (data.ok) {
      currentUser = { name: data.name, company: data.company, country };
      removeModal();
      updateNavUser();
      loadMarketplace();
      showToast(`Welcome to TradeWatch, ${data.name}! 🎉`);
    } else {
      err.textContent = data.error || "Signup failed.";
      btn.disabled = false; btn.textContent = "Create free account →";
    }
  } catch {
    err.textContent = "Server error. Is Flask running?";
    btn.disabled = false; btn.textContent = "Create free account →";
  }
}

async function logoutUser() {
  await fetch("/api/logout", { method: "POST" });
  currentUser = null;
  updateNavUser();
  loadMarketplace();
  showToast("Signed out successfully.");
}

// ─────────────────────────────────────────
//  Post Trade Request Modal
// ─────────────────────────────────────────
function showPostModal() {
  if (!currentUser) { showAuthModal("signup"); return; }
  removeModal();

  const productOptions = (window.SERVER_PRODUCTS || [])
    .map(p => `<option value="${p.key}" data-label="${p.label}">${p.label}</option>`).join("");
  const countryOptions = (window.SERVER_COUNTRIES || [])
    .map(c => `<option value="${c}" ${currentUser.country===c?"selected":""}>${c}</option>`).join("");
  const currencies = (window.SERVER_CURRENCIES || ["USD","EUR","GBP","JPY","CNY"]);
  const timelines  = (window.SERVER_TIMELINES  || ["Immediate","1-3 months","3-6 months","6-12 months","Ongoing supply"]);

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.id = "post-modal";
  modal.innerHTML = `
    <div class="modal-box" style="position:relative;max-height:90vh;overflow-y:auto">
      <button class="modal-close" onclick="removeModal()">✕</button>
      <h2>Post a buying request</h2>
      <p>Tell sellers exactly what you need — they will contact you directly with quotes.</p>

      <div class="form-group">
        <label>Product you want to buy</label>
        <select class="form-select" id="post-product">
          <option value="">Select product...</option>
          ${productOptions}
        </select>
      </div>

      <div class="form-group">
        <label>Buying from (your country)</label>
        <select class="form-select" id="post-country">
          <option value="">Select country...</option>
          ${countryOptions}
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Quantity needed</label>
          <input class="form-input" id="post-quantity" type="text"
            placeholder="e.g. 10,000 units"/>
        </div>
        <div class="form-group">
          <label>Budget</label>
          <input class="form-input" id="post-budget" type="text"
            placeholder="e.g. 500,000"/>
        </div>
      </div>

      <div class="form-group">
        <label>Currency</label>
        <select class="form-select" id="post-currency">
          ${currencies.map(c=>`<option value="${c}" ${c==="USD"?"selected":""}>${c}</option>`).join("")}
        </select>
      </div>

      <div class="form-group">
        <label>Timeline</label>
        <select class="form-select" id="post-timeline">
          <option value="">Select timeline...</option>
          ${timelines.map(t=>`<option value="${t}">${t}</option>`).join("")}
        </select>
      </div>

      <div class="form-group">
        <label>Description — what exactly do you need?</label>
        <textarea class="form-textarea" id="post-description" rows="4"
          placeholder="Describe specifications, certifications needed, delivery terms, etc."></textarea>
      </div>

      <div class="modal-error"   id="post-error"></div>
      <div class="modal-success" id="post-success"></div>
      <button class="submit-btn" id="post-btn" onclick="submitPost()">
        Post buying request →
      </button>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) removeModal(); });
}

async function submitPost() {
  const productEl     = document.getElementById("post-product");
  const product_key   = productEl?.value;
  const product_label = productEl?.options[productEl.selectedIndex]?.dataset.label || "";
  const country_from  = document.getElementById("post-country")?.value;
  const quantity      = document.getElementById("post-quantity")?.value.trim();
  const budget        = document.getElementById("post-budget")?.value.trim();
  const currency      = document.getElementById("post-currency")?.value;
  const timeline      = document.getElementById("post-timeline")?.value;
  const description   = document.getElementById("post-description")?.value.trim();
  const err           = document.getElementById("post-error");
  const succ          = document.getElementById("post-success");
  const btn           = document.getElementById("post-btn");
  err.textContent = ""; succ.textContent = "";

  if (!product_key || !country_from || !quantity || !budget || !timeline || !description) {
    err.textContent = "Please fill in all fields."; return;
  }

  btn.disabled = true; btn.textContent = "Posting...";

  try {
    const resp = await fetch("/api/marketplace", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_key, product_label, quantity,
                             budget, currency, description, country_from, timeline }),
    });
    const data = await resp.json();

    if (data.ok) {
      succ.textContent = "✅ " + data.message;
      setTimeout(() => { removeModal(); loadMarketplace(); }, 1500);
    } else {
      err.textContent = data.error || "Failed to post.";
      btn.disabled = false; btn.textContent = "Post buying request →";
    }
  } catch {
    err.textContent = "Server error. Is Flask running?";
    btn.disabled = false; btn.textContent = "Post buying request →";
  }
}

// ─────────────────────────────────────────
//  Contact Buyer Modal
// ─────────────────────────────────────────
function showContactModal(requestId, buyerName, productLabel) {
  removeModal();
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.id = "contact-modal";
  modal.innerHTML = `
    <div class="modal-box" style="position:relative">
      <button class="modal-close" onclick="removeModal()">✕</button>
      <h2>Contact this buyer</h2>
      <p>Send a message to <strong>${buyerName}</strong> about their
         <strong>${productLabel}</strong> request.</p>

      <div class="form-group">
        <label>Your name</label>
        <input class="form-input" id="c-name" type="text" placeholder="Your full name"
          value="${currentUser?.name || ""}"/>
      </div>
      <div class="form-group">
        <label>Your company</label>
        <input class="form-input" id="c-company" type="text" placeholder="Your company"
          value="${currentUser?.company || ""}"/>
      </div>
      <div class="form-group">
        <label>Your email (buyer will reply here)</label>
        <input class="form-input" id="c-email" type="email" placeholder="you@company.com"/>
      </div>
      <div class="form-group">
        <label>Your message to the buyer</label>
        <textarea class="form-textarea" id="c-message" rows="5"
          placeholder="Introduce yourself, describe your product, pricing, certifications, and why you are the right supplier..."></textarea>
      </div>

      <div class="modal-error"   id="c-error"></div>
      <div class="modal-success" id="c-success"></div>
      <button class="submit-btn" id="c-btn"
        onclick="submitContact(${requestId}, '${buyerName}')">
        Send message to buyer →
      </button>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) removeModal(); });
  document.getElementById("c-name")?.focus();
}

async function submitContact(requestId, buyerName) {
  const sender_name    = document.getElementById("c-name")?.value.trim();
  const sender_company = document.getElementById("c-company")?.value.trim();
  const sender_email   = document.getElementById("c-email")?.value.trim();
  const message        = document.getElementById("c-message")?.value.trim();
  const err            = document.getElementById("c-error");
  const succ           = document.getElementById("c-success");
  const btn            = document.getElementById("c-btn");
  err.textContent = ""; succ.textContent = "";

  if (!sender_name || !sender_company || !sender_email || !message) {
    err.textContent = "Please fill in all fields."; return;
  }

  btn.disabled = true; btn.textContent = "Sending...";

  try {
    const resp = await fetch("/api/contact", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId, sender_name,
                             sender_email, sender_company, message }),
    });
    const data = await resp.json();

    if (data.ok) {
      succ.textContent = `✅ Message sent to ${buyerName}! They will reply to your email.`;
      btn.style.display = "none";
      setTimeout(() => removeModal(), 3000);
    } else {
      err.textContent = data.error || "Failed to send.";
      btn.disabled = false; btn.textContent = "Send message →";
    }
  } catch {
    err.textContent = "Server error.";
    btn.disabled = false; btn.textContent = "Send message →";
  }
}

// ─────────────────────────────────────────
//  Load & Render Marketplace
// ─────────────────────────────────────────
let marketFilter = { product: "", country: "" };

async function loadMarketplace() {
  const grid    = document.getElementById("market-grid");
  const statsEl = document.getElementById("market-stats");
  if (!grid) return;

  grid.innerHTML = `<div class="market-loading">
    <div style="font-size:24px;margin-bottom:8px">⏳</div>Loading marketplace...
  </div>`;

  try {
    const params = new URLSearchParams();
    if (marketFilter.product) params.append("product", marketFilter.product);
    if (marketFilter.country) params.append("country", marketFilter.country);

    const resp  = await fetch("/api/marketplace?" + params.toString());
    const items = await resp.json();

    // Stats bar
    if (statsEl) {
      const uniqueCountries = [...new Set(items.map(i => i.country_from))].length;
      const uniqueProducts  = [...new Set(items.map(i => i.product_label))].length;
      statsEl.innerHTML = `
        <div class="mstat">
          <div class="mstat-val">${items.length}</div>
          <div class="mstat-label">Open requests</div>
        </div>
        <div class="mstat">
          <div class="mstat-val">${uniqueCountries}</div>
          <div class="mstat-label">Countries buying</div>
        </div>
        <div class="mstat">
          <div class="mstat-val">${uniqueProducts}</div>
          <div class="mstat-label">Products wanted</div>
        </div>`;
    }

    // Empty state
    if (!items.length) {
      grid.innerHTML = `
        <div class="market-empty">
          <div style="font-size:32px;margin-bottom:12px">📭</div>
          <div>No requests yet${marketFilter.product || marketFilter.country ? " for this filter" : ""}.</div>
          <div style="margin-top:8px">
            <span style="color:var(--green);cursor:pointer" onclick="showPostModal()">
              Be the first to post a buying request →
            </span>
          </div>
        </div>`;
      return;
    }

    // Render cards
    grid.innerHTML = items.map(item => renderCard(item)).join("");

  } catch (e) {
    grid.innerHTML = `
      <div class="market-empty">
        <div style="font-size:32px;margin-bottom:12px">⚠️</div>
        Could not load marketplace. Is Flask running?
      </div>`;
  }
}

function renderCard(item) {
  const isOwner = currentUser && item.buyer_name === currentUser.name;
  const date    = item.created_at ? item.created_at.slice(0, 10) : "";

  // Timeline badge colour
  const timelineColor = item.timeline === "Immediate"
    ? "var(--red)" : item.timeline === "1-3 months"
    ? "var(--amber)" : "var(--green)";

  return `
  <div class="market-card" id="mcard-${item.id}">
    <div class="mc-top">
      <div class="mc-buyer">
        <div class="mc-name">👤 ${item.buyer_name}</div>
        <div class="mc-company">🏢 ${item.buyer_company}</div>
        <div class="mc-country">📍 ${item.buyer_country}</div>
      </div>
      <div>
        <div class="mc-product-badge">${item.product_label}</div>
        ${isOwner ? `<div style="font-size:9px;color:var(--green);text-align:center;margin-top:4px;font-family:var(--mono)">YOUR REQUEST</div>` : ""}
      </div>
    </div>

    <div class="mc-desc">${item.description}</div>

    <div class="mc-details">
      <div class="mc-detail">
        <div class="mc-detail-label">Quantity</div>
        <div class="mc-detail-val">${item.quantity}</div>
      </div>
      <div class="mc-detail">
        <div class="mc-detail-label">Budget</div>
        <div class="mc-detail-val">${item.budget} ${item.currency}</div>
      </div>
      <div class="mc-detail">
        <div class="mc-detail-label">Buying from</div>
        <div class="mc-detail-val">${item.country_from}</div>
      </div>
      <div class="mc-detail">
        <div class="mc-detail-label">Timeline</div>
        <div class="mc-detail-val" style="color:${timelineColor}">${item.timeline}</div>
      </div>
    </div>

    <div class="mc-footer">
      <span class="mc-date">Posted ${date}</span>
      <div class="mc-actions">
        ${isOwner ? `
          <button class="contact-btn" style="background:var(--blue-bg);color:var(--blue);border:1px solid rgba(74,158,255,.3)"
            onclick="toggleMessages(${item.id})">
            View messages
          </button>
          <button class="delete-btn" onclick="deleteRequest(${item.id})">Delete</button>
        ` : `
          <button class="contact-btn"
            onclick="showContactModal(${item.id},'${item.buyer_name}','${item.product_label}')">
            Contact buyer →
          </button>
        `}
      </div>
    </div>

    ${isOwner ? `
    <div class="messages-panel" id="msgs-${item.id}">
      <div class="msgs-heading">Messages from sellers</div>
      <div id="msgs-body-${item.id}">
        <div style="font-size:11px;color:var(--text3);font-family:var(--mono)">Loading...</div>
      </div>
    </div>` : ""}
  </div>`;
}

async function deleteRequest(id) {
  if (!confirm("Delete this buying request? This cannot be undone.")) return;
  try {
    const resp = await fetch(`/api/marketplace/${id}`, { method: "DELETE" });
    const data = await resp.json();
    if (data.ok) { showToast("Request deleted."); loadMarketplace(); }
    else showToast(data.error || "Could not delete.", true);
  } catch {
    showToast("Server error.", true);
  }
}

async function toggleMessages(id) {
  const panel = document.getElementById(`msgs-${id}`);
  const body  = document.getElementById(`msgs-body-${id}`);
  if (!panel) return;

  if (panel.classList.contains("open")) {
    panel.classList.remove("open"); return;
  }
  panel.classList.add("open");

  try {
    const resp = await fetch(`/api/my-messages/${id}`);
    const msgs = await resp.json();

    if (!msgs.length) {
      body.innerHTML = `
        <div style="font-size:12px;color:var(--text3);font-family:var(--mono);padding:8px 0">
          No messages yet. Sellers will contact you here.
        </div>`;
    } else {
      body.innerHTML = msgs.map(m => `
        <div class="msg-item">
          <div class="msg-sender">${m.sender_name} — ${m.sender_company}</div>
          <div class="msg-meta">✉️ ${m.sender_email} · ${m.created_at?.slice(0,10)}</div>
          <div class="msg-body">${m.message}</div>
        </div>`).join("");
    }
  } catch {
    body.innerHTML = `<div style="font-size:12px;color:var(--red);font-family:var(--mono)">Could not load messages.</div>`;
  }
}

// ─────────────────────────────────────────
//  Filters
// ─────────────────────────────────────────
function applyMarketFilter() {
  marketFilter.product = document.getElementById("filter-product")?.value || "";
  marketFilter.country = document.getElementById("filter-country")?.value || "";
  loadMarketplace();
}

// ─────────────────────────────────────────
//  Toast notification
// ─────────────────────────────────────────
function showToast(msg, isError = false) {
  const existing = document.getElementById("tw-toast");
  if (existing) existing.remove();
  const t = document.createElement("div");
  t.id = "tw-toast";
  t.style.cssText = `
    position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;
    background:${isError ? "var(--red-bg)" : "var(--green-bg)"};
    color:${isError ? "var(--red)" : "var(--green)"};
    border:1px solid ${isError ? "rgba(224,82,82,.35)" : "rgba(61,217,164,.35)"};
    padding:12px 20px;border-radius:var(--radius-lg);font-size:13px;
    font-family:var(--mono);animation:fadeUp .3s both;
    box-shadow:0 4px 20px rgba(0,0,0,.4)`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { if (t.parentNode) t.remove(); }, 3500);
}

// ─────────────────────────────────────────
//  Add messages-panel styles dynamically
// ─────────────────────────────────────────
(function addMsgsStyles() {
  const s = document.createElement("style");
  s.textContent = `
    .messages-panel{margin-top:12px;padding-top:12px;border-top:1px solid var(--border);display:none}
    .messages-panel.open{display:block}
    .msgs-heading{font-size:10px;color:var(--text3);font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
    .msg-item{background:var(--bg3);border-radius:var(--radius);padding:10px 12px;margin-bottom:8px}
    .msg-sender{font-weight:700;color:var(--text);font-family:var(--head);font-size:13px;margin-bottom:2px}
    .msg-meta{font-size:10px;color:var(--text3);font-family:var(--mono);margin-bottom:6px}
    .msg-body{font-size:13px;color:var(--text2);line-height:1.6}
  `;
  document.head.appendChild(s);
})();

// ─────────────────────────────────────────
//  Init on page load
// ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", checkLoginStatus);