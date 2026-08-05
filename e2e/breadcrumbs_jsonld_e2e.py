"""
E2E test: BreadcrumbList JSON-LD ↔ viditeľná drobečková navigácia.

Pre každú verejnú stránku s drobečkami overuje:
 1. na stránke existuje práve jeden viditeľný breadcrumb `<nav data-breadcrumbs>`,
 2. JSON-LD `BreadcrumbList` má rovnaký počet `ListItem` ako viditeľná navigácia,
 3. názvy aj poradie (`position`) presne sedia s viditeľnými textami,
 4. `item` URL v JSON-LD sedí s `href` viditeľného odkazu (rovnaká cesta),
 5. `position` je 1..N bez dier a duplicít,
 6. každý `item` je absolútna URL na produkčnú doménu a vracia HTTP 200
    (žiadne 404 ani presmerovanie na inú cestu),
 7. posledný breadcrumb je aktuálna stránka (self-referencing).

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/breadcrumbs_jsonld_e2e.py
"""
import asyncio
import json
import os
import sys
import urllib.error
import urllib.request
from urllib.parse import urlparse
from xml.etree import ElementTree as ET

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
SITE_URL = "https://mcservery.one"
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

STATIC_PATHS = ["/servers", "/staff", "/vip", "/add-server", "/terms", "/privacy"]

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def fetch_text(path):
    with urllib.request.urlopen(f"{BASE}{path}", timeout=30) as r:
        return r.read().decode("utf-8")


def first_server_path():
    """Prvý profil servera zo sitemapy (na overenie 3-úrovňových drobečkov)."""
    try:
        root = ET.fromstring(fetch_text("/sitemap.xml"))
        locs = []
        if root.tag.endswith("sitemapindex"):
            for sm in root.findall("sm:sitemap/sm:loc", NS):
                child = ET.fromstring(fetch_text(urlparse(sm.text.strip()).path))
                locs += [u.text.strip() for u in child.findall("sm:url/sm:loc", NS)]
        else:
            locs = [u.text.strip() for u in root.findall("sm:url/sm:loc", NS)]
        for loc in locs:
            p = urlparse(loc).path
            if p.startswith("/server/"):
                return p
    except Exception as exc:  # noqa: BLE001
        print(f"WARN: sitemap sa nepodarilo načítať: {exc}")
    return None


def url_status(url):
    """HTTP status pre URL zo sitemapy — testuje sa lokálne (rovnaká cesta)."""
    path = urlparse(url).path or "/"
    req = urllib.request.Request(f"{BASE}{path}", method="GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, urlparse(r.url).path or "/"
    except urllib.error.HTTPError as e:
        return e.code, path
    except Exception as exc:  # noqa: BLE001
        return 0, str(exc)


def extract_breadcrumb_ld(blobs):
    """Nájde BreadcrumbList v zozname JSON-LD blokov (aj vnorený v @graph)."""
    found = []
    for raw in blobs:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        stack = data if isinstance(data, list) else [data]
        while stack:
            node = stack.pop(0)
            if not isinstance(node, dict):
                continue
            if node.get("@graph"):
                stack += list(node["@graph"])
            if node.get("@type") == "BreadcrumbList":
                found.append(node)
    return found


async def audit(page, path):
    await page.goto(f"{BASE}{path}", wait_until="networkidle")

    # viditeľná navigácia
    navs = await page.eval_on_selector_all("nav[data-breadcrumbs]", "els => els.length")
    check(f"{path}: práve jedna viditeľná drobečková navigácia", navs == 1, navs)
    if navs != 1:
        return

    visible = await page.eval_on_selector_all(
        "nav[data-breadcrumbs] [data-breadcrumb-item]",
        """els => els.map(e => ({
              name: (e.textContent || '').trim(),
              path: e.getAttribute('data-breadcrumb-path'),
              href: e.tagName === 'A' ? new URL(e.getAttribute('href'), location.origin).pathname : null,
           }))""",
    )
    blobs = await page.eval_on_selector_all(
        'script[type="application/ld+json"]', "els => els.map(e => e.textContent)"
    )
    lds = extract_breadcrumb_ld(blobs)
    check(f"{path}: práve jeden BreadcrumbList JSON-LD", len(lds) == 1, len(lds))
    if len(lds) != 1:
        return

    items = lds[0].get("itemListElement", [])
    check(
        f"{path}: počet ListItem = počet viditeľných drobečkov",
        len(items) == len(visible),
        f"JSON-LD {len(items)} vs viditeľné {len(visible)}",
    )

    positions = [it.get("position") for it in items]
    check(
        f"{path}: position je 1..{len(items)} bez dier",
        positions == list(range(1, len(items) + 1)),
        positions,
    )

    for i, item in enumerate(items):
        pos = item.get("position", i + 1)
        vis = visible[i] if i < len(visible) else None
        url = item.get("item") if isinstance(item.get("item"), str) else (
            (item.get("item") or {}).get("@id") if isinstance(item.get("item"), dict) else None
        )
        check(
            f"{path}: ListItem {pos} má názov aj item URL",
            bool(item.get("name")) and bool(url),
            item,
        )
        if not url:
            continue
        check(
            f"{path}: ListItem {pos} item je absolútna URL na {SITE_URL}",
            url.startswith(SITE_URL + "/") or url == SITE_URL,
            url,
        )
        ld_path = urlparse(url).path or "/"
        if vis:
            check(
                f"{path}: ListItem {pos} názov sedí s viditeľným textom",
                item.get("name") == vis["name"],
                f"JSON-LD '{item.get('name')}' vs viditeľné '{vis['name']}'",
            )
            check(
                f"{path}: ListItem {pos} cesta sedí s viditeľnou navigáciou",
                ld_path.rstrip("/") == (vis["path"] or "").rstrip("/"),
                f"{ld_path} vs {vis['path']}",
            )
            if vis["href"]:
                check(
                    f"{path}: ListItem {pos} href odkazu sedí s JSON-LD",
                    vis["href"].rstrip("/") == ld_path.rstrip("/"),
                    f"{vis['href']} vs {ld_path}",
                )
        status, final = url_status(url)
        check(
            f"{path}: ListItem {pos} URL vracia 200 a nemení cestu",
            status == 200 and final.rstrip("/") == ld_path.rstrip("/"),
            f"status={status} final={final}",
        )

    # posledný breadcrumb = aktuálna stránka
    if items:
        last = items[-1]
        last_url = last.get("item") if isinstance(last.get("item"), str) else ""
        check(
            f"{path}: posledný breadcrumb odkazuje na aktuálnu stránku",
            (urlparse(last_url).path or "/").rstrip("/") == path.rstrip("/"),
            last_url,
        )


async def main():
    paths = list(STATIC_PATHS)
    server_path = first_server_path()
    if server_path:
        paths.append(server_path)
    else:
        print("WARN: žiadny profil servera v sitemape — preskakujem 3-úrovňové drobečky")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        for path in paths:
            await audit(page, path)
        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} kontrol OK")
    if failed:
        for label, _, extra in failed:
            print(f"  FAIL: {label} :: {extra}")
        sys.exit(1)


asyncio.run(main())
