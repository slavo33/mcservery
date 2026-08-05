"""
E2E test: OpenGraph a Twitter meta tagy na verejných stránkach.

Pre každú verejnú (indexovateľnú) URL — statické route + URL zo sitemapy —
overuje, že sa do `<head>` vložia správne social meta tagy:

 1. `og:title`, `og:description`, `og:type`, `og:url`, `og:site_name`
    existujú práve raz a nie sú prázdne,
 2. `og:title` sa zhoduje s `<title>` a `og:description` s `meta[name=description]`,
 3. `og:url` je absolútna https URL a **self-referencing** (cesta = cesta stránky),
 4. `twitter:card` je `summary_large_image`, `twitter:title` / `twitter:description`
    sedia s OG variantmi,
 5. dĺžky: title ≤ 70 znakov, description 50–200 znakov (nie prázdna útržkovitá),
 6. `og:image` aj `twitter:image` sú absolútne `https://` URL a **nie sú 404** —
    HTTP status 200 s `Content-Type: image/*` a nenulovou veľkosťou,
 7. obrázok sa reálne dekóduje v prehliadači (`naturalWidth > 0`).

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/og_meta_e2e.py
    E2E_BASE_URL=https://mcservery.one python3 e2e/og_meta_e2e.py
"""
import asyncio
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
MAX_TITLE = 70
MIN_DESC, MAX_DESC = 50, 200

results = []
image_cache = {}


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.headers, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.headers, b""
    except Exception as e:
        return 0, {}, str(e).encode()


def norm(path):
    path = (path or "/").split("?")[0].split("#")[0]
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]
    return path or "/"


def sitemap_paths():
    paths = []
    status, _, body = fetch(BASE + "/sitemap.xml")
    body = body.decode("utf-8", "replace")
    if status != 200 or not body.strip():
        return paths
    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        return paths
    if root.tag.endswith("sitemapindex"):
        for sm in root.findall("sm:sitemap/sm:loc", NS):
            s, _, b = fetch(sm.text.strip())
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


def check_image_url(label, url):
    """Obrázok musí byť absolútna https URL, status 200 a typ image/*."""
    parsed = urlparse(url or "")
    check(f"{label} je absolútna https URL",
          parsed.scheme == "https" and bool(parsed.netloc), url)
    if parsed.scheme != "https":
        return
    if url not in image_cache:
        image_cache[url] = fetch(url)
    status, headers, body = image_cache[url]
    ctype = (headers.get("Content-Type") if headers else "") or ""
    check(f"{label} vracia HTTP 200 (nie 404)", status == 200, status)
    check(f"{label} má Content-Type image/*", ctype.startswith("image/"), ctype)
    check(f"{label} nie je prázdny súbor", len(body) > 1024, f"{len(body)} B")


async def head_meta(page, path):
    await page.goto(BASE + path, wait_until="networkidle")
    await page.wait_for_timeout(300)
    return await page.evaluate(
        """() => {
            const all = (sel) => Array.from(document.querySelectorAll(sel))
                .map(m => (m.getAttribute('content') || '').trim());
            return {
                title: document.title,
                desc: all('meta[name="description"]'),
                ogTitle: all('meta[property="og:title"]'),
                ogDesc: all('meta[property="og:description"]'),
                ogType: all('meta[property="og:type"]'),
                ogUrl: all('meta[property="og:url"]'),
                ogSite: all('meta[property="og:site_name"]'),
                ogImage: all('meta[property="og:image"]'),
                twCard: all('meta[name="twitter:card"]'),
                twTitle: all('meta[name="twitter:title"]'),
                twDesc: all('meta[name="twitter:description"]'),
                twImage: all('meta[name="twitter:image"]'),
                path: location.pathname,
            };
        }"""
    )


async def decodes(page, url):
    return await page.evaluate(
        """(src) => new Promise((res) => {
            const i = new Image();
            i.onload = () => res(i.naturalWidth > 0 && i.naturalHeight > 0);
            i.onerror = () => res(false);
            i.src = src;
            setTimeout(() => res(i.naturalWidth > 0), 12000);
        })""",
        url,
    )


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
            m = await head_meta(page, path)
            label = f"[{path}]"

            for name, key in [("og:title", "ogTitle"), ("og:description", "ogDesc"),
                              ("og:type", "ogType"), ("og:url", "ogUrl"),
                              ("og:site_name", "ogSite"), ("og:image", "ogImage"),
                              ("twitter:card", "twCard"), ("twitter:title", "twTitle"),
                              ("twitter:description", "twDesc"), ("twitter:image", "twImage")]:
                vals = m[key]
                check(f"{label} {name} existuje práve raz a nie je prázdny",
                      len(vals) == 1 and bool(vals[0]), vals)

            og_title = m["ogTitle"][0] if m["ogTitle"] else ""
            og_desc = m["ogDesc"][0] if m["ogDesc"] else ""
            og_url = m["ogUrl"][0] if m["ogUrl"] else ""
            og_img = m["ogImage"][0] if m["ogImage"] else ""
            tw_img = m["twImage"][0] if m["twImage"] else ""
            desc = m["desc"][0] if m["desc"] else ""

            check(f"{label} og:title == <title>", og_title == m["title"],
                  f"{og_title!r} vs {m['title']!r}")
            check(f"{label} og:description == meta description", og_desc == desc)
            check(f"{label} og:type je website/article",
                  (m["ogType"][0] if m["ogType"] else "") in ("website", "article"), m["ogType"])
            check(f"{label} twitter:card je summary_large_image",
                  (m["twCard"][0] if m["twCard"] else "") == "summary_large_image", m["twCard"])
            check(f"{label} twitter:title == og:title",
                  (m["twTitle"][0] if m["twTitle"] else "") == og_title)
            check(f"{label} twitter:description == og:description",
                  (m["twDesc"][0] if m["twDesc"] else "") == og_desc)

            p_url = urlparse(og_url)
            check(f"{label} og:url je https na {SITE_HOST}",
                  p_url.scheme == "https" and p_url.netloc.endswith(SITE_HOST), og_url)
            check(f"{label} og:url je self-referencing",
                  norm(p_url.path) == norm(m["path"]),
                  f"{norm(p_url.path)} vs {norm(m['path'])}")

            check(f"{label} dĺžka title ≤ {MAX_TITLE}", len(m["title"]) <= MAX_TITLE, len(m["title"]))
            check(f"{label} dĺžka description {MIN_DESC}–{MAX_DESC}",
                  MIN_DESC <= len(og_desc) <= MAX_DESC, len(og_desc))

            check(f"{label} twitter:image == og:image", tw_img == og_img, f"{tw_img!r}")
            check_image_url(f"{label} og:image", og_img)
            if og_img.startswith("https://"):
                ok = await decodes(page, og_img)
                check(f"{label} og:image sa dekóduje v prehliadači", ok, og_img)

        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} OK")
    if failed:
        for lbl, _, extra in failed:
            print("FAILED:", lbl, extra)
        sys.exit(1)


asyncio.run(main())
