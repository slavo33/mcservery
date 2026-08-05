"""
E2E test: detekcia soft-404 stránok.

HTTP status 200 sa NEberie ako automatický úspech. Test porovnáva skutočný
obsah stránky (heading, dĺžka textu, marker „nenájdené“, robots meta) s
očakávanou šablónou pre daný typ URL:

 A. Reálne (indexovateľné) URL zo sitemapy musia vyzerať ako plnohodnotná
    stránka: majú `h1`, dostatok textu, unikátny `<title>`, NEobsahujú
    „not found“ markery a NIE sú `noindex`.
 B. Neexistujúce URL (`/server/<náhodný>`, `/staff/<náhodný>`, `/user/<uuid>`,
    `/uplne-neexistujuca-cesta`) musia byť skutočné 404 – zobrazia „not found“
    šablónu a majú `noindex`. Ak vrátia 200 s obsahom bežnej stránky
    (bez markera alebo bez `noindex`), ide o **soft-404** a test padá.
 C. Neexistujúca URL sa nesmie potichu presmerovať na domovskú stránku
    a nesmie mať rovnaký obsah ako reálna stránka.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/soft_404_e2e.py
    E2E_BASE_URL=https://mcservery.one python3 e2e/soft_404_e2e.py
"""
import asyncio
import os
import sys
import urllib.error
import urllib.request
import uuid
from urllib.parse import urlparse
from xml.etree import ElementTree as ET

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
MAX_URLS = int(os.environ.get("E2E_MAX_URLS", "8"))
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")

# Markery „stránka neexistuje“ vo všetkých jazykoch, ktoré aplikácia používa.
NOT_FOUND_MARKERS = [
    "404", "page not found", "nenájden", "nenajden", "nenašiel", "nenasiel",
    "neexistuje", "not found", "nicht gefunden", "introuvable", "nie znaleziono",
    "не найден", "no encontrad", "não encontrad",
]

MIN_TEXT_LEN = 200  # plnohodnotná stránka má aspoň toľko znakov textu

BOGUS_PATHS = [
    f"/server/neexistujuci-server-{uuid.uuid4().hex[:10]}",
    f"/staff/neexistujuci-inzerat-{uuid.uuid4().hex[:10]}",
    f"/user/{uuid.uuid4()}",
    f"/uplne-neexistujuca-cesta-{uuid.uuid4().hex[:8]}",
]

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception:
        return 0, ""


def norm(path):
    path = (path or "/").split("?")[0].split("#")[0]
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]
    return path or "/"


def sitemap_paths():
    paths = []
    status, body = fetch(BASE + "/sitemap.xml")
    if status != 200 or not body.strip():
        return paths
    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        return paths
    if root.tag.endswith("sitemapindex"):
        for sm in root.findall("sm:sitemap/sm:loc", NS):
            s, b = fetch(sm.text.strip())
            if s != 200 or not b.strip():
                continue
            try:
                sub = ET.fromstring(b)
            except ET.ParseError:
                continue
            for loc in sub.findall("sm:url/sm:loc", NS):
                paths.append(norm(urlparse(loc.text.strip()).path))
    else:
        for loc in root.findall("sm:url/sm:loc", NS):
            paths.append(norm(urlparse(loc.text.strip()).path))
    return paths


async def snapshot(page, path):
    """Otvorí stránku a odoberie „odtlačok“ obsahu pre porovnanie so šablónou."""
    await page.goto(BASE + path, wait_until="networkidle")
    await page.wait_for_timeout(400)
    return await page.evaluate(
        """() => {
            const main = document.querySelector('main') || document.body;
            const text = (main.innerText || '').trim();
            const h1 = Array.from(document.querySelectorAll('h1')).map(h => (h.innerText || '').trim());
            const robots = Array.from(document.querySelectorAll('meta[name="robots"]'))
                .map(m => (m.getAttribute('content') || '').toLowerCase()).join(' ');
            return {
                text,
                textLen: text.length,
                lower: text.toLowerCase(),
                h1,
                robots,
                title: document.title,
                path: location.pathname,
            };
        }"""
    )


def has_marker(snap):
    hay = (snap["lower"] + " " + snap["title"].lower())
    return any(m in hay for m in NOT_FOUND_MARKERS)


async def main():
    real_paths = [p for p in sitemap_paths()]
    check("sitemap.xml poskytla reálne URL", len(real_paths) > 0, f"{len(real_paths)} URL")
    real_paths = real_paths[:MAX_URLS]

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800}, user_agent=UA)
        page = await ctx.new_page()

        # A) Reálne stránky musia zodpovedať „plnohodnotnej“ šablóne.
        home = await snapshot(page, "/")
        for path in real_paths:
            status, _ = fetch(BASE + path)
            snap = await snapshot(page, path)
            label = f"[{path}]"
            check(f"{label} HTTP 200", status == 200, status)
            check(f"{label} má h1 heading", len(snap["h1"]) > 0 and any(snap["h1"]), snap["h1"])
            check(f"{label} má dostatok obsahu (> {MIN_TEXT_LEN} znakov)",
                  snap["textLen"] > MIN_TEXT_LEN, snap["textLen"])
            check(f"{label} neobsahuje 404 marker (nie je soft-404)",
                  not has_marker(snap), snap["title"])
            check(f"{label} nie je noindex", "noindex" not in snap["robots"], snap["robots"])
            if path != "/":
                check(f"{label} nie je kópia domovskej stránky", snap["text"] != home["text"])

        # B) Neexistujúce URL musia byť skutočné 404, nie soft-404.
        for path in BOGUS_PATHS:
            status, _ = fetch(BASE + path)
            snap = await snapshot(page, path)
            label = f"[bogus {path}]"
            check(f"{label} nie je 5xx", status == 0 or status < 500, status)
            check(f"{label} zobrazuje 'not found' šablónu (nie bežný obsah)",
                  has_marker(snap), f"title={snap['title']!r} text={snap['text'][:80]!r}")
            check(f"{label} je označená ako noindex",
                  "noindex" in snap["robots"], snap["robots"])
            check(f"{label} sa nepresmerovala na domovskú stránku",
                  norm(snap["path"]) != "/", snap["path"])
            check(f"{label} nemá obsah plnohodnotnej stránky",
                  snap["textLen"] < MIN_TEXT_LEN * 4, snap["textLen"])
            check(f"{label} nie je identická s domovskou stránkou", snap["text"] != home["text"])

        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} OK")
    if failed:
        for label, _, extra in failed:
            print("FAILED:", label, extra)
        sys.exit(1)


asyncio.run(main())
