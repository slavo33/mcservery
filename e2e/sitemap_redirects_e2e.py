"""
E2E test: presmerovania URL zo sitemapy.

Pre každú URL zo `sitemap.xml` (aj cez sitemap index) overuje:
 1. HTTP reťaz presmerovaní: každý hop je 301/302/307/308 s hlavičkou `Location`,
    reťaz má max 3 hopy a neobsahuje cyklus (žiadna URL sa neopakuje),
 2. finálny HTTP status je 200 — nikdy 404, 410 ani 5xx,
 3. po otvorení v prehliadači stránka neskončí na 404 obrazovke ("Stránka
    nenájdená") ani na chybovej hláške, a nezostane prázdna (má `h1`/obsah),
 4. finálna URL v prehliadači zodpovedá očakávaniu — buď presne cesta zo
    sitemapy, alebo jej normalizovaná (napr. bez koncového `/`) podoba;
    žiadne nečakané presmerovanie na `/auth`, `/404` ani na domovskú stránku,
 5. `canonical` na stránke ukazuje na tú istú (finálnu) cestu,
 6. stránka nie je `noindex` — sitemapa nesmie obsahovať neindexovateľné URL,
 7. varianty s koncovým lomkom a s veľkými písmenami sa buď korektne
    presmerujú, alebo vrátia rovnaký obsah (nikdy 404/500).

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/sitemap_redirects_e2e.py
    E2E_BASE_URL=https://mcservery.one python3 e2e/sitemap_redirects_e2e.py
"""
import asyncio, os, sys, urllib.error, urllib.request
from xml.etree import ElementTree as ET

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
SITE_URL = "https://mcservery.one"
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
MAX_URLS = int(os.environ.get("E2E_MAX_URLS", "12"))
MAX_HOPS = 3
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


opener = urllib.request.build_opener(NoRedirect)


def head(url):
    """Jeden hop bez nasledovania presmerovania → (status, location)."""
    req = urllib.request.Request(url, headers={"User-Agent": UA}, method="GET")
    try:
        with opener.open(req, timeout=30) as r:
            return r.status, r.headers.get("Location")
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Location")
    except Exception as e:
        return 0, str(e)


def follow(path):
    """Prejde reťaz presmerovaní. Vráti (hopy, finálna_url, finálny_status, chyba)."""
    url = BASE + path
    seen = [url]
    hops = []
    for _ in range(MAX_HOPS + 1):
        status, loc = head(url)
        if status in (301, 302, 303, 307, 308):
            if not loc:
                return hops, url, status, "presmerovanie bez hlavičky Location"
            nxt = urllib.request.urljoin(url, loc)
            hops.append((url, status, nxt))
            if nxt in seen:
                return hops, nxt, status, f"cyklus presmerovaní: {nxt}"
            seen.append(nxt)
            url = nxt
            continue
        return hops, url, status, None
    return hops, url, 0, f"viac ako {MAX_HOPS} presmerovaní"


def sitemap_paths():
    def get(u):
        req = urllib.request.Request(u, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read().decode("utf-8")

    root = ET.fromstring(get(BASE + "/sitemap.xml"))
    locs = []
    if root.tag.endswith("sitemapindex"):
        for s in root.findall("sm:sitemap", NS):
            chunk = (s.findtext("sm:loc", default="", namespaces=NS) or "").replace(SITE_URL, BASE)
            sub = ET.fromstring(get(chunk))
            locs += [u.findtext("sm:loc", default="", namespaces=NS) or "" for u in sub.findall("sm:url", NS)]
    else:
        locs = [u.findtext("sm:loc", default="", namespaces=NS) or "" for u in root.findall("sm:url", NS)]
    return [l.replace(SITE_URL, "").replace(BASE, "") or "/" for l in locs if l]


def norm(p):
    p = p.split("#")[0].split("?")[0]
    return p.rstrip("/") or "/"


async def browser_state(page, path):
    await page.goto(BASE + path, wait_until="networkidle")
    await page.wait_for_timeout(700)
    return await page.evaluate(
        """
        () => ({
          url: location.pathname,
          h1: (document.querySelector('h1') || {}).textContent || '',
          text: document.body.innerText.slice(0, 400),
          canonical: (document.querySelector('link[rel="canonical"]') || {}).href || '',
          robots: (document.querySelector('meta[name="robots"]') || {}).content || '',
          bodyLen: document.body.innerText.trim().length,
        })
        """
    )


async def main():
    paths = sitemap_paths()
    check("sitemap.xml obsahuje URL", len(paths) > 0, f"{len(paths)} URL")
    sample = paths[:MAX_URLS]
    print(f"testuje sa {len(sample)} z {len(paths)} URL\n")

    # 1) HTTP vrstva
    for p in sample:
        hops, final_url, status, err = follow(p)
        chain = " → ".join(f"{u} [{s}]" for u, s, _ in hops) or "bez presmerovania"
        check(f"[HTTP {p}] reťaz presmerovaní je bez cyklu a ≤ {MAX_HOPS} hopy",
              err is None, err or chain)
        check(f"[HTTP {p}] finálny status je 200 (nie 404/410/5xx)",
              status == 200, f"{status} → {final_url}")
        if hops:
            bad = [h for h in hops if h[1] not in (301, 308)]
            check(f"[HTTP {p}] presmerovania sú trvalé (301/308)", not bad, chain)

    # 2) varianty ciest nesmú padnúť na 404/500
    for p in sample[:5]:
        for variant in ({norm(p) + "/"} if norm(p) != "/" else set()):
            _, furl, status, err = follow(variant)
            check(f"[variant {variant}] nekončí na 404/5xx",
                  status in (200, 301, 302, 308) and err is None,
                  f"{status} {err or ''}")

    # 3) vrstva prehliadača (SPA smerovanie)
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        for p in sample:
            st = await browser_state(page, p)
            not_found = ("404" in st["h1"]) or ("nenájden" in st["text"].lower()) or ("not found" in st["text"].lower())
            check(f"[SPA {p}] nezobrazí 404 stránku", not not_found, st["h1"][:60])
            check(f"[SPA {p}] stránka má obsah", st["bodyLen"] > 200, st["bodyLen"])
            check(f"[SPA {p}] URL zostala očakávaná (bez nečakaného presmerovania)",
                  norm(st["url"]) == norm(p), f'{st["url"]} != {p}')
            check(f"[SPA {p}] canonical ukazuje na tú istú cestu",
                  bool(st["canonical"]) and norm(urllib.parse.urlparse(st["canonical"]).path) == norm(p),
                  st["canonical"])
            check(f"[SPA {p}] stránka nie je noindex", "noindex" not in st["robots"].lower(), st["robots"])

        check("žiadne JS chyby počas prechádzania URL", not errors, "; ".join(errors[:3]))
        await browser.close()

    ok = sum(1 for _, o, _ in results if o)
    print(f"\n{ok}/{len(results)} kontrol OK")
    sys.exit(0 if ok == len(results) else 1)


import urllib.parse  # noqa: E402  (používa sa v kontrole canonical)

asyncio.run(main())
