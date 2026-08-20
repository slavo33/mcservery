"""
E2E SEO test kľúčových stránok: hlavná, /servers, /servers/<slug>, profil a /vip.

Pre každú stránku overuje:
 1. jedinečný a neprázdny <title> (bez šablónových hodnôt) a meta description,
 2. práve jeden self-referencing <link rel="canonical"> na produkčnú doménu,
 3. og:title, og:description, og:url (+ twitter:card) a že og:url == canonical,
 4. platný JSON-LD: parsovateľný JSON, prítomný @context/@type,
    povinné polia pre WebSite/CollectionPage/Person/Product/SoftwareApplication,
    BreadcrumbList s korektne číslovanými položkami.

Dynamické URL (detail servera, profil) sa berú zo sitemap.xml, aby test
odrážal reálne indexované stránky.

Spustenie (dev server na http://localhost:8080):
    python3 e2e/key_pages_seo_e2e.py
    E2E_BASE_URL=https://mcservery.one python3 e2e/key_pages_seo_e2e.py
"""
import asyncio, json, os, sys, urllib.request
from urllib.parse import urlparse
from xml.etree import ElementTree as ET

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
SITE_URL = "https://mcservery.one"
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
PLACEHOLDER_TITLES = {"lovable app", "lovable generated project", "vite + react + ts", ""}

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def note(label, extra=""):
    results.append((label, True, extra))
    print("SKIP " + label + ((" :: " + str(extra)) if extra else ""))


def sitemap_paths():
    """Cesty zo sitemap.xml (aj zo sitemap indexu)."""
    paths = []

    def load(url):
        try:
            with urllib.request.urlopen(url, timeout=20) as r:
                return ET.fromstring(r.read())
        except Exception:
            return None

    root = load(f"{BASE}/sitemap.xml")
    if root is None:
        return paths
    if root.tag.endswith("sitemapindex"):
        for loc in root.findall(".//sm:sitemap/sm:loc", NS)[:5]:
            child = load(loc.text.strip().replace(SITE_URL, BASE))
            if child is not None:
                paths += [urlparse(l.text.strip()).path for l in child.findall(".//sm:url/sm:loc", NS)]
    else:
        paths = [urlparse(l.text.strip()).path for l in root.findall(".//sm:url/sm:loc", NS)]
    return paths


def pick(paths, prefix, skip_exact=True):
    for p in paths:
        if p.startswith(prefix) and (not skip_exact or p.rstrip("/") != prefix.rstrip("/")):
            return p
    return None


async def head_data(page, path):
    await page.goto(BASE + path, wait_until="domcontentloaded", timeout=30000)
    try:
        await page.wait_for_selector("link[rel=canonical]", timeout=8000)
    except Exception:
        pass
    await page.wait_for_timeout(700)
    return await page.evaluate(
        """() => ({
          title: document.title,
          description: (document.querySelector('meta[name=description]')||{}).content || '',
          canonicals: [...document.querySelectorAll('link[rel=canonical]')].map(l => l.href),
          og: Object.fromEntries([...document.querySelectorAll('meta[property^="og:"]')]
                .map(m => [m.getAttribute('property'), m.content])),
          tw: Object.fromEntries([...document.querySelectorAll('meta[name^="twitter:"]')]
                .map(m => [m.getAttribute('name'), m.content])),
          robots: (document.querySelector('meta[name=robots]')||{}).content || '',
          jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent),
        })"""
    )


REQUIRED_FIELDS = {
    "WebSite": ["name", "url"],
    "CollectionPage": ["name"],
    "ProfilePage": ["name"],
    "Person": ["name"],
    "Product": ["name"],
    "SoftwareApplication": ["name"],
    "JobPosting": ["title"],
    "Organization": ["name"],
}


