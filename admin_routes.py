# ================================================================
#  TradeWatch — Admin Dashboard Routes
#  Add these routes to your app.py
#  Access at: http://localhost:5000/admin
#  Password protected — only YOU can see it
# ================================================================

# ------------------------------------------------------------------
#  STEP 1 — Add this near the top of app.py with other constants
# ------------------------------------------------------------------

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

# ------------------------------------------------------------------
#  STEP 2 — Add these routes to app.py (before the if __name__ block)
# ------------------------------------------------------------------

@app.route("/admin")
def admin_dashboard():
    """Admin dashboard — password protected."""
    if not session.get("admin_logged_in"):
        return render_template("admin_login.html")
    
    db = get_db()
    
    # ── Key stats ──────────────────────────────────────────────
    total_users    = db.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    total_requests = db.execute("SELECT COUNT(*) FROM trade_requests").fetchone()[0]
    total_messages = db.execute("SELECT COUNT(*) FROM contact_messages").fetchone()[0]
    open_requests  = db.execute("SELECT COUNT(*) FROM trade_requests WHERE status='open'").fetchone()[0]

    # ── New today ──────────────────────────────────────────────
    today = datetime.now().strftime("%Y-%m-%d")
    new_users_today    = db.execute("SELECT COUNT(*) FROM users WHERE created_at LIKE ?", (today + "%",)).fetchone()[0]
    new_requests_today = db.execute("SELECT COUNT(*) FROM trade_requests WHERE created_at LIKE ?", (today + "%",)).fetchone()[0]
    new_messages_today = db.execute("SELECT COUNT(*) FROM contact_messages WHERE created_at LIKE ?", (today + "%",)).fetchone()[0]

    # ── Recent users ───────────────────────────────────────────
    recent_users = db.execute("""
        SELECT name, company, country, email, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 10
    """).fetchall()

    # ── Recent requests ────────────────────────────────────────
    recent_requests = db.execute("""
        SELECT tr.product_label, tr.quantity, tr.budget, tr.currency,
               tr.country_from, tr.timeline, tr.created_at,
               u.name as buyer_name, u.company as buyer_company
        FROM trade_requests tr
        JOIN users u ON tr.user_id = u.id
        ORDER BY tr.created_at DESC
        LIMIT 10
    """).fetchall()

    # ── Top countries ──────────────────────────────────────────
    top_countries = db.execute("""
        SELECT country_from, COUNT(*) as count
        FROM trade_requests
        GROUP BY country_from
        ORDER BY count DESC
        LIMIT 5
    """).fetchall()

    # ── Top products ───────────────────────────────────────────
    top_products = db.execute("""
        SELECT product_label, COUNT(*) as count
        FROM trade_requests
        GROUP BY product_label
        ORDER BY count DESC
        LIMIT 5
    """).fetchall()

    # ── Recent messages ────────────────────────────────────────
    recent_messages = db.execute("""
        SELECT cm.sender_name, cm.sender_company, cm.sender_email,
               cm.message, cm.created_at,
               tr.product_label, u.name as buyer_name
        FROM contact_messages cm
        JOIN trade_requests tr ON cm.request_id = tr.id
        JOIN users u ON tr.user_id = u.id
        ORDER BY cm.created_at DESC
        LIMIT 10
    """).fetchall()

    return render_template("admin.html",
        total_users=total_users,
        total_requests=total_requests,
        total_messages=total_messages,
        open_requests=open_requests,
        new_users_today=new_users_today,
        new_requests_today=new_requests_today,
        new_messages_today=new_messages_today,
        recent_users=[dict(r) for r in recent_users],
        recent_requests=[dict(r) for r in recent_requests],
        top_countries=[dict(r) for r in top_countries],
        top_products=[dict(r) for r in top_products],
        recent_messages=[dict(r) for r in recent_messages],
    )


@app.route("/admin/login", methods=["POST"])
def admin_login():
    """Admin login."""
    password = request.form.get("password", "")
    if ADMIN_PASSWORD and password == ADMIN_PASSWORD:
        session["admin_logged_in"] = True
        return redirect("/admin")
    return render_template("admin_login.html", error="Wrong password!")


@app.route("/admin/logout")
def admin_logout():
    """Admin logout."""
    session.pop("admin_logged_in", None)
    return redirect("/")