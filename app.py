"""
TradeWatch - AI Trade Intelligence + Live Marketplace
=====================================================
Features:
  - Multi-AI support (Claude, GPT-4o, Gemini, Llama 3)
  - World demand map (50+ countries, 10 products)
  - Live marketplace — real buyers post what they want
  - Seller contact form to connect with buyers
  - SQLite database (built into Python, no extra install)

Setup:
    pip install -r requirements.txt
    python app.py
    Open: http://localhost:5000
"""

import os
import json
import sqlite3
import requests
from datetime import datetime
from flask import (Flask, render_template, request,
                   jsonify, session, g)
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "tradewatch-dev-key-change-in-production")

DATABASE = "tradewatch.db"


# ------------------------------------------------------------------
#  Database helpers
# ------------------------------------------------------------------
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(error):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Create all tables if they don't exist yet."""
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            company     TEXT NOT NULL,
            country     TEXT NOT NULL,
            email       TEXT NOT NULL UNIQUE,
            password    TEXT NOT NULL,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS trade_requests (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            product_key TEXT NOT NULL,
            product_label TEXT NOT NULL,
            quantity    TEXT NOT NULL,
            budget      TEXT NOT NULL,
            currency    TEXT NOT NULL DEFAULT 'USD',
            description TEXT NOT NULL,
            country_from TEXT NOT NULL,
            timeline    TEXT NOT NULL,
            status      TEXT DEFAULT 'open',
            created_at  TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS contact_messages (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id   INTEGER NOT NULL,
            sender_name  TEXT NOT NULL,
            sender_email TEXT NOT NULL,
            sender_company TEXT NOT NULL,
            message      TEXT NOT NULL,
            created_at   TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (request_id) REFERENCES trade_requests(id)
        );
    """)
    db.commit()
    db.close()


# Initialise database on startup
init_db()


# ------------------------------------------------------------------
#  World Bank — real data fetcher
# ------------------------------------------------------------------
def fetch_world_bank(country_code, indicator):
    url = (f"https://api.worldbank.org/v2/country/{country_code}"
           f"/indicator/{indicator}")
    try:
        resp = requests.get(url,
                            params={"format": "json", "mrv": 1},
                            timeout=5)
        data = resp.json()
        return data[1][0]["value"] if data[1] else None
    except Exception:
        return None


# ------------------------------------------------------------------
#  AI Provider — unified call function
# ------------------------------------------------------------------
def call_ai(api_key: str, prompt: str,
            provider: str = "claude", max_tokens: int = 2500) -> str:

    if provider == "claude":
        from anthropic import Anthropic
        client = Anthropic(api_key=api_key)
        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
        return msg.content[0].text

    elif provider == "openai":
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
        return resp.choices[0].message.content

    elif provider == "gemini":
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        return model.generate_content(prompt).text

    elif provider == "groq":
        from groq import Groq
        client = Groq(api_key=api_key)
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
        return resp.choices[0].message.content

    else:
        raise ValueError(f"Unknown provider: {provider}")


# ------------------------------------------------------------------
#  Static data
# ------------------------------------------------------------------
WORLD_COUNTRIES = [
    [156,  "🇨🇳", "China",          "Asia-Pacific",  {"Semi":92,"PCB":78,"Display":94,"EV":95,"Solar":90,"LED":70,"Pharma":65,"Auto":88,"Textiles":85,"Agri":72},  "$420B", "▲+18%", "EV Batteries"],
    [840,  "🇺🇸", "United States",  "North America", {"Semi":88,"PCB":70,"Display":80,"EV":85,"Solar":82,"LED":68,"Pharma":92,"Auto":90,"Textiles":45,"Agri":88},  "$320B", "▲+12%", "Pharmaceuticals"],
    [276,  "🇩🇪", "Germany",        "Europe",        {"Semi":65,"PCB":88,"Display":62,"EV":88,"Solar":85,"LED":55,"Pharma":78,"Auto":95,"Textiles":40,"Agri":60},  "$180B", "▲+9%",  "Automotive Parts"],
    [392,  "🇯🇵", "Japan",          "Asia-Pacific",  {"Semi":88,"PCB":65,"Display":90,"EV":70,"Solar":55,"LED":80,"Pharma":72,"Auto":88,"Textiles":35,"Agri":50},  "$210B", "▲+8%",  "Display Panels"],
    [410,  "🇰🇷", "South Korea",    "Asia-Pacific",  {"Semi":82,"PCB":75,"Display":88,"EV":72,"Solar":58,"LED":85,"Pharma":55,"Auto":78,"Textiles":42,"Agri":38},  "$120B", "▲+11%", "Display Panels"],
    [158,  "🇹🇼", "Taiwan",         "Asia-Pacific",  {"Semi":90,"PCB":88,"Display":85,"EV":45,"Solar":52,"LED":78,"Pharma":42,"Auto":38,"Textiles":30,"Agri":25},  "$95B",  "▲+14%", "Semiconductors"],
    [826,  "🇬🇧", "United Kingdom", "Europe",        {"Semi":68,"PCB":55,"Display":58,"EV":72,"Solar":50,"LED":48,"Pharma":85,"Auto":70,"Textiles":45,"Agri":65},  "$65B",  "▲+6%",  "Pharmaceuticals"],
    [250,  "🇫🇷", "France",         "Europe",        {"Semi":58,"PCB":48,"Display":52,"EV":68,"Solar":65,"LED":44,"Pharma":80,"Auto":72,"Textiles":50,"Agri":78},  "$55B",  "▲+7%",  "Agriculture"],
    [356,  "🇮🇳", "India",          "South Asia",    {"Semi":62,"PCB":55,"Display":58,"EV":55,"Solar":78,"LED":72,"Pharma":88,"Auto":65,"Textiles":92,"Agri":85},  "$85B",  "▲+25%", "Textiles"],
    [36,   "🇦🇺", "Australia",      "Asia-Pacific",  {"Semi":45,"PCB":38,"Display":42,"EV":42,"Solar":65,"LED":35,"Pharma":58,"Auto":48,"Textiles":28,"Agri":88},  "$18B",  "▲+8%",  "Agriculture"],
    [124,  "🇨🇦", "Canada",         "North America", {"Semi":60,"PCB":52,"Display":55,"EV":60,"Solar":58,"LED":45,"Pharma":70,"Auto":75,"Textiles":32,"Agri":82},  "$28B",  "▲+6%",  "Agriculture"],
    [528,  "🇳🇱", "Netherlands",    "Europe",        {"Semi":58,"PCB":72,"Display":50,"EV":65,"Solar":55,"LED":48,"Pharma":75,"Auto":58,"Textiles":35,"Agri":70},  "$48B",  "▲+5%",  "Pharmaceuticals"],
    [752,  "🇸🇪", "Sweden",         "Europe",        {"Semi":52,"PCB":58,"Display":48,"EV":70,"Solar":62,"LED":44,"Pharma":65,"Auto":68,"Textiles":30,"Agri":55},  "$32B",  "▲+9%",  "EV Batteries"],
    [246,  "🇫🇮", "Finland",        "Europe",        {"Semi":48,"PCB":52,"Display":44,"EV":62,"Solar":50,"LED":38,"Pharma":55,"Auto":55,"Textiles":22,"Agri":48},  "$12B",  "▲+6%",  "EV Batteries"],
    [203,  "🇨🇿", "Czech Republic", "Europe",        {"Semi":42,"PCB":55,"Display":38,"EV":55,"Solar":48,"LED":35,"Pharma":48,"Auto":78,"Textiles":38,"Agri":52},  "$8B",   "▲+5%",  "Automotive Parts"],
    [616,  "🇵🇱", "Poland",         "Europe",        {"Semi":38,"PCB":48,"Display":35,"EV":50,"Solar":45,"LED":32,"Pharma":52,"Auto":68,"Textiles":45,"Agri":65},  "$10B",  "▲+7%",  "Automotive Parts"],
    [76,   "🇧🇷", "Brazil",         "South America", {"Semi":35,"PCB":32,"Display":38,"EV":35,"Solar":55,"LED":30,"Pharma":60,"Auto":58,"Textiles":52,"Agri":90},  "$22B",  "▲+14%", "Agriculture"],
    [724,  "🇪🇸", "Spain",          "Europe",        {"Semi":42,"PCB":38,"Display":45,"EV":58,"Solar":72,"LED":38,"Pharma":62,"Auto":65,"Textiles":48,"Agri":72},  "$30B",  "▲+8%",  "Solar Cells"],
    [380,  "🇮🇹", "Italy",          "Europe",        {"Semi":45,"PCB":42,"Display":48,"EV":55,"Solar":68,"LED":40,"Pharma":68,"Auto":75,"Textiles":70,"Agri":75},  "$35B",  "▲+6%",  "Agriculture"],
    [764,  "🇹🇭", "Thailand",       "Asia-Pacific",  {"Semi":55,"PCB":62,"Display":52,"EV":48,"Solar":50,"LED":58,"Pharma":45,"Auto":72,"Textiles":78,"Agri":80},  "$25B",  "▲+12%", "Textiles"],
    [458,  "🇲🇾", "Malaysia",       "Asia-Pacific",  {"Semi":72,"PCB":75,"Display":65,"EV":40,"Solar":48,"LED":68,"Pharma":38,"Auto":42,"Textiles":55,"Agri":62},  "$35B",  "▲+10%", "Semiconductors"],
    [702,  "🇸🇬", "Singapore",      "Asia-Pacific",  {"Semi":80,"PCB":82,"Display":72,"EV":42,"Solar":38,"LED":62,"Pharma":55,"Auto":35,"Textiles":22,"Agri":18},  "$45B",  "▲+8%",  "Semiconductors"],
    [360,  "🇮🇩", "Indonesia",      "Asia-Pacific",  {"Semi":38,"PCB":35,"Display":40,"EV":42,"Solar":52,"LED":45,"Pharma":48,"Auto":55,"Textiles":80,"Agri":85},  "$18B",  "▲+18%", "Textiles"],
    [704,  "🇻🇳", "Vietnam",        "Asia-Pacific",  {"Semi":55,"PCB":65,"Display":48,"EV":38,"Solar":42,"LED":60,"Pharma":35,"Auto":40,"Textiles":85,"Agri":78},  "$28B",  "▲+20%", "Textiles"],
    [484,  "🇲🇽", "Mexico",         "North America", {"Semi":42,"PCB":45,"Display":40,"EV":48,"Solar":45,"LED":38,"Pharma":52,"Auto":82,"Textiles":55,"Agri":70},  "$20B",  "▲+9%",  "Automotive Parts"],
    [710,  "🇿🇦", "South Africa",   "Africa",        {"Semi":28,"PCB":25,"Display":30,"EV":32,"Solar":48,"LED":28,"Pharma":42,"Auto":45,"Textiles":38,"Agri":65},  "$8B",   "▲+6%",  "Agriculture"],
    [682,  "🇸🇦", "Saudi Arabia",   "Middle East",   {"Semi":35,"PCB":30,"Display":38,"EV":52,"Solar":55,"LED":32,"Pharma":48,"Auto":60,"Textiles":25,"Agri":30},  "$15B",  "▲+15%", "EV Batteries"],
    [784,  "🇦🇪", "UAE",            "Middle East",   {"Semi":42,"PCB":38,"Display":45,"EV":58,"Solar":52,"LED":40,"Pharma":55,"Auto":62,"Textiles":28,"Agri":22},  "$18B",  "▲+12%", "EV Batteries"],
    [376,  "🇮🇱", "Israel",         "Middle East",   {"Semi":75,"PCB":60,"Display":55,"EV":45,"Solar":50,"LED":52,"Pharma":72,"Auto":40,"Textiles":20,"Agri":35},  "$22B",  "▲+8%",  "Semiconductors"],
    [792,  "🇹🇷", "Turkey",         "Europe/Asia",   {"Semi":38,"PCB":42,"Display":40,"EV":45,"Solar":52,"LED":38,"Pharma":55,"Auto":65,"Textiles":72,"Agri":68},  "$14B",  "▲+7%",  "Textiles"],
    [566,  "🇳🇬", "Nigeria",        "Africa",        {"Semi":15,"PCB":12,"Display":18,"EV":20,"Solar":38,"LED":18,"Pharma":35,"Auto":30,"Textiles":42,"Agri":70},  "$3B",   "▲+12%", "Agriculture"],
    [32,   "🇦🇷", "Argentina",      "South America", {"Semi":28,"PCB":25,"Display":30,"EV":32,"Solar":42,"LED":25,"Pharma":48,"Auto":45,"Textiles":40,"Agri":85},  "$8B",   "▲+6%",  "Agriculture"],
    [152,  "🇨🇱", "Chile",          "South America", {"Semi":30,"PCB":28,"Display":32,"EV":38,"Solar":55,"LED":28,"Pharma":42,"Auto":38,"Textiles":30,"Agri":75},  "$7B",   "▲+9%",  "Solar Cells"],
    [50,   "🇧🇩", "Bangladesh",     "South Asia",    {"Semi":12,"PCB":10,"Display":15,"EV":18,"Solar":30,"LED":15,"Pharma":38,"Auto":20,"Textiles":92,"Agri":75},  "$3B",   "▲+15%", "Textiles"],
    [40,   "🇦🇹", "Austria",        "Europe",        {"Semi":48,"PCB":52,"Display":44,"EV":60,"Solar":55,"LED":42,"Pharma":68,"Auto":72,"Textiles":35,"Agri":58},  "$15B",  "▲+5%",  "Automotive Parts"],
    [56,   "🇧🇪", "Belgium",        "Europe",        {"Semi":52,"PCB":55,"Display":48,"EV":58,"Solar":50,"LED":45,"Pharma":72,"Auto":60,"Textiles":38,"Agri":62},  "$20B",  "▲+4%",  "Pharmaceuticals"],
    [756,  "🇨🇭", "Switzerland",    "Europe",        {"Semi":60,"PCB":55,"Display":52,"EV":58,"Solar":50,"LED":48,"Pharma":90,"Auto":55,"Textiles":30,"Agri":40},  "$28B",  "▲+5%",  "Pharmaceuticals"],
    [208,  "🇩🇰", "Denmark",        "Europe",        {"Semi":48,"PCB":45,"Display":44,"EV":65,"Solar":55,"LED":40,"Pharma":70,"Auto":52,"Textiles":28,"Agri":65},  "$12B",  "▲+7%",  "EV Batteries"],
    [578,  "🇳🇴", "Norway",         "Europe",        {"Semi":45,"PCB":42,"Display":40,"EV":78,"Solar":48,"LED":38,"Pharma":62,"Auto":50,"Textiles":22,"Agri":55},  "$14B",  "▲+10%", "EV Batteries"],
    [116,  "🇰🇭", "Cambodia",       "Asia-Pacific",  {"Semi":15,"PCB":18,"Display":12,"EV":10,"Solar":25,"LED":20,"Pharma":18,"Auto":15,"Textiles":82,"Agri":70},  "$2B",   "▲+14%", "Textiles"],
    [404,  "🇰🇪", "Kenya",          "Africa",        {"Semi":12,"PCB":10,"Display":14,"EV":15,"Solar":35,"LED":12,"Pharma":30,"Auto":20,"Textiles":32,"Agri":65},  "$2B",   "▲+11%", "Agriculture"],
    [818,  "🇪🇬", "Egypt",          "Africa",        {"Semi":22,"PCB":20,"Display":25,"EV":28,"Solar":45,"LED":25,"Pharma":38,"Auto":35,"Textiles":60,"Agri":72},  "$5B",   "▲+10%", "Agriculture"],
    [170,  "🇨🇴", "Colombia",       "South America", {"Semi":25,"PCB":22,"Display":28,"EV":28,"Solar":40,"LED":22,"Pharma":45,"Auto":35,"Textiles":42,"Agri":72},  "$5B",   "▲+7%",  "Agriculture"],
    [348,  "🇭🇺", "Hungary",        "Europe",        {"Semi":40,"PCB":45,"Display":38,"EV":60,"Solar":48,"LED":35,"Pharma":52,"Auto":80,"Textiles":38,"Agri":55},  "$9B",   "▲+8%",  "Automotive Parts"],
    [630,  "🇵🇹", "Portugal",       "Europe",        {"Semi":38,"PCB":35,"Display":40,"EV":52,"Solar":58,"LED":32,"Pharma":55,"Auto":45,"Textiles":40,"Agri":60},  "$10B",  "▲+6%",  "Solar Cells"],
    [300,  "🇬🇷", "Greece",         "Europe",        {"Semi":30,"PCB":28,"Display":32,"EV":45,"Solar":62,"LED":28,"Pharma":48,"Auto":38,"Textiles":35,"Agri":58},  "$6B",   "▲+5%",  "Solar Cells"],
    [642,  "🇷🇴", "Romania",        "Europe",        {"Semi":32,"PCB":38,"Display":30,"EV":48,"Solar":42,"LED":28,"Pharma":45,"Auto":65,"Textiles":42,"Agri":60},  "$7B",   "▲+7%",  "Automotive Parts"],
    [100,  "🇧🇬", "Bulgaria",       "Europe",        {"Semi":28,"PCB":32,"Display":25,"EV":40,"Solar":38,"LED":25,"Pharma":38,"Auto":52,"Textiles":40,"Agri":55},  "$4B",   "▲+5%",  "Automotive Parts"],
    [398,  "🇰🇿", "Kazakhstan",     "Central Asia",  {"Semi":20,"PCB":18,"Display":22,"EV":28,"Solar":35,"LED":20,"Pharma":30,"Auto":38,"Textiles":32,"Agri":55},  "$4B",   "▲+8%",  "Agriculture"],
]

PRODUCTS = [
    {"key": "Semi",     "label": "Semiconductors"},
    {"key": "PCB",      "label": "PCB Assemblies"},
    {"key": "Display",  "label": "Display Panels"},
    {"key": "EV",       "label": "EV Batteries"},
    {"key": "Solar",    "label": "Solar Cells"},
    {"key": "LED",      "label": "LED Components"},
    {"key": "Pharma",   "label": "Pharmaceuticals"},
    {"key": "Auto",     "label": "Automotive Parts"},
    {"key": "Textiles", "label": "Textiles"},
    {"key": "Agri",     "label": "Agriculture"},
]

INDUSTRIES = [
    "Electronics","Automotive","Agriculture","Textiles",
    "Chemicals","Pharmaceuticals","Energy","Consumer Goods",
]

COUNTRIES = [
    "United Kingdom","United States","Germany","China",
    "Japan","India","Australia","Canada","France","Brazil",
    "South Korea","Taiwan","Singapore","UAE","Saudi Arabia",
    "Netherlands","Sweden","Italy","Spain","Thailand",
]

PROVIDERS = {
    "claude":  {"name": "Claude",       "company": "Anthropic", "model": "claude-sonnet-4-20250514", "free": False, "url": "https://platform.claude.com"},
    "openai":  {"name": "GPT-4o mini",  "company": "OpenAI",    "model": "gpt-4o-mini",              "free": False, "url": "https://platform.openai.com"},
    "gemini": {"name": "Gemini Flash", "company": "Google", "model": "gemini-2.0-flash", "free": True, "url": "https://aistudio.google.com"},
    "groq":    {"name": "Llama 3",      "company": "Groq",      "model": "llama-3.1-8b-instant",          "free": True,  "url": "https://console.groq.com"},
}

CURRENCIES = ["USD","EUR","GBP","JPY","CNY","INR","AUD","CAD"]
TIMELINES  = ["Immediate","1-3 months","3-6 months","6-12 months","Ongoing supply"]


# ------------------------------------------------------------------
#  Routes — Pages
# ------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html",
        products=PRODUCTS, industries=INDUSTRIES,
        countries=COUNTRIES, providers=PROVIDERS,
        currencies=CURRENCIES, timelines=TIMELINES,
    )


# ------------------------------------------------------------------
#  Routes — Auth (sign up / login / logout)
# ------------------------------------------------------------------
@app.route("/api/signup", methods=["POST"])
def signup():
    data     = request.get_json() or {}
    name     = data.get("name", "").strip()
    company  = data.get("company", "").strip()
    country  = data.get("country", "").strip()
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not all([name, company, country, email, password]):
        return jsonify({"ok": False, "error": "All fields are required."})
    if len(password) < 6:
        return jsonify({"ok": False, "error": "Password must be at least 6 characters."})

    db = get_db()
    try:
        db.execute(
            "INSERT INTO users (name, company, country, email, password) VALUES (?,?,?,?,?)",
            (name, company, country, email, generate_password_hash(password))
        )
        db.commit()
        user = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        session["user_id"]   = user["id"]
        session["user_name"] = user["name"]
        session["user_company"] = user["company"]
        session["user_country"] = user["country"]
        return jsonify({"ok": True, "name": name, "company": company})
    except sqlite3.IntegrityError:
        return jsonify({"ok": False, "error": "Email already registered. Please log in."})


@app.route("/api/login", methods=["POST"])
def login():
    data     = request.get_json() or {}
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    db   = get_db()
    user = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()

    if not user or not check_password_hash(user["password"], password):
        return jsonify({"ok": False, "error": "Incorrect email or password."})

    session["user_id"]      = user["id"]
    session["user_name"]    = user["name"]
    session["user_company"] = user["company"]
    session["user_country"] = user["country"]
    return jsonify({"ok": True, "name": user["name"], "company": user["company"]})


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.route("/api/me")
def me():
    if "user_id" not in session:
        return jsonify({"logged_in": False})
    return jsonify({
        "logged_in": True,
        "name":    session.get("user_name"),
        "company": session.get("user_company"),
        "country": session.get("user_country"),
    })


# ------------------------------------------------------------------
#  Routes — Marketplace
# ------------------------------------------------------------------
@app.route("/api/marketplace", methods=["GET"])
def get_marketplace():
    """Return all open trade requests, newest first."""
    db = get_db()

    product_filter = request.args.get("product", "")
    country_filter = request.args.get("country", "")

    query = """
        SELECT tr.*, u.name as buyer_name, u.company as buyer_company,
               u.country as buyer_country
        FROM trade_requests tr
        JOIN users u ON tr.user_id = u.id
        WHERE tr.status = 'open'
    """
    params = []

    if product_filter:
        query += " AND tr.product_key = ?"
        params.append(product_filter)
    if country_filter:
        query += " AND tr.country_from = ?"
        params.append(country_filter)

    query += " ORDER BY tr.created_at DESC"

    rows = db.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/api/marketplace", methods=["POST"])
def post_trade_request():
    """Post a new trade request. User must be logged in."""
    if "user_id" not in session:
        return jsonify({"ok": False, "error": "Please log in to post a request."}), 401

    data          = request.get_json() or {}
    product_key   = data.get("product_key", "").strip()
    product_label = data.get("product_label", "").strip()
    quantity      = data.get("quantity", "").strip()
    budget        = data.get("budget", "").strip()
    currency      = data.get("currency", "USD").strip()
    description   = data.get("description", "").strip()
    country_from  = data.get("country_from", "").strip()
    timeline      = data.get("timeline", "").strip()

    if not all([product_key, quantity, budget, description, country_from, timeline]):
        return jsonify({"ok": False, "error": "All fields are required."})

    db = get_db()
    db.execute("""
        INSERT INTO trade_requests
          (user_id, product_key, product_label, quantity, budget,
           currency, description, country_from, timeline)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (session["user_id"], product_key, product_label,
          quantity, budget, currency, description, country_from, timeline))
    db.commit()
    return jsonify({"ok": True, "message": "Your request has been posted!"})


