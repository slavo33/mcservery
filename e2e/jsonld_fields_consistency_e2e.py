"""
E2E test: povinné polia JSON-LD (WebPage/Organization) + konzistencia údajov
o hernom serveri (SoftwareApplication / GameServer) s obsahom stránky.

Pre každú verejnú stránku overuje:
 1. existuje práve jedna **WebPage** entita s povinnými poľami
    (`@context`, `@type`, `name`, `description`, `url`, `inLanguage`,
    `isPartOf.url`, `publisher.name`) a self-referencing `url`,
 2. `WebPage.name` zodpovedá `<title>` a `WebPage.description` meta description,
 3. existuje práve jedna **Organization** entita s `name` a absolútnou `url`
    zhodnou naprieč všetkými stránkami,
 4. žiadna hodnota nie je prázdna ani textový artefakt `undefined`/`null`/`NaN`.

Pre profily serverov (`/server/<slug>`) navyše:
 5. entita servera (`SoftwareApplication`/`GameServer`) má povinné polia
    `name`, `description`, `applicationCategory`, `operatingSystem`, `url`, `offers`,
 6. `name` sa presne zhoduje s viditeľným `<h1>`,
 7. `softwareVersion` sa presne zhoduje s viditeľným odznakom verzie
    (`[data-version-badge]`), alebo chýba, ak odznak na stránke nie je,
 8. edície Java/Bedrock v `operatingSystem`, `applicationSubCategory`
    a v `additionalProperty` „Edition“ presne zodpovedajú viditeľným odznakom
    platforiem (`[data-server-platform]`) — bez chýbajúcich a bez navyše,
 9. `runtimePlatform` / „Server software“ zodpovedá viditeľnému odznaku softvéru,
10. „Server IP“ zodpovedá viditeľnej IP adrese na stránke.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/jsonld_fields_consistency_e2e.py
    E2E_BASE_URL=https://mcservery.one python3 e2e/jsonld_fields_consistency_e2e.py
"""
import asyncio
import json
import os
import sys
from urllib.parse import urlparse

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
SITE_HOST = "mcservery.one"
MAX_SERVERS = int(os.environ.get("E2E_MAX_SERVERS", "3"))

STATIC_PATHS = ["/", "/servers", "/staff", "/vip", "/add-server", "/terms", "/privacy"]
BAD_VALUES = {"", "undefined", "null", "NaN", "[object Object]"}
SERVER_TYPES = {"SoftwareApplication", "GameServer", "Product", "VideoGame"}

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + (f" — {extra}" if extra else ""))


def is_clean(value):
    return isinstance(value, str) and value.strip() not in BAD_VALUES


def entities(blocks):
    out = []
    for raw in blocks:
        try:
            data = json.loads(raw)
        except Exception:
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            if isinstance(item, dict):
                out.extend(item.get("@graph", [item]) if "@graph" in item else [item])
    return out


def of_type(items, wanted):
    def types(e):
        t = e.get("@type")
        return set(t) if isinstance(t, list) else {t}

    return [e for e in items if types(e) & set(wanted)]


def prop(entity, name):
    props = entity.get("additionalProperty") or []
    for p in props:
        if isinstance(p, dict) and p.get("name") == name:
            return p.get("value")
    return None


def norm_editions(text):
    """Vytiahne Java/Bedrock z ľubovoľného reťazca a vráti zoradenú množinu."""
    found = set()
    lowered = (text or "").lower()
    for edition in ("java", "bedrock"):
        if edition in lowered:
            found.add(edition.capitalize())
    return sorted(found)


async def read_page(page, path):
    await page.goto(f"{BASE}{path}", wait_until="networkidle")
    blocks = await page.eval_on_selector_all(
        'script[type="application/ld+json"]', "els => els.map(e => e.textContent || '')"
    )
    title = await page.title()
    desc = await page.eval_on_selector(
        'meta[name="description"]', "el => el.content", strict=False
    ) if await page.query_selector('meta[name="description"]') else None
    return entities(blocks), title, desc


async def check_common(page, path, org_urls):
    items, title, desc = await read_page(page, path)
    webpages = of_type(items, ["WebPage"])
    check(f"{path}: práve jedna WebPage entita", len(webpages) == 1, f"našiel {len(webpages)}")
    if webpages:
        wp = webpages[0]
        for field in ("name", "description", "url", "inLanguage"):
            check(f"{path}: WebPage.{field} je vyplnené", is_clean(wp.get(field)), repr(wp.get(field)))
        check(f"{path}: WebPage @context schema.org", str(wp.get("@context", "")).endswith("schema.org"))
        parsed = urlparse(str(wp.get("url", "")))
        check(
            f"{path}: WebPage.url je self-referencing",
            parsed.scheme == "https" and parsed.netloc.endswith(SITE_HOST) and (parsed.path or "/") == path,
            wp.get("url"),
        )
        check(f"{path}: WebPage.isPartOf.url", is_clean((wp.get("isPartOf") or {}).get("url")))
        check(f"{path}: WebPage.publisher.name", is_clean((wp.get("publisher") or {}).get("name")))
        if title:
            check(f"{path}: WebPage.name zodpovedá <title>", wp.get("name") == title, f"{wp.get('name')!r} vs {title!r}")
        if desc:
            check(f"{path}: WebPage.description zodpovedá meta description", wp.get("description") == desc)

    orgs = of_type(items, ["Organization"])
    check(f"{path}: práve jedna Organization entita", len(orgs) == 1, f"našiel {len(orgs)}")
    if orgs:
        org = orgs[0]
        check(f"{path}: Organization.name", is_clean(org.get("name")), repr(org.get("name")))
        url = str(org.get("url", ""))
        check(f"{path}: Organization.url je absolútna", url.startswith("https://") and SITE_HOST in url, url)
        org_urls.add(url)

    dirty = [
        f"{e.get('@type')}.{k}"
        for e in items
        for k, v in e.items()
        if isinstance(v, str) and v.strip() in BAD_VALUES
    ]
    check(f"{path}: žiadne prázdne/undefined hodnoty", not dirty, ", ".join(dirty))
    return items


