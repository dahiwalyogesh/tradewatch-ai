# 🌍 TradeWatch AI — Global Trade Intelligence + Live Marketplace

> A full-stack AI-powered trade intelligence platform built with **Python Flask**.
> See product demand across **50+ countries**, get personalised AI trade alerts,
> and connect buyers with sellers in a **live trade marketplace**.


---

## 🚀 Live Demo

**👉 [tradewatch-ai.onrender.com](https://tradewatch-ai.onrender.com)**

> Use your own free API key from Groq (free) or Google Gemini (free) to try all features.

---

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
- AI generates 8 personalised trade alerts
- Risk score gauge + sentiment chart
- Ask AI anything about your trade situation
- Generate weekly email digest
- Export PDF report

### 🛒 Live Marketplace
- Real buyers post what they want to purchase
- Filter by product or country
- Sellers contact buyers directly
- Full user accounts — sign up free

### 🔌 Multi-AI Support
| Provider | Model | Free? |
|----------|-------|-------|
| Anthropic | Claude Sonnet | $5 free credits |
| OpenAI | GPT-4o mini | $5 free credits |
| Google | Gemini 1.5 Flash | ✅ Free |
| Groq | Llama 3 70B | ✅ Free |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python · Flask |
| Database | SQLite (built into Python) |
| AI | Anthropic · OpenAI · Google · Groq SDKs |
| Map | D3.js · TopoJSON |
| Charts | Chart.js |
| PDF | jsPDF |
| Deployment | Railway |

---

## ⚡ Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/dahiwalyogesh/tradewatch-ai.git
cd tradewatch-ai
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the server
```bash
python app.py
```

### 4. Open in browser
```
http://localhost:5000
```

### 5. Get a free API key
**Groq — completely free, no credit card:**
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up → API Keys → Create key
3. Paste in the app and click Launch →

**Google Gemini — also free:**
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with Google → Get API key

---

## 📁 Project Structure

```
tradewatch-ai/
├── app.py                  # Flask server — all API endpoints and AI calls
├── seed_data.py            # Run once to add demo marketplace data
├── requirements.txt        # Python dependencies
├── Procfile                # Railway deployment config
├── .env.example            # Environment variable template
├── .gitignore              # Keeps secrets off GitHub
├── README.md
├── templates/
│   └── index.html          # Single-page Jinja2 template
└── static/
    ├── style.css            # Dark navy theme
    ├── app.js               # Frontend JS — world map, rankings, monitor
    └── marketplace.js       # Marketplace — auth, posting, contact forms
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/validate-key` | Validate AI key (any provider) |
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

##  Add Demo Data

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

## 🚀 Deploy to Railway

1. Push to GitHub
2. Go to [railway.app](https://railway.app)
3. New Project → Deploy from GitHub repo
4. Select your repo
5. Add environment variable: `SECRET_KEY=your-secret`
6. Generate domain → your app is live!

---

## 🔒 Security

- API keys validated server-side using official Python SDKs
- Keys stored only in Flask session — never in any database
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
[Railway](https://railway.app)
