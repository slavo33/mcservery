"""
E2E test: POKRYTIE sitemapy.

Na rozdiel od `sitemap_indexability_e2e.py` (sitemap -> stránky) ide tento test
opačným smerom (stránky -> sitemap) a overuje, že sitemap.xml naozaj obsahuje
VŠETKY indexovateľné URL webu:

 1. každá verejná statická route z `src/App.tsx` je v sitemape,
 2. každý server so `slug` z databázy má v sitemape `/server/<slug>`,
 3. každý aktívny nábor (`staff_posts.is_active = true`) má `/staff/<slug>`,
 4. neindexovateľné route (`/auth`, `/admin`, `/profile`, `/console`,
    `/vip-success`, `*/edit`, `/user/:id`) v sitemape NIE sú,
 5. vzorka URL zo sitemapy nemá `noindex` a má self-referencing canonical,
 6. v sitemape nie sú duplicity ani relatívne URL.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/sitemap_coverage_e2e.py
"""
import asyncio
import json
import os
import re
import sys
import urllib.request
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree as ET

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
SITE_URL = "https://mcservery.one"
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
MAX_SAMPLE = int(os.environ.get("E2E_MAX_URLS", "10"))
ROOT = Path(__file__).resolve().parents[1]

# Route, ktoré do sitemapy nepatria (súkromné, prihlásenie, editácia, redirecty).
NON_INDEXABLE = {"/auth", "/admin", "/profile", "/console", "/vip-success"}

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def fetch(path):
    with urllib.request.urlopen(f"{BASE}{path}", timeout=30) as r:
        return r.read().decode("utf-8")


def sitemap_locs():
    """Všetky <loc> zo sitemap.xml (rieši aj režim sitemap indexu)."""
    root = ET.fromstring(fetch("/sitemap.xml"))
    if root.tag.endswith("sitemapindex"):
        locs = []
        for sm in root.findall("sm:sitemap/sm:loc", NS):
            child_path = urlparse(sm.text.strip()).path
            child = ET.fromstring(fetch(child_path))
            locs += [u.text.strip() for u in child.findall("sm:url/sm:loc", NS)]
        return locs
    return [u.text.strip() for u in root.findall("sm:url/sm:loc", NS)]


def app_routes():
    """Statické route deklarované v src/App.tsx (bez parametrov a wildcardu)."""
    src = (ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
    paths = re.findall(r'<Route\s+path="([^"]+)"', src)
    return [p for p in paths if ":" not in p and p != "*"]


def read_env(key):
    if os.environ.get(key):
        return os.environ[key]
    env_file = ROOT / ".env"
    if not env_file.exists():
        return None
    for line in env_file.read_text(encoding="utf-8").splitlines():
        if line.startswith(f"{key}="):
            return line[len(key) + 1 :].strip().strip('"')
    return None


def db_slugs(table, query):
    url = read_env("VITE_SUPABASE_URL")
    key = read_env("VITE_SUPABASE_PUBLISHABLE_KEY")
    if not url or not key:
        return None
    req = urllib.request.Request(
        f"{url}/rest/v1/{table}?{query}",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            rows = json.loads(r.read().decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        print(f"WARN: {table} sa nepodarilo načítať: {exc}")
        return None
    return [row["slug"] for row in rows if row.get("slug")]


async def main():
    locs = sitemap_locs()
    paths = [urlparse(u).path.rstrip("/") or "/" for u in locs]
    pathset = set(paths)

    check("sitemap obsahuje aspoň 1 URL", len(locs) > 0, f"{len(locs)} URL")
    check("žiadne duplicitné URL", len(paths) == len(pathset), f"{len(paths)} vs {len(pathset)}")
    check(
        "všetky <loc> sú absolútne na produkčnú doménu",
        all(u.startswith(f"{SITE_URL}/") or u == SITE_URL for u in locs),
        [u for u in locs if not u.startswith(SITE_URL)][:3],
    )

    # 1) statické verejné route
    for route in app_routes():
        if route in NON_INDEXABLE:
            check(f"neindexovateľná route {route} NIE je v sitemape", route not in pathset)
        else:
            key = route.rstrip("/") or "/"
            check(f"statická route {route} je v sitemape", key in pathset)

    # 2) + 3) dynamické profily z databázy
    servers = db_slugs("servers", "select=slug&slug=not.is.null&limit=45000")
    if servers is None:
        print("WARN: preskakujem pokrytie serverov (chýba prístup k DB)")
    else:
        missing = [s for s in servers if f"/server/{s}" not in pathset]
        check(
            f"všetkých {len(servers)} serverov je v sitemape",
            not missing,
            missing[:5],
        )

    staff = db_slugs("staff_posts", "select=slug&is_active=eq.true&slug=not.is.null&limit=45000")
    if staff is None:
        print("WARN: preskakujem pokrytie náborov (chýba prístup k DB)")
    else:
        missing = [s for s in staff if f"/staff/{s}" not in pathset]
        check(
            f"všetkých {len(staff)} aktívnych náborov je v sitemape",
            not missing,
            missing[:5],
        )

    # 4) editačné a používateľské cesty nesmú byť v sitemape
    check(
        "žiadne /edit URL v sitemape",
        not [p for p in paths if p.endswith("/edit")],
        [p for p in paths if p.endswith("/edit")][:3],
    )
    check(
        "žiadne /user/ URL v sitemape",
        not [p for p in paths if p.startswith("/user/")],
        [p for p in paths if p.startswith("/user/")][:3],
    )

    # 5) vzorka URL: canonical + robots meta
    sample = paths[:MAX_SAMPLE]
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        for path in sample:
            await page.goto(f"{BASE}{path}", wait_until="networkidle")
            canonicals = await page.eval_on_selector_all(
                'link[rel="canonical"]', "els => els.map(e => e.href)"
            )
            robots = await page.eval_on_selector_all(
                'meta[name="robots"], meta[name="googlebot"]',
                "els => els.map(e => (e.content || '').toLowerCase())",
            )
            check(f"{path}: práve jeden canonical", len(canonicals) == 1, canonicals)
            if canonicals:
                cpath = urlparse(canonicals[0]).path.rstrip("/") or "/"
                check(
                    f"{path}: canonical je self-referencing na {SITE_URL}",
                    canonicals[0].startswith(SITE_URL) and cpath == path,
                    canonicals[0],
                )
            check(
                f"{path}: robots meta bez noindex",
                not any("noindex" in r or "none" in r for r in robots),
                robots,
            )
        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} kontrol OK")
    if failed:
        for label, _, extra in failed:
            print(f"  FAIL: {label} :: {extra}")
        sys.exit(1)


asyncio.run(main())
