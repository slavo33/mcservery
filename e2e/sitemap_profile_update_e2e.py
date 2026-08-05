"""
End-to-end test: sitemap sa aktualizuje po vytvorení a editácii profilu servera.

Scenár (bez akéhokoľvek ručného zásahu / regenerácie):
 1. Načíta živú sitemapu (edge funkcia `sitemap`) ako východiskový stav.
 2. Cez UI vytvorí nový server -> overí, že sa v sitemape objaví správne <loc>
    (https://mcservery.one/server/<slug>) a platný <lastmod>.
 3. Cez UI upraví profil -> overí, že <lastmod> danej URL sa posunul dopredu
    a <loc> ostáva správne (zhoda so slugom v databáze).
 4. Overí formát <lastmod> (ISO 8601 UTC) a absenciu duplicitných <loc>.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/sitemap_profile_update_e2e.py
"""
import asyncio, json, os, re, sys, time, urllib.request
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET
from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SITE = "https://mcservery.one"
ROOT = Path(__file__).resolve().parent.parent
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

STAMP = str(int(time.time()))
SERVER_NAME = f"E2E Sitemap {STAMP}"
SERVER_IP = f"sitemap{STAMP}.example.com"
VERSION = "1.20.4"

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def env(key):
    if os.environ.get(key):
        return os.environ[key]
    envfile = ROOT / ".env"
    if envfile.exists():
        for line in envfile.read_text().splitlines():
            if line.startswith(key + "="):
                return line[len(key) + 1:].strip().strip('"')
    return None


SUPA_URL = env("VITE_SUPABASE_URL")
SUPA_KEY = env("VITE_SUPABASE_PUBLISHABLE_KEY")
LIVE_SITEMAP = f"{SUPA_URL}/functions/v1/sitemap"


def get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8")


def fetch_sitemap():
    """Vráti (mapa loc->lastmod, zoznam všetkých loc vrátane duplicít)."""
    root = ET.fromstring(get(LIVE_SITEMAP))
    locs, mapping = [], {}
    for u in root.findall("sm:url", NS):
        loc = u.findtext("sm:loc", default="", namespaces=NS)
        locs.append(loc)
        mapping[loc] = u.findtext("sm:lastmod", default=None, namespaces=NS)
    return mapping, locs


def parse_ts(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None


def db_server():
    headers = {"apikey": SUPA_KEY, "Authorization": f"Bearer {SUPA_KEY}"}
    rows = json.loads(get(
        f"{SUPA_URL}/rest/v1/servers?select=slug,updated_at&ip=eq.{SERVER_IP}", headers))
    return rows[0] if rows else None


def wait_for(predicate, attempts=12, delay=5):
    """Opakovane načítava sitemapu, kým predikát nevráti pravdu."""
    last = None
    for _ in range(attempts):
        mapping, locs = fetch_sitemap()
        last = (mapping, locs)
        if predicate(mapping):
            return mapping, locs, True
        time.sleep(delay)
    return last[0], last[1], False


async def restore_session(context, page):
    cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")
    if cookies_json:
        cookies = json.loads(cookies_json)
        for c in cookies:
            c["url"] = BASE
        await context.add_cookies(cookies)
    await page.goto(BASE, wait_until="domcontentloaded")
    key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    sess = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    if key and sess:
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(key)}, {json.dumps(sess)})"
        )


async def main():
    if not SUPA_URL or not SUPA_KEY:
        print("FAIL chýba konfigurácia backendu (VITE_SUPABASE_URL / _PUBLISHABLE_KEY)")
        sys.exit(1)

    before, _ = fetch_sitemap()
    check("živá sitemapa je dostupná pred testom", len(before) > 0, len(before))

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        await restore_session(context, page)

        # ---- 1) Vytvorenie profilu cez UI ----
        await page.goto(f"{BASE}/add-server", wait_until="domcontentloaded")
        text_inputs = page.locator("form input[type=text]")
        await text_inputs.nth(0).fill(SERVER_NAME)
        await text_inputs.nth(1).fill(SERVER_IP)
        await page.locator("form textarea").first.fill(
            "E2E test aktualizácie sitemapy po vytvorení a editácii profilu."
        )
        await page.locator("form select").first.select_option(VERSION)
        await page.get_by_role("button", name="Java").first.click()
        await page.locator("form button[type=submit]").first.click()
        await page.wait_for_url(lambda u: "/add-server" not in u, timeout=20000)
        check("server bol vytvorený cez UI", "/add-server" not in page.url, page.url)

        row = db_server()
        check("server má vygenerovaný slug", bool(row and row.get("slug")), row)
        if not row:
            await browser.close()
            sys.exit(1)
        loc = f"{SITE}/server/{row['slug']}"
        created_at_db = parse_ts(row["updated_at"])

        # ---- 2) Sitemap musí novú URL obsahovať bez ručného zásahu ----
        after_create, locs, appeared = wait_for(lambda m: loc in m)
        check("nový profil pribudol do sitemapy automaticky", appeared, loc)
        check("loc zodpovedá slugu z databázy", loc in after_create, loc)
        lm_create = after_create.get(loc)
        check("nová URL má vyplnený lastmod", bool(lm_create), lm_create)
        check("lastmod je v ISO 8601 UTC",
              bool(lm_create) and re.match(
                  r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\+00:00|Z)$", lm_create),
              lm_create)
        if created_at_db and parse_ts(lm_create):
            delta = abs((parse_ts(lm_create) - created_at_db).total_seconds())
            check("lastmod zodpovedá updated_at v databáze", delta < 2, delta)
        check("sitemapa neobsahuje duplicitné loc", len(locs) == len(set(locs)),
              len(locs) - len(set(locs)))

        # ---- 3) Editácia profilu ----
        time.sleep(2)  # aby bol rozdiel v čase merateľný
        await page.goto(f"{BASE}/edit-server/{row['slug']}", wait_until="domcontentloaded")
        await page.wait_for_timeout(2500)
        await page.locator("form textarea").first.fill(
            f"Upravený popis {STAMP} – overenie lastmod v sitemape."
        )
        await page.locator("form button[type=submit]").first.click()
        await page.wait_for_timeout(3000)
        await page.screenshot(path=str(SHOTS / "sitemap_after_edit_form.png"))
        await browser.close()

    row2 = db_server()
    check("editácia zmenila updated_at v databáze",
          bool(row2) and row2["updated_at"] != row["updated_at"],
          row2 and row2["updated_at"])
    check("slug (a teda loc) sa editáciou nezmenil", bool(row2) and row2["slug"] == row["slug"])

    after_edit, locs2, changed = wait_for(lambda m: m.get(loc) != lm_create)
    check("lastmod sa po editácii aktualizoval bez ručného zásahu", changed,
          f"{lm_create} -> {after_edit.get(loc)}")
    lm_edit, lm_before = parse_ts(after_edit.get(loc)), parse_ts(lm_create)
    check("nový lastmod je novší ako pôvodný",
          bool(lm_edit and lm_before) and lm_edit > lm_before,
          f"{lm_before} -> {lm_edit}")
    check("loc ostáva správne po editácii", loc in after_edit, loc)
    check("sitemapa po editácii nemá duplicitné loc", len(locs2) == len(set(locs2)))

    print("\nLOC:", loc)
    print("IP:", SERVER_IP, "– testovací server odstráňte z databázy")

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} krokov OK")
    sys.exit(1 if failed else 0)


asyncio.run(main())
