# TradeWatch 🌐

**AI-powered trade intelligence monitor for importers & exporters**

TradeWatch uses the Claude AI API to generate real-time, personalised trade news alerts — scored by relevance, categorised by type, and summarised in plain English for business decision-makers.

---

## Features

- AI-generated trade news tailored to your industry and trading partners
- Relevance scoring (0–100) for each alert
- Impact levels: high / medium / low
- Sentiment analysis: positive / negative / neutral
- Filter by category: Tariffs, Sanctions, Agreements, Quotas, Regulations, Logistics
- AI analysis summary for each news item
- One-click AI refresh for fresh intelligence

---

## Getting Started

### Run locally

1. Clone the repo:
   ```
   git clone https://github.com/YOUR_USERNAME/tradewatch.git
   cd tradewatch
   ```

2. Open `index.html` in your browser — no installation needed.

3. Enter your Claude API key when prompted.  
   Get a free key at [platform.claude.com](https://platform.claude.com) → API Keys.

### Run in GitHub Codespaces

1. Open this repo on GitHub
2. Click **Code → Codespaces → Create codespace on main**
3. In the terminal, run:
   ```
   python3 -m http.server 8080
   ```
4. Click **Open in Browser** when Codespaces prompts you
5. Enter your Claude API key in the app

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript |
| AI | Claude API (claude-sonnet-4-20250514) |
| Hosting | Any static host (GitHub Pages, Vercel, Netlify) |

---

## Project Structure

```
tradewatch/
├── index.html       # Main application (single file)
├── README.md        # This file
├── LICENSE          # Copyright notice
└── .devcontainer/
    └── devcontainer.json   # GitHub Codespaces config
```

---

## API Usage & Cost

Each news refresh uses approximately 500–1,000 tokens.  
Claude Sonnet pricing: $3 per million input tokens / $15 per million output tokens.  
A $5 free credit balance covers ~800–1,500 refreshes.

---

## Roadmap

- [ ] Real news feed integration (NewsAPI / GDELT)
- [ ] Email alert notifications (SendGrid)
- [ ] User account & saved profiles
- [ ] Mobile app (React Native)
- [ ] Historical trend charts

---

## Copyright

Copyright &copy; 2026. All rights reserved.

This project and its source code are the intellectual property of the author.  
Unauthorised copying, distribution, or commercial use is prohibited without written permission.

Built with assistance from [Claude AI](https://claude.ai) by Anthropic.
