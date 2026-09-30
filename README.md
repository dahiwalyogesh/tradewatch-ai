# 🌍 TradeWatch AI — Global Trade Intelligence + Live Marketplace

> A full-stack AI-powered trade intelligence platform built with **Python Flask**.
> See product demand across **50+ countries**, get personalised AI trade alerts,
> and connect buyers with sellers in a **live trade marketplace**.

---

## 🚀 Live Demo

**👉 [tradewatch-ai-2.onrender.com](https://tradewatch-ai-2.onrender.com)**

> No API key or sign-up needed — the demo opens straight into the app.
> Hosted on a free plan, so the first visit may take up to a minute while the server wakes up.

---

## ✨ Features

### 🗺️ World Demand Map
- Interactive D3.js choropleth map — 50+ countries
- 10 product categories — click any to recolour the map instantly
- Hover any country for demand score, market size and growth rate

### 📊 Country Rankings
- Full sortable table of all 50+ countries
- Search by country, region or product
- Click any column to sort

### 🤖 AI Trade Monitor
- Enter your industry, home country and trading partners
- AI generates 8 personalised trade alerts plus recommendations
- Risk score gauge + sentiment chart
- Ask AI anything about your trade situation
- Generate a weekly email digest
- Export a PDF report

### 🛒 Live Marketplace
- Buyers post what they want to purchase
- Filter by product or country
- Sellers contact buyers directly
- Full user accounts — sign up free

### 🔌 Multi-AI Support
One unified backend works with four AI providers. Model names can be changed through environment variables without editing code.

| Provider | Default model | Env variable (key) | Env variable (model) |
|----------|---------------|--------------------|----------------------|
| Anthropic | Claude Haiku 4.5 | `ANTHROPIC_API_KEY` | `CLAUDE_MODEL` |
| OpenAI | GPT-4o mini | `OPENAI_API_KEY` | `OPENAI_MODEL` |
| Google | Gemini 3.6 Flash | `GEMINI_API_KEY` | `GEMINI_MODEL` |
| Groq | Llama 3.3 70B | `GROQ_API_KEY` | `GROQ_MODEL` |

**Demo mode:** if a provider key is set on the server, visitors skip the key screen and go straight into the app. The key stays on the server and is never sent to the browser. Visitors can still use their own key via **Change AI**.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python · Flask · Gunicorn |
| Database | SQLite |
| AI | Anthropic · OpenAI · Google · Groq SDKs |
| Map | D3.js · TopoJSON |
| Charts | Chart.js |
| PDF | jsPDF |
| Data | World Bank Open Data API |
| Deployment | Render |

---

## ⚡ Quick Start (run locally)

### 1. Clone the repo
```bash
git clone https://github.com/dahiwalyogesh/tradewatch-ai.git
cd tradewatch-ai
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Add your settings
Copy `.env.example` to `.env` and fill in your values (at minimum `SECRET_KEY`, plus any AI key you want to use).

### 4. Run the server
```bash
python app.py
```

### 5. Open in browser
```
http://localhost:5000
```

**Getting an AI key:**
- **Google Gemini** — [aistudio.google.com](https://aistudio.google.com) → Get API key (free tier available)
- **Groq** — [console.groq.com](https://console.groq.com) → API Keys
- **Anthropic** — [platform.claude.com](https://platform.claude.com) (pay-as-you-go)
- **OpenAI** — [platform.openai.com](https://platform.openai.com) (pay-as-you-go)

---

## 📁 Project Structure

```
tradewatch-ai/
├── app.py                  # Flask server — all API endpoints and AI calls
├── admin_routes.py         # Reference copy of the admin dashboard routes
├── seed_data.py            # Run once to add demo marketplace data
├── requirements.txt        # Python dependencies
├── Procfile                # Start command (gunicorn)
├── render.yaml             # Render deployment blueprint
├── .python-version         # Python 3.11
├── .env.example            # Environment variable template
├── .gitignore              # Keeps secrets off GitHub
├── README.md
├── templates/
│   ├── index.html          # Single-page Jinja2 template
│   ├── admin.html          # Admin dashboard
│   └── admin_login.html    # Admin login
└── static/
    ├── style.css            # Dark navy theme
    ├── app.js               # Frontend JS — world map, rankings, monitor
    └── marketplace.js       # Marketplace — auth, posting, contact forms
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/providers` | AI providers, models and demo-key status |
| POST | `/api/validate-key` | Validate an AI key (or use the server key) |
| GET | `/api/world-data` | All 50+ country demand data |
| POST | `/api/generate-news` | AI news + recommendations |
| POST | `/api/ask` | Answer a trade question |
| POST | `/api/email-digest` | Generate email digest |
| GET | `/api/marketplace` | Get all trade requests |
| POST | `/api/marketplace` | Post a buying request |
| POST | `/api/contact` | Contact a buyer |
| POST | `/api/signup` | Create account |
| POST | `/api/login` | Sign in |
| GET | `/api/real-data/<code>` | Real World Bank data |

---

## 🧪 Demo Data

Run this once to populate the marketplace with demo buyers:

```bash
python seed_data.py
```

Demo login:
```
Email:    rajesh@tata-demo.com
Password: demo1234
```

---

## 🚀 Deploy to Render (free)

1. Push the repo to GitHub
2. Sign in at [render.com](https://render.com) with GitHub
3. **New → Web Service** → select this repo
4. Settings:
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
   - **Instance type:** Free
5. Add environment variables:

| Key | Value |
|-----|-------|
| `SECRET_KEY` | Any long random string |
| `ADMIN_PASSWORD` | Password for `/admin` |
| `ANTHROPIC_API_KEY` (and/or others) | Your AI key(s) for demo mode |

6. Click **Deploy** — your app is live at `https://<service-name>.onrender.com`

**Free plan notes:** the service sleeps after about 15 minutes idle and takes up to a minute to wake. The file system resets on restart, so SQLite data (new sign-ups and posts) returns to the committed `tradewatch.db`.

---

## 🔒 Security

- AI keys are read from environment variables — never stored in code or sent to the browser
- Keys that visitors enter are held only in their Flask session — never in the database
- Admin password is set via the `ADMIN_PASSWORD` environment variable (admin login is disabled if unset)
- Passwords hashed using Werkzeug security
- `.env` is in `.gitignore` — never committed to GitHub

---

## 📊 Data

The demand scores on the world map are **illustrative estimates** based on
publicly available trade knowledge. For production use, replace with:

- [UN Comtrade](https://comtradeplus.un.org) — real import/export data
- [World Bank Open Data](https://data.worldbank.org) — economic indicators
- [WTO Data Portal](https://data.wto.org) — tariff and trade data

Real World Bank data is already integrated at `/api/real-data/<country_code>`.

---

## 🤝 Contributing

Pull requests welcome! Open an issue for bugs or feature ideas.

---

## 📄 License

© 2026 TradeWatch AI

---

## 🙏 Built with

[Flask](https://flask.palletsprojects.com/) ·
[Anthropic SDK](https://github.com/anthropics/anthropic-sdk-python) ·
[OpenAI SDK](https://github.com/openai/openai-python) ·
[Google GenerativeAI](https://github.com/google/generative-ai-python) ·
[Groq SDK](https://github.com/groq/groq-python) ·
[D3.js](https://d3js.org/) ·
[Chart.js](https://www.chartjs.org/) ·
[Render](https://render.com)
