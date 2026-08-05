import asyncio
import re
import sys
import urllib.request
from xml.etree import ElementTree as ET

from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SITE_URL = "https://mcservery.one"
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def sitemap_paths():
    """Vráti všetky cesty zo sitemap.xml (rieši aj režim sitemap indexu)."""
    def get(path):
        with urllib.request.urlopen(f"{BASE}{path}", timeout=30) as r:
            return r.read().decode("utf-8")

    xml = get("/sitemap.xml")
    root = ET.fromstring(xml)
    if root.tag.endswith("sitemapindex"):
        locs = []
        for s in root.findall("sm:sitemap", NS):
            chunk = (s.findtext("sm:loc", default="", namespaces=NS) or "").replace(SITE_URL, "")
            sub = ET.fromstring(get(chunk))
            locs += [(u.findtext("sm:loc", default="", namespaces=NS) or "")
                     for u in sub.findall("sm:url", NS)]
    else:
        locs = [(u.findtext("sm:loc", default="", namespaces=NS) or "")
                for u in root.findall("sm:url", NS)]
    return [l.replace(SITE_URL, "") or "/" for l in locs if l]


async def main():
    paths = sitemap_paths()
    check("sitemap.xml obsahuje URL", len(paths) > 0, len(paths))

    bad_status, noindex, soft404, bad_canonical = [], [], [], []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await (await browser.new_context(viewport={"width": 1280, "height": 1800})).new_page()

        for path in paths:
            resp = await page.goto(f"{BASE}{path}", wait_until="networkidle")
            await page.wait_for_timeout(400)
            info = await page.evaluate(
                """() => ({
                  robots: [...document.querySelectorAll('meta[name=robots]')].map(e => e.content).join(','),
                  canonical: [...document.querySelectorAll('link[rel=canonical]')].map(e => e.href).join(','),
                  title: document.title,
                })"""
            )
            status = resp.status if resp else 0
            if status != 200:
                bad_status.append((path, status))
            if "noindex" in info["robots"].lower():
                noindex.append((path, info["robots"]))
            if re.search(r"nenájden|not found|404", info["title"], re.I):
                soft404.append((path, info["title"]))
            if info["canonical"] != f"{SITE_URL}{path}" and info["canonical"] != f"{SITE_URL}{path}".rstrip("/") + "/":
                bad_canonical.append((path, info["canonical"]))
            print(f"  {status} {path} | {info['title'][:45]}")

        await browser.close()

    check("žiadna URL nevracia 404/500 (všetky HTTP 200)", not bad_status, bad_status[:5])
    check("žiadna URL nemá meta robots noindex", not noindex, noindex[:5])
    check("žiadna URL nie je soft-404", not soft404, soft404[:5])
    check("canonical každej URL ukazuje sám na seba", not bad_canonical, bad_canonical[:5])

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} kontrol OK ({len(paths)} URL)")
    sys.exit(1 if failed else 0)


asyncio.run(main())