@app.route("/api/marketplace/<int:req_id>", methods=["DELETE"])
def delete_trade_request(req_id):
    """Delete own request."""
    if "user_id" not in session:
        return jsonify({"ok": False, "error": "Not logged in."}), 401

    db  = get_db()
    row = db.execute("SELECT * FROM trade_requests WHERE id=?", (req_id,)).fetchone()

    if not row:
        return jsonify({"ok": False, "error": "Request not found."})
    if row["user_id"] != session["user_id"]:
        return jsonify({"ok": False, "error": "You can only delete your own requests."})

    db.execute("DELETE FROM trade_requests WHERE id=?", (req_id,))
    db.commit()
    return jsonify({"ok": True})


@app.route("/api/contact", methods=["POST"])
def send_contact():
    """Send a contact message to a buyer."""
    data           = request.get_json() or {}
    request_id     = data.get("request_id")
    sender_name    = data.get("sender_name", "").strip()
    sender_email   = data.get("sender_email", "").strip()
    sender_company = data.get("sender_company", "").strip()
    message        = data.get("message", "").strip()

    if not all([request_id, sender_name, sender_email, sender_company, message]):
        return jsonify({"ok": False, "error": "All fields are required."})

    db = get_db()
    # Check request exists
    row = db.execute("SELECT * FROM trade_requests WHERE id=?", (request_id,)).fetchone()
    if not row:
        return jsonify({"ok": False, "error": "Trade request not found."})

    db.execute("""
        INSERT INTO contact_messages
          (request_id, sender_name, sender_email, sender_company, message)
        VALUES (?,?,?,?,?)
    """, (request_id, sender_name, sender_email, sender_company, message))
    db.commit()

    # Get buyer info for confirmation
    buyer = db.execute("SELECT * FROM users WHERE id=?", (row["user_id"],)).fetchone()
    return jsonify({
        "ok": True,
        "message": f"Message sent! The buyer ({buyer['name']} at {buyer['company']}) will be notified."
    })


