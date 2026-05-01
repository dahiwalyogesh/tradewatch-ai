"""
TradeWatch — seed_data.py
Run this ONCE to add demo trade requests so the marketplace
looks active when people visit.

Run:
    python seed_data.py
"""

import sqlite3
from werkzeug.security import generate_password_hash

DB = "tradewatch.db"

# Demo buyers from around the world
DEMO_USERS = [
    ("Rajesh Kumar",    "Tata Electronics",        "India",         "rajesh@tata-demo.com",     "demo1234"),
    ("Li Wei",          "Shenzhen Tech Co.",        "China",         "liwei@sztech-demo.com",    "demo1234"),
    ("Maria Schmidt",   "BMW Procurement GmbH",     "Germany",       "maria@bmw-demo.com",       "demo1234"),
    ("James Okafor",    "Lagos Trade Partners",     "Nigeria",       "james@lagos-demo.com",     "demo1234"),
    ("Sarah Thompson",  "GreenEnergy UK Ltd",       "United Kingdom","sarah@greenenergy-demo.com","demo1234"),
    ("Ahmed Al-Rashid", "Dubai Global Trading",     "UAE",           "ahmed@dubai-demo.com",     "demo1234"),
    ("Yuki Tanaka",     "Tanaka Manufacturing",     "Japan",         "yuki@tanaka-demo.com",     "demo1234"),
    ("Sofia Martins",   "Solar Solutions Brazil",   "Brazil",        "sofia@solar-demo.com",     "demo1234"),
]

# Demo trade requests
DEMO_REQUESTS = [
    # user_index, product_key, product_label, quantity, budget, currency, description, country_from, timeline
    (0, "Semi",     "Semiconductors",   "50,000 units",   "2,400,000",  "USD", "We require high-purity silicon wafers (99.9%+) for our solar panel manufacturing plant in Gujarat. ISO 9001 certification required. Prefer suppliers with minimum 3 years export experience. Open to long-term supply contract.", "India",         "3-6 months"),
    (1, "Display",  "Display Panels",   "20,000 units",   "1,800,000",  "USD", "Sourcing 4K OLED display panels (55 inch) for our smart TV production line. Must meet EU RoHS standards. Monthly delivery schedule preferred. Quality inspection at origin required before shipment.", "China",         "1-3 months"),
    (2, "EV",       "EV Batteries",     "10,000 units",   "8,000,000",  "EUR", "BMW Group requires lithium-ion battery packs (100kWh) for our new electric vehicle assembly line in Munich. Suppliers must be IATF 16949 certified. Strict delivery schedule — delays not acceptable.", "Germany",       "6-12 months"),
    (3, "Solar",    "Solar Cells",      "500,000 units",  "750,000",    "USD", "Importing mono-PERC solar cells (400W+) for large-scale solar farm project in Lagos. Nigerian import regulations compliance required. Competitive pricing essential — we have 3 other quotes. CIF Lagos terms.", "Nigeria",       "Immediate"),
    (4, "Pharma",   "Pharmaceuticals",  "100,000 units",  "500,000",    "GBP", "Seeking paracetamol API (pharmaceutical grade) and ibuprofen for NHS-approved manufacturing. Full GMP certification and CoA required with each batch. Supplier must pass our audit process.", "United Kingdom","3-6 months"),
    (5, "Auto",     "Automotive Parts", "5,000 units",    "900,000",    "USD", "Dubai distributor importing brake systems and suspension components for Japanese and Korean vehicle brands. Must be OEM-quality or OEM-approved. We handle customs clearance. Interested in exclusive supply agreement.", "UAE",           "1-3 months"),
    (6, "PCB",      "PCB Assemblies",   "30,000 units",   "600,000",    "JPY", "Tanaka Manufacturing requires multilayer PCBs (8-layer, FR4) for industrial control systems. IPC Class 3 standard. We provide Gerber files and BOM. Prefer suppliers in Asia-Pacific for shorter lead time.", "Japan",         "Immediate"),
    (7, "LED",      "LED Components",   "200,000 units",  "280,000",    "USD", "Brazilian solar company sourcing high-efficiency LED drivers and modules for street lighting project in São Paulo. Waterproof IP67 rating required. INMETRO certification or equivalent. Price is key factor.", "Brazil",        "1-3 months"),
    (0, "Agri",     "Agriculture",      "500 tonnes",     "350,000",    "USD", "Import of premium basmati rice and organic turmeric for distribution across South Asian grocery chains in the UK and Europe. Phytosanitary certificate required. Packaging must comply with EU food safety regulations.", "India",         "Ongoing supply"),
    (1, "Textiles", "Textiles",         "50,000 metres",  "120,000",    "USD", "Sourcing high-quality cotton fabric (300 thread count) and polyester blends for garment manufacturing. OEKO-TEX Standard 100 certification required. Can provide design specifications. Regular monthly orders if quality meets standards.", "China",         "Ongoing supply"),
    (5, "Semi",     "Semiconductors",   "15,000 chips",   "3,200,000",  "USD", "Dubai tech distributor seeking automotive-grade microcontrollers (ARM Cortex-M7) for resale to regional OEMs. AEC-Q100 certified. Long-term partnership preferred. We have established customs clearance infrastructure.", "UAE",           "3-6 months"),
    (4, "EV",       "EV Batteries",     "2,000 packs",    "1,600,000",  "GBP", "UK startup building home energy storage systems. Need LiFePO4 battery packs (10kWh residential). UN38.3 certification mandatory. Prefer suppliers who can support with technical documentation for UK market approval.", "United Kingdom","6-12 months"),
]

def seed():
    db = sqlite3.connect(DB)
    db.row_factory = sqlite3.Row

    print("🌱 Seeding TradeWatch database...")

    # Insert demo users
    user_ids = []
    for name, company, country, email, password in DEMO_USERS:
        try:
            cur = db.execute(
                "INSERT INTO users (name, company, country, email, password) VALUES (?,?,?,?,?)",
                (name, company, country, email, generate_password_hash(password))
            )
            user_ids.append(cur.lastrowid)
            print(f"  ✅ User: {name} ({company}, {country})")
        except sqlite3.IntegrityError:
            # Already exists — get existing ID
            row = db.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
            user_ids.append(row["id"])
            print(f"  ↩️  User already exists: {name}")

    db.commit()

    # Insert demo trade requests
    for (ui, pk, pl, qty, budget, cur, desc, country, timeline) in DEMO_REQUESTS:
        user_id = user_ids[ui]
        db.execute("""
            INSERT INTO trade_requests
              (user_id, product_key, product_label, quantity, budget,
               currency, description, country_from, timeline)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (user_id, pk, pl, qty, budget, cur, desc, country, timeline))
        print(f"  📦 Request: {pl} from {country} — {qty} @ {budget} {cur}")

    db.commit()
    db.close()

    print("\n✅ Done! Marketplace now has demo data.")
    print("   Open http://localhost:5000/#section-marketplace to see it.")
    print("\n   Demo login (any account):")
    print("   Email: rajesh@tata-demo.com")
    print("   Password: demo1234")

if __name__ == "__main__":
    seed()