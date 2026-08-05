"""
E2E test: OpenGraph a Twitter Card meta tagy na stránkach detailu servera.

Pre každý profil `/server/:slug` overuje, že vygenerované social meta tagy majú
správne hodnoty odvodené z reálneho obsahu profilu:

 1. `og:title`, `og:description`, `og:type`, `og:url`, `og:site_name`, `og:locale`
    existujú práve raz a nie sú prázdne,
 2. `og:title` == `<title>` a obsahuje názov servera z `<h1>`,
 3. `og:description` == `meta[name=description]`, má 50–200 znakov a nie je
    orezaná uprostred (žiadne `undefined`/`null`),
 4. `og:type` je `article` a `og:url` je absolútna https URL self-referencujúca
    na cestu profilu (zhoda s `<link rel=canonical>`),
 5. `og:image` je absolútna https URL, vracia HTTP 200 s `Content-Type: image/*`
    a reálne sa dekóduje v prehliadači; ak má server nahraté fotky, `og:image`
    je prvá z nich,
 6. `og:image:alt` je vyplnený a obsahuje názov servera,
 7. `twitter:card` == `summary_large_image`, `twitter:title`/`twitter:description`
    /`twitter:image`/`twitter:image:alt` sedia s OG variantmi,
 8. `article:published_time` a `article:modified_time` sú validné ISO dátumy,
 9. po klientskej navigácii (SPA prechod z výpisu na profil) sú v `<head>`
    stále len jedny (aktuálne) OG tagy — žiadne duplicity zo statického HTML.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/og_server_detail_e2e.py
    E2E_MAX_SERVERS=5 python3 e2e/og_server_detail_e2e.py
"""
import asyncio
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime
from urllib.parse import urlparse

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
MAX_SERVERS = int(os.environ.get("E2E_MAX_SERVERS", "5"))
MIN_DESC, MAX_DESC = 50, 200
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")

results = []
image_cache = {}


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def head_image(url):
    """Overí dostupnosť obrázka (status + content-type + veľkosť)."""
    if url in image_cache:
        return image_cache[url]
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read(4096)
            res = (r.status, r.headers.get("content-type", ""), len(body))
    except urllib.error.HTTPError as e:
        res = (e.code, "", 0)
    except Exception as e:
        res = (0, str(e), 0)
    image_cache[url] = res
    return res


def is_iso(value):
    if not value:
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
        return True
    except Exception:
        return False


async def read_meta(page):
    return await page.evaluate(
        """
        () => {
          const all = (sel, attr) => Array.from(document.querySelectorAll(sel))
            .map(el => el.getAttribute(attr) || '');
          const props = {};
          document.querySelectorAll('meta[property], meta[name]').forEach(el => {
            const key = el.getAttribute('property') || el.getAttribute('name');
            if (!key) return;
            (props[key] = props[key] || []).push(el.getAttribute('content') || '');
          });
          const h1 = document.querySelector('h1');
          return {
            title: document.title,
            props,
            canonical: all('link[rel="canonical"]', 'href'),
            h1: h1 ? h1.textContent.trim() : '',
          };
        }
        """
    )


def one(meta, key):
    vals = meta["props"].get(key, [])
    return vals[0] if vals else ""