@app.route("/api/my-requests")
def my_requests():
    """Return all requests posted by the logged-in user."""
    if "user_id" not in session:
        return jsonify([])
    db   = get_db()
    rows = db.execute(
        "SELECT * FROM trade_requests WHERE user_id=? ORDER BY created_at DESC",
        (session["user_id"],)
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/api/my-messages/<int:req_id>")
def my_messages(req_id):
    """Return all contact messages received for a specific request."""
    if "user_id" not in session:
        return jsonify([])
    db  = get_db()
    row = db.execute("SELECT * FROM trade_requests WHERE id=?", (req_id,)).fetchone()
    if not row or row["user_id"] != session["user_id"]:
        return jsonify([])
    msgs = db.execute(
        "SELECT * FROM contact_messages WHERE request_id=? ORDER BY created_at DESC",
        (req_id,)
    ).fetchall()
    return jsonify([dict(m) for m in msgs])


# ------------------------------------------------------------------
#  Routes — AI + World Data
# ------------------------------------------------------------------
@app.route("/api/validate-key", methods=["POST"])
def validate_key():
    data     = request.get_json() or {}
    key      = data.get("api_key", "").strip()
    provider = data.get("provider", "claude").strip()
    if not key:
        return jsonify({"ok": False, "error": "Please enter an API key."})
    try:
        call_ai(key, "Say OK", provider=provider, max_tokens=10)
        session["api_key"]  = key
        session["provider"] = provider
        return jsonify({"ok": True, "provider": provider})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})