def validate_jsonld(label, blocks):
    if not blocks:
        check(f"{label} má JSON-LD", False, "žiadny script[type=application/ld+json]")
        return
    check(f"{label} má JSON-LD", True, f"blokov: {len(blocks)}")
    types_seen = []
    for i, raw in enumerate(blocks):
        try:
            data = json.loads(raw)
        except Exception as exc:
            check(f"{label} JSON-LD #{i + 1} je platný JSON", False, str(exc)[:80])
            continue
        check(f"{label} JSON-LD #{i + 1} je platný JSON", True)
        nodes = data.get("@graph", data) if isinstance(data, dict) else data
        nodes = nodes if isinstance(nodes, list) else [nodes]
        for node in nodes:
            if not isinstance(node, dict):
                continue
            t = node.get("@type")
            t = t[0] if isinstance(t, list) and t else t
            types_seen.append(t)
            check(f"{label} JSON-LD #{i + 1} má @context", "@context" in data or "@context" in node)
            check(f"{label} JSON-LD #{i + 1} má @type", bool(t))
            for field in REQUIRED_FIELDS.get(t, []):
                check(f"{label} JSON-LD {t} má '{field}'", bool(node.get(field)))
            if t == "BreadcrumbList":
                items = node.get("itemListElement") or []
                check(f"{label} BreadcrumbList má položky", len(items) > 0)
                positions = [it.get("position") for it in items if isinstance(it, dict)]
                check(f"{label} BreadcrumbList má správne pozície",
                      positions == list(range(1, len(items) + 1)), str(positions))
                check(f"{label} BreadcrumbList položky majú názov",
                      all(it.get("name") for it in items if isinstance(it, dict)))
    return types_seen


def validate_head(label, path, d):
    title = (d["title"] or "").strip()
    check(f"{label} má neprázdny <title>", title.lower() not in PLACEHOLDER_TITLES, title[:70])
    check(f"{label} má <title> do 70 znakov", len(title) <= 70, f"{len(title)} znakov")
    desc = (d["description"] or "").strip()
    check(f"{label} má meta description", len(desc) >= 40, f"{len(desc)} znakov")

    canon = d["canonicals"]
    check(f"{label} má práve jeden canonical", len(canon) == 1, str(canon))
    canon_url = canon[0] if canon else ""
    if canon_url:
        cp = urlparse(canon_url)
        check(f"{label} canonical je absolútna https URL", cp.scheme == "https", canon_url)
        check(f"{label} canonical smeruje na produkčnú doménu", cp.netloc == urlparse(SITE_URL).netloc, cp.netloc)
        check(f"{label} canonical je self-referencing",
              cp.path.rstrip("/") == path.rstrip("/"), f"{cp.path} != {path}")

    og = d["og"]
    for key in ("og:title", "og:description", "og:url", "og:type"):
        check(f"{label} má {key}", bool(og.get(key)), (og.get(key) or "")[:70])
    if og.get("og:url") and canon_url:
        check(f"{label} og:url == canonical",
              og["og:url"].rstrip("/") == canon_url.rstrip("/"), f"{og['og:url']} vs {canon_url}")
    check(f"{label} má twitter:card", bool(d["tw"].get("twitter:card")), d["tw"].get("twitter:card", ""))
    check(f"{label} nie je noindex", "noindex" not in (d["robots"] or "").lower(), d["robots"])


async def run():
    paths = sitemap_paths()
    server_path = pick(paths, "/server/")
    profile_path = pick(paths, "/user/")

    pages = [("hlavná", "/"), ("/servers", "/servers"), ("/vip", "/vip")]
    if server_path:
        pages.append(("detail servera", server_path))
    if profile_path:
        pages.append(("profil používateľa", profile_path))

    titles = {}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800}, locale="sk-SK")
        page = await context.new_page()
        for label, path in pages:
            try:
                d = await head_data(page, path)
            except Exception as exc:
                check(f"{label} sa načíta", False, str(exc)[:120])
                continue
            check(f"{label} sa načíta", True, path)
            validate_head(label, path, d)
            validate_jsonld(label, d["jsonld"])
            titles[label] = (d["title"] or "").strip()
        await browser.close()

    if not server_path:
        note("detail servera preskočený", "v sitemape nie je /server/<slug>")
    if not profile_path:
        note("profil preskočený", "v sitemape nie je profilová URL")

    uniq = len(set(titles.values()))
    check("kľúčové stránky majú unikátne tituly", uniq == len(titles), f"{uniq}/{len(titles)}")

    failed = [r for r in results if not r[1]]
    print(f"\n=== {len(results) - len(failed)}/{len(results)} OK ===")
    for label, _, extra in failed:
        print("FAIL:", label, extra)
    return 1 if failed else 0


sys.exit(asyncio.run(run()))