async def audit_profile(page, path, label, expect_image=None):
    m = await read_meta(page)
    title = m["title"]
    og_title = one(m, "og:title")
    og_desc = one(m, "og:description")
    desc = one(m, "description")
    og_url = one(m, "og:url")
    og_img = one(m, "og:image")

    # 1) prítomnosť a jedinečnosť
    required = ["og:title", "og:description", "og:type", "og:url",
                "og:site_name", "og:locale", "og:image", "og:image:alt"]
    missing = [k for k in required if not one(m, k).strip()]
    check(f"[{label}] všetky OG tagy sú vyplnené", not missing, ", ".join(missing))

    dupes = [k for k in required + ["twitter:card", "twitter:title", "twitter:image"]
             if len(m["props"].get(k, [])) > 1]
    check(f"[{label}] žiadne duplicitné OG/Twitter tagy", not dupes, ", ".join(dupes))

    # 2) zhoda s obsahom stránky
    check(f"[{label}] og:title == <title>", og_title == title, f"{og_title!r} vs {title!r}")
    check(f"[{label}] og:title obsahuje názov servera z <h1>",
          bool(m["h1"]) and m["h1"].split("\n")[0][:40] in og_title,
          f"h1={m['h1']!r} og:title={og_title!r}")

    # 3) description
    check(f"[{label}] og:description == meta description", og_desc == desc,
          f"{og_desc[:60]!r} vs {desc[:60]!r}")
    check(f"[{label}] dĺžka og:description je {MIN_DESC}–{MAX_DESC} znakov",
          MIN_DESC <= len(og_desc) <= MAX_DESC, f"{len(og_desc)} znakov")
    check(f"[{label}] og:description neobsahuje undefined/null",
          not any(x in og_desc.lower() for x in ("undefined", "null", "nan")), og_desc[:80])

    # 4) typ a self-referencing URL
    check(f"[{label}] og:type je article", one(m, "og:type") == "article", one(m, "og:type"))
    parsed = urlparse(og_url)
    check(f"[{label}] og:url je absolútna https URL", parsed.scheme == "https" and parsed.netloc, og_url)
    check(f"[{label}] og:url ukazuje na tento profil", parsed.path.rstrip("/") == path.rstrip("/"),
          f"{parsed.path} vs {path}")
    check(f"[{label}] og:url == canonical",
          len(m["canonical"]) == 1 and m["canonical"][0] == og_url,
          f"{m['canonical']} vs {og_url}")

    # 5) obrázok
    ip = urlparse(og_img)
    check(f"[{label}] og:image je absolútna https URL", ip.scheme == "https" and ip.netloc, og_img)
    status, ctype, size = head_image(og_img) if ip.scheme == "https" else (0, "", 0)
    check(f"[{label}] og:image vracia 200 s image/* obsahom",
          status == 200 and ctype.split(";")[0].startswith("image/") and size > 0,
          f"{status} {ctype} {size}B")
    decoded = await page.evaluate(
        """(src) => new Promise(res => {
             const i = new Image();
             i.onload = () => res(i.naturalWidth > 0);
             i.onerror = () => res(false);
             i.src = src;
           })""",
        og_img,
    )
    check(f"[{label}] og:image sa dekóduje v prehliadači", decoded, og_img[:90])
    if expect_image:
        check(f"[{label}] og:image je prvá fotka servera", og_img == expect_image,
              f"{og_img[:70]} vs {expect_image[:70]}")

    # 6) alt text
    alt = one(m, "og:image:alt")
    check(f"[{label}] og:image:alt obsahuje názov servera",
          bool(m["h1"]) and m["h1"].split("\n")[0][:40] in alt, f"{alt!r}")

    # 7) Twitter Card
    check(f"[{label}] twitter:card je summary_large_image",
          one(m, "twitter:card") == "summary_large_image", one(m, "twitter:card"))
    check(f"[{label}] twitter:title == og:title", one(m, "twitter:title") == og_title)
    check(f"[{label}] twitter:description == og:description",
          one(m, "twitter:description") == og_desc)
    check(f"[{label}] twitter:image == og:image", one(m, "twitter:image") == og_img)
    check(f"[{label}] twitter:image:alt == og:image:alt", one(m, "twitter:image:alt") == alt)

    # 8) článkové dátumy
    pub, mod = one(m, "article:published_time"), one(m, "article:modified_time")
    check(f"[{label}] article:published_time je ISO dátum", is_iso(pub), pub)
    check(f"[{label}] article:modified_time je ISO dátum", is_iso(mod), mod)

    return og_title, og_url


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        await page.goto(BASE + "/servers", wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        hrefs = await page.eval_on_selector_all(
            'a[href^="/server/"]',
            "els => Array.from(new Set(els.map(e => e.getAttribute('href'))))",
        )
        hrefs = [h for h in hrefs if h and h.count("/") == 2 and not h.endswith("/edit")][:MAX_SERVERS]
        check("našli sa profily serverov", len(hrefs) > 0, f"{len(hrefs)} profilov")
        if not hrefs:
            await browser.close()
            sys.exit(1)

        for href in hrefs:
            await page.goto(BASE + href, wait_until="domcontentloaded")
            await page.wait_for_timeout(2500)
            first_img = await page.evaluate(
                """() => {
                     const el = document.querySelector('main img');
                     return el ? el.currentSrc || el.src : null;
                   }"""
            )
            expect = first_img if first_img and first_img.startswith("https://") else None
            await audit_profile(page, href, f"profil {href.rsplit('/', 1)[-1]}", expect)

        # 9) SPA navigácia — po klientskom prechode nesmú ostať staré tagy
        await page.goto(BASE + "/servers", wait_until="domcontentloaded")
        await page.wait_for_timeout(2500)
        await page.click(f'a[href="{hrefs[0]}"]')
        await page.wait_for_timeout(2500)
        m = await read_meta(page)
        check("SPA navigácia: práve jeden og:title",
              len(m["props"].get("og:title", [])) == 1, str(m["props"].get("og:title")))
        check("SPA navigácia: og:url sedí s aktuálnou cestou",
              urlparse(one(m, "og:url")).path.rstrip("/") == hrefs[0].rstrip("/"),
              one(m, "og:url"))

        await browser.close()

    ok = sum(1 for _, o, _ in results if o)
    print(f"\n{ok}/{len(results)} kontrol OK")
    sys.exit(0 if ok == len(results) else 1)


asyncio.run(main())