@app.route("/api/world-data")
def world_data():
    return jsonify({"countries": WORLD_COUNTRIES, "products": PRODUCTS})


@app.route("/api/real-data/<country_code>")
def real_data(country_code):
    gdp        = fetch_world_bank(country_code, "NY.GDP.MKTP.CD")
    exports    = fetch_world_bank(country_code, "NE.EXP.GNFS.ZS")
    imports    = fetch_world_bank(country_code, "NE.IMP.GNFS.ZS")
    population = fetch_world_bank(country_code, "SP.POP.TOTL")
    return jsonify({
        "country":     country_code,
        "gdp_usd":     round(gdp / 1e9, 1)        if gdp        else None,
        "exports_pct": round(exports, 1)            if exports    else None,
        "imports_pct": round(imports, 1)            if imports    else None,
        "population":  round(population / 1e6, 1)  if population else None,
    })


@app.route("/api/generate-news", methods=["POST"])
def generate_news():
    api_key  = session.get("api_key", "")
    provider = session.get("provider", "claude")
    if not api_key:
        return jsonify({"error": "No API key. Please validate your key first."}), 401
    data     = request.get_json() or {}
    industry = data.get("industry", "")
    country  = data.get("country", "")
    partners = data.get("partners", [])
    if not all([industry, country, partners]):
        return jsonify({"error": "Missing fields."}), 400
    prompt = f"""Generate 8 realistic trade news items AND 3 recommendations
for a {industry} business in {country} trading with: {", ".join(partners)}.
Return ONLY valid JSON:
{{"news":[{{"id":1,"headline":"...","source":"Reuters|Bloomberg|FT","date":"Apr 2026",
"category":"Tariffs|Sanctions|Agreements|Quotas|Regulations|Logistics",
"relevanceScore":85,"impact":"high|medium|low","sentiment":"positive|negative|neutral",
"region":"EU|Asia-Pacific|North America|South Asia|Global","summary":"2 sentences."}}],
"recommendations":[{{"title":"Short title","detail":"One action sentence."}}]}}"""
    try:
        text   = call_ai(api_key, prompt, provider=provider, max_tokens=2500)
        start  = text.index("{"); end = text.rindex("}") + 1
        return jsonify(json.loads(text[start:end]))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/ask", methods=["POST"])
