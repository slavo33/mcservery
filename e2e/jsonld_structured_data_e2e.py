"""
E2E test: Schema.org JSON-LD na verejných stránkach.

Pre každú verejnú (indexovateľnú) URL — statické route + URL zo sitemapy —
overuje, že sa do `<head>` vloží validné structured data:

 1. každý `script[type="application/ld+json"]` je **validný JSON** (nie prázdny,
    bez HTML/komentárov),
 2. každá entita má `@context` na `schema.org` a neprázdny `@type`,
 3. na stránke existuje aspoň jedna entita a `@type` sa neopakuje (žiadne duplicity),
 4. **WebPage** entita existuje na každej verejnej stránke, má `name`, `description`,
    `inLanguage` a `url`, ktorá je **self-referencing** (https na mcservery.one,
    cesta = cesta stránky),
 5. **Organization** entita existuje s `name` a absolútnou `url`,
 6. `BreadcrumbList` (ak je) má rastúce `position` od 1 a absolútne `item` URL,
 7. profil servera (`/server/<slug>`) obsahuje **SoftwareApplication** s
    `name`, `description`, `applicationCategory=GameApplication`, `operatingSystem`,
    `url` (self-referencing), `offers` a `additionalProperty` s hodnotou „Server IP“;
    ak je na stránke odznak verzie, `softwareVersion` sa s ním musí zhodovať,
 8. hodnoty nie sú prázdne reťazce ani `undefined`/`null` textové artefakty.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/jsonld_structured_data_e2e.py
    E2E_BASE_URL=https://mcservery.one python3 e2e/jsonld_structured_data_e2e.py
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
SITE_HOST = "mcservery.one"
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
MAX_URLS = int(os.environ.get("E2E_MAX_URLS", "8"))
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")

STATIC_PUBLIC = ["/", "/servers", "/staff"]
BAD_VALUES = {"", "undefined", "null", "NaN"}

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b""
    except Exception as e:
        return 0, str(e).encode()


def norm(path):
    path = (path or "/").split("?")[0].split("#")[0]
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]
    return path or "/"


def sitemap_paths():
    paths = []
    status, body = fetch(BASE + "/sitemap.xml")
    body = body.decode("utf-8", "replace")
    if status != 200 or not body.strip():
        return paths
    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        return paths
    if root.tag.endswith("sitemapindex"):
        for sm in root.findall("sm:sitemap/sm:loc", NS):
            s, b = fetch(sm.text.strip())
            b = b.decode("utf-8", "replace")
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


def nonempty(value):
    return isinstance(value, str) and value.strip() not in BAD_VALUES


def abs_url(value):
    p = urlparse(value or "")
    return p.scheme == "https" and p.netloc.endswith(SITE_HOST)


def flatten(entity):
    """Podporí aj @graph zápis."""
    if isinstance(entity, list):
        out = []
        for e in entity:
            out.extend(flatten(e))
        return out
    if isinstance(entity, dict) and isinstance(entity.get("@graph"), list):
        return flatten(entity["@graph"])
    return [entity] if isinstance(entity, dict) else []


async def page_state(page, path):
    await page.goto(BASE + path, wait_until="networkidle")
    await page.wait_for_timeout(300)
    return await page.evaluate(
        """() => ({
            raw: Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
                .map(s => s.textContent || ''),
            path: location.pathname,
            badge: (document.querySelector('[data-testid="version-badge"]')
                || document.querySelector('[data-version-badge]'))?.textContent?.trim() || '',
        })"""
    )


def check_breadcrumb(label, bc):
    items = bc.get("itemListElement")
    check(f"{label} BreadcrumbList má zoznam položiek", isinstance(items, list) and len(items) > 0)
    if not isinstance(items, list):
        return
    positions = [i.get("position") for i in items if isinstance(i, dict)]
    check(f"{label} BreadcrumbList má pozície 1..n",
          positions == list(range(1, len(items) + 1)), positions)
    for i in items:
        if not isinstance(i, dict):
            continue
        check(f"{label} breadcrumb '{i.get('name')}' má názov a absolútnu URL",
              nonempty(i.get("name")) and abs_url(i.get("item", "")), i.get("item"))


def check_software_app(label, app, path, badge):
    for field in ("name", "description", "operatingSystem"):
        check(f"{label} SoftwareApplication.{field} nie je prázdny", nonempty(app.get(field)),
              app.get(field))
    check(f"{label} applicationCategory je GameApplication",
          app.get("applicationCategory") == "GameApplication", app.get("applicationCategory"))
    check(f"{label} SoftwareApplication.url je self-referencing",
          abs_url(app.get("url", "")) and norm(urlparse(app.get("url", "")).path) == norm(path),
          app.get("url"))
    offers = app.get("offers")
    check(f"{label} SoftwareApplication má offers", isinstance(offers, dict)
          and offers.get("@type") == "Offer" and nonempty(str(offers.get("price"))), offers)
    props = app.get("additionalProperty") or []
    names = [p.get("name") for p in props if isinstance(p, dict)]
    check(f"{label} additionalProperty obsahuje Server IP", "Server IP" in names, names)
    for p in props:
        if isinstance(p, dict):
            check(f"{label} additionalProperty '{p.get('name')}' má neprázdnu hodnotu",
                  nonempty(str(p.get("value"))), p.get("value"))
    if badge:
        check(f"{label} softwareVersion zodpovedá odznaku verzie",
              app.get("softwareVersion") == badge, f"{app.get('softwareVersion')} vs {badge}")
    if app.get("softwareVersion") is not None:
        check(f"{label} softwareVersion má tvar vX.Y",
              isinstance(app["softwareVersion"], str)
              and app["softwareVersion"].startswith("v"), app.get("softwareVersion"))


async def main():
    sm = sitemap_paths()
    check("sitemap.xml poskytla verejné URL", len(sm) > 0, f"{len(sm)} URL")

    paths = []
    for p in STATIC_PUBLIC + sm:
        if p not in paths:
            paths.append(p)
    paths = paths[:MAX_URLS]

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800}, user_agent=UA)
        page = await ctx.new_page()

        for path in paths:
            state = await page_state(page, path)
            label = f"[{path}]"
            check(f"{label} obsahuje aspoň jeden JSON-LD blok", len(state["raw"]) > 0,
                  len(state["raw"]))

            entities = []
            for i, raw in enumerate(state["raw"]):
                try:
                    parsed = json.loads(raw)
                    ok = True
                except json.JSONDecodeError as e:
                    parsed, ok = None, False
                    check(f"{label} JSON-LD blok #{i + 1} je validný JSON", False, str(e))
                if ok:
                    check(f"{label} JSON-LD blok #{i + 1} je validný JSON", True)
                    entities.extend(flatten(parsed))

            types = []
            for e in entities:
                ctx_val = e.get("@context", "")
                ctx_ok = isinstance(ctx_val, str) and "schema.org" in ctx_val
                t = e.get("@type")
                types.append(t)
                check(f"{label} entita {t} má @context schema.org", ctx_ok, ctx_val)
                check(f"{label} entita má neprázdny @type", nonempty(t if isinstance(t, str) else ""),
                      t)

            check(f"{label} @type sa neopakuje (bez duplicít)",
                  len(types) == len(set(types)), types)

            web = next((e for e in entities if e.get("@type") == "WebPage"), None)
            check(f"{label} obsahuje WebPage entitu", web is not None, types)
            if web:
                for field in ("name", "description", "inLanguage"):
                    check(f"{label} WebPage.{field} nie je prázdny", nonempty(web.get(field)),
                          web.get(field))
                check(f"{label} WebPage.url je self-referencing",
                      abs_url(web.get("url", ""))
                      and norm(urlparse(web.get("url", "")).path) == norm(state["path"]),
                      f"{web.get('url')} vs {state['path']}")

            org = next((e for e in entities if e.get("@type") == "Organization"), None)
            check(f"{label} obsahuje Organization entitu", org is not None, types)
            if org:
                check(f"{label} Organization.name nie je prázdny", nonempty(org.get("name")),
                      org.get("name"))
                check(f"{label} Organization.url je absolútna https URL",
                      abs_url(org.get("url", "")), org.get("url"))

            bc = next((e for e in entities if e.get("@type") == "BreadcrumbList"), None)
            if bc:
                check_breadcrumb(label, bc)

            if path.startswith("/server/"):
                app = next((e for e in entities if e.get("@type") == "SoftwareApplication"), None)
                check(f"{label} profil servera obsahuje SoftwareApplication", app is not None, types)
                if app:
                    check_software_app(label, app, state["path"], state["badge"])
                check(f"{label} profil servera obsahuje BreadcrumbList", bc is not None, types)

        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} OK")
    if failed:
        for lbl, _, extra in failed:
            print("FAILED:", lbl, extra)
        sys.exit(1)


asyncio.run(main())
