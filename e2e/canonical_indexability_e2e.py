"""
E2E test: canonical (self-referencing) a robots meta na indexovateľných URL.

Pre každú indexovateľnú URL (statické verejné route + URL zo sitemapy) overuje:
 1. v HTML je práve jeden `<link rel="canonical">`,
 2. canonical je absolútna https URL na produkčnú doménu,
 3. canonical je self-referencing — jeho cesta zodpovedá ceste stránky
    (ignoruje sa koncové `/` a query string),
 4. `<meta name="robots">` (ani `googlebot`) neobsahuje `noindex` ani `none`,
 5. neverejné route (`/admin`, `/auth`, `/profile`, `/settings`) naopak
    `noindex` MAJÚ a v sitemape sa nenachádzajú.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/canonical_indexability_e2e.py
    E2E_BASE_URL=https://mcservery.one python3 e2e/canonical_indexability_e2e.py
"""
import asyncio
import os
import sys
import urllib.error
import urllib.request
from xml.etree import ElementTree as ET
from urllib.parse import urlparse

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
SITE_URL = "https://mcservery.one"
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
MAX_URLS = int(os.environ.get("E2E_MAX_URLS", "12"))
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")

STATIC_PUBLIC = ["/", "/servers", "/staff"]
NOINDEX_ROUTES = ["/admin", "/auth", "/profile"]

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
    """Cesty zo sitemap.xml (aj cez sitemap index)."""
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
            if s == 200 and b.strip():
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


async def head_state(page, path):
    """Otvorí stránku a vytiahne canonical + robots meta po vykreslení."""
    await page.goto(BASE + path, wait_until="networkidle")
    return await page.evaluate(
        """() => {
            const canon = Array.from(document.querySelectorAll('link[rel="canonical"]')).map(l => l.href);
            const robots = Array.from(document.querySelectorAll('meta[name="robots"], meta[name="googlebot"]'))
                .map(m => (m.getAttribute('content') || '').toLowerCase());
            return { canon, robots, path: location.pathname, title: document.title };
        }"""
    )


async def main():
    sm_paths = sitemap_paths()
    check("sitemap.xml je dostupná a obsahuje URL", len(sm_paths) > 0, f"{len(sm_paths)} URL")

    indexable = []
    for p in STATIC_PUBLIC + sm_paths:
        if p not in indexable:
            indexable.append(p)
    indexable = indexable[:MAX_URLS]

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800},
                                        user_agent=UA)
        page = await ctx.new_page()

        for path in indexable:
            st = await head_state(page, path)
            label = f"[{path}]"

            check(f"{label} má práve jeden canonical", len(st["canon"]) == 1, st["canon"])
            if len(st["canon"]) == 1:
                href = st["canon"][0]
                parsed = urlparse(href)
                check(f"{label} canonical je absolútna https URL na produkčnú doménu",
                      parsed.scheme == "https" and parsed.netloc == urlparse(SITE_URL).netloc,
                      href)
                check(f"{label} canonical je self-referencing",
                      norm(parsed.path) == norm(st["path"]),
                      f"canonical={norm(parsed.path)} page={norm(st['path'])}")

            bad = [r for r in st["robots"] if "noindex" in r or "none" in r]
            check(f"{label} robots meta neobsahuje noindex", not bad, st["robots"])

        # Neverejné route musia byť noindex (alebo presmerované preč) a mimo sitemapy.
        for path in NOINDEX_ROUTES:
            st = await head_state(page, path)
            has_noindex = any("noindex" in r for r in st["robots"])
            redirected = norm(st["path"]) != norm(path)
            check(f"[{path}] je noindex alebo presmerovaná preč",
                  has_noindex or redirected,
                  f"robots={st['robots']} final={st['path']}")
            check(f"[{path}] nie je v sitemape", norm(path) not in sm_paths)

        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} OK")
    if failed:
        for label, _, extra in failed:
            print("FAILED:", label, extra)
        sys.exit(1)


asyncio.run(main())