def ask():
    api_key  = session.get("api_key", "")
    provider = session.get("provider", "claude")
    if not api_key:
        return jsonify({"error": "No API key."}), 401
    data     = request.get_json() or {}
    question = data.get("question", "")
    news     = data.get("news", [])
    industry = data.get("industry", "")
    country  = data.get("country", "")
    partners = data.get("partners", [])
    headlines = "\n".join(
        f"[{n.get('impact')}|{n.get('sentiment')}] {n.get('headline')}: {n.get('summary')}"
        for n in news
    )
    prompt = f"""Trade intelligence assistant for {industry} in {country}.
Alerts:\n{headlines}\nQuestion: {question}\nAnswer in 2-4 sentences."""
    try:
        return jsonify({"answer": call_ai(api_key, prompt, provider=provider, max_tokens=400)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/email-digest", methods=["POST"])
def email_digest():
    api_key  = session.get("api_key", "")
    provider = session.get("provider", "claude")
    if not api_key:
        return jsonify({"error": "No API key."}), 401
    data     = request.get_json() or {}
    industry = data.get("industry", "")
    country  = data.get("country", "")
    news     = data.get("news", [])
    headlines = "\n".join(f"- [{n.get('impact')}] {n.get('headline')}" for n in news)
    prompt = f"""Write a professional weekly trade email digest for {industry} in {country}:
{headlines}\nInclude subject line, intro, bullet summary, action recommendation. Under 300 words."""
    try:
        return jsonify({"digest": call_ai(api_key, prompt, provider=provider, max_tokens=600)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/providers")
def get_providers():
    return jsonify(PROVIDERS)


# ------------------------------------------------------------------
#  Run
# ------------------------------------------------------------------
if __name__ == "__main__":
    print("\n  TradeWatch — AI Trade Intelligence + Live Marketplace")
    print("  Supports: Claude · GPT-4o · Gemini · Llama 3")
    print("  Database: tradewatch.db (SQLite)")
    print("  Open: http://localhost:5000\n")
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)
    