async def check_server(page, path):
    items, title, desc = await read_page(page, path)
    apps = of_type(items, SERVER_TYPES)
    check(f"{path}: práve jedna entita servera", len(apps) == 1, f"našiel {len(apps)}")
    if not apps:
        return
    app = apps[0]
    for field in ("name", "description", "applicationCategory", "operatingSystem", "url"):
        check(f"{path}: server.{field} je vyplnené", is_clean(app.get(field)), repr(app.get(field)))
    check(f"{path}: server.offers.price je definované", (app.get("offers") or {}).get("price") is not None)

    h1 = await page.eval_on_selector("h1", "el => el.textContent.trim()")
    check(f"{path}: server.name = viditeľný <h1>", app.get("name") == h1, f"{app.get('name')!r} vs {h1!r}")

    badge = await page.query_selector("[data-version-badge]")
    badge_version = await badge.get_attribute("data-version-badge") if badge else None
    check(
        f"{path}: softwareVersion zodpovedá odznaku verzie",
        app.get("softwareVersion") == badge_version if badge_version else "softwareVersion" not in app,
        f"{app.get('softwareVersion')!r} vs {badge_version!r}",
    )

    visible_editions = sorted(
        set(
            await page.eval_on_selector_all(
                "[data-server-platform]", "els => els.map(e => e.dataset.serverPlatform)"
            )
        )
    )
    check(f"{path}: stránka zobrazuje aspoň jednu edíciu", bool(visible_editions), str(visible_editions))
    check(
        f"{path}: operatingSystem zodpovedá edíciám na stránke",
        norm_editions(str(app.get("operatingSystem"))) == visible_editions,
        f"{app.get('operatingSystem')!r} vs {visible_editions}",
    )
    check(
        f"{path}: additionalProperty Edition zodpovedá edíciám",
        norm_editions(str(prop(app, "Edition"))) == visible_editions,
        f"{prop(app, 'Edition')!r} vs {visible_editions}",
    )
    if app.get("applicationSubCategory"):
        check(
            f"{path}: applicationSubCategory zodpovedá edíciám",
            norm_editions(str(app.get("applicationSubCategory"))) == visible_editions,
            str(app.get("applicationSubCategory")),
        )

    sw_el = await page.query_selector("[data-server-software]")
    visible_sw = (await sw_el.get_attribute("data-server-software")) if sw_el else None
    if visible_sw and visible_sw.strip().lower() not in ("", "žiadny"):
        check(
            f"{path}: runtimePlatform zodpovedá softvéru na stránke",
            app.get("runtimePlatform") == visible_sw and prop(app, "Server software") == visible_sw,
            f"{app.get('runtimePlatform')!r} vs {visible_sw!r}",
        )

    ip_el = await page.query_selector("[data-server-ip]")
    visible_ip = (await ip_el.get_attribute("data-server-ip")) if ip_el else None
    if visible_ip:
        check(
            f"{path}: Server IP v JSON-LD zodpovedá IP na stránke",
            prop(app, "Server IP") == visible_ip,
            f"{prop(app, 'Server IP')!r} vs {visible_ip!r}",
        )

    parsed = urlparse(str(app.get("url", "")))
    check(
        f"{path}: server.url je self-referencing",
        parsed.scheme == "https" and parsed.netloc.endswith(SITE_HOST) and parsed.path == path,
        app.get("url"),
    )


async def main():
    org_urls = set()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        for path in STATIC_PATHS:
            await check_common(page, path, org_urls)

        check("Organization.url je rovnaká na všetkých stránkach", len(org_urls) <= 1, str(org_urls))

        await page.goto(f"{BASE}/servers", wait_until="networkidle")
        hrefs = await page.eval_on_selector_all(
            'a[href^="/server/"]',
            "els => [...new Set(els.map(e => new URL(e.href).pathname))].filter(p => !p.endsWith('/edit'))",
        )
        server_paths = hrefs[:MAX_SERVERS]
        check("našiel aspoň jeden profil servera", bool(server_paths), str(server_paths))
        for path in server_paths:
            await check_common(page, path, org_urls)
            await check_server(page, path)

        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} kontrol OK")
    if failed:
        for label, _, extra in failed:
            print(f"  ✗ {label} — {extra}")
        sys.exit(1)


asyncio.run(main())
