"""
End-to-end test: obrázky a GIF odkazy na profiloch serverov/inzerátov.

Overuje, že každý obrázok uvedený na profile:
 1. vráti v prehliadači HTTP 200 (žiadne 404/403/5xx, žiadne zlyhané requesty),
 2. má správny `content-type` typu `image/*`,
 3. sa reálne dekóduje a zobrazí v preview (`complete === true` a `naturalWidth > 0`),
 4. nie je skrytý (nenulová veľkosť v layoute) a nemá prázdne `src`,
 5. má vyplnený `alt` atribút (a11y/SEO),
 6. GIF súbory sa načítajú rovnako ako statické obrázky (animácia nesmie
    spôsobiť nedokončený `decode`).

Testuje sa hlavná stránka, /staff a niekoľko profilov serverov (`/server/:slug`),
ktoré sa zoberú priamo z odkazov na výpise.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/profile_images_e2e.py
"""
import asyncio, json, os, sys, time
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)
MAX_PROFILES = int(os.environ.get("E2E_MAX_PROFILES", "5"))

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def is_image_request(url: str, resource_type: str) -> bool:
    if resource_type == "image":
        return True
    path = urlparse(url).path.lower()
    return path.endswith(
        (".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".ico", ".bmp")
    )


async def restore_session(context, page):
    cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")
    if cookies_json:
        cookies = json.loads(cookies_json)
        for c in cookies:
            c["url"] = BASE
        await context.add_cookies(cookies)
    await page.goto(BASE, wait_until="domcontentloaded")
    key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    sess = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    if key and sess:
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(key)}, {json.dumps(sess)})"
        )


async def collect_dom_images(page):
    """Stav <img> elementov po vyrenderovaní (vrátane CSS background obrázkov)."""
    return await page.evaluate(
        """
        () => {
          const imgs = Array.from(document.querySelectorAll('img')).map(el => {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            return {
              src: el.currentSrc || el.src || '',
              alt: el.getAttribute('alt'),
              complete: el.complete,
              naturalWidth: el.naturalWidth,
              naturalHeight: el.naturalHeight,
              width: r.width,
              height: r.height,
              hidden: cs.display === 'none' || cs.visibility === 'hidden',
              loading: el.getAttribute('loading'),
            };
          });
          const bgs = Array.from(document.querySelectorAll('*'))
            .map(el => getComputedStyle(el).backgroundImage)
            .filter(v => v && v !== 'none' && v.includes('url('))
            .map(v => (v.match(/url\\(["']?([^"')]+)["']?\\)/) || [])[1])
            .filter(Boolean);
          return { imgs, bgs: Array.from(new Set(bgs)) };
        }
        """
    )


async def audit_page(page, url, label, net):
    net.clear()
    await page.goto(url, wait_until="networkidle")
    # doťahanie lazy-loaded obrázkov
    await page.evaluate(
        "async () => { for (let y = 0; y < document.body.scrollHeight; y += 600)"
        " { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }"
        " window.scrollTo(0, 0); }"
    )
    await page.wait_for_timeout(1200)
    try:
        await page.wait_for_load_state("networkidle", timeout=8000)
    except Exception:
        pass

    data = await collect_dom_images(page)
    imgs = [i for i in data["imgs"] if not i["hidden"]]

    # 1) sieťové odpovede
    bad_status = [r for r in net if r["status"] >= 400]
    check(f"[{label}] žiadny obrázok nevracia 4xx/5xx", not bad_status,
          "; ".join(f"{r['status']} {r['url']}" for r in bad_status[:5]))

    failed = [r for r in net if r.get("failed")]
    check(f"[{label}] žiadny obrázkový request nezlyhal", not failed,
          "; ".join(f"{r['url']} ({r.get('error')})" for r in failed[:5]))

    wrong_ct = [
        r for r in net
        if r["status"] == 200 and r.get("content_type")
        and not r["content_type"].split(";")[0].strip().startswith("image/")
    ]
    check(f"[{label}] obrázky majú content-type image/*", not wrong_ct,
          "; ".join(f"{r['content_type']} {r['url']}" for r in wrong_ct[:5]))

    # 2) skutočné vykreslenie v preview
    empty_src = [i for i in imgs if not i["src"] or i["src"].endswith("undefined")]
    check(f"[{label}] žiadny <img> nemá prázdny src", not empty_src,
          "; ".join(str(i["alt"]) for i in empty_src[:5]))

    broken = [i for i in imgs if not i["complete"] or i["naturalWidth"] == 0]
    check(f"[{label}] všetky viditeľné <img> sa dekódovali", not broken,
          "; ".join(i["src"][:90] for i in broken[:5]))

    zero_box = [i for i in imgs if i["width"] == 0 or i["height"] == 0]
    check(f"[{label}] všetky obrázky majú nenulovú veľkosť v layoute", not zero_box,
          "; ".join(i["src"][:90] for i in zero_box[:5]))

    no_alt = [i for i in imgs if i["alt"] is None or i["alt"].strip() == ""]
    check(f"[{label}] obrázky majú alt atribút", not no_alt,
          "; ".join(i["src"][:90] for i in no_alt[:5]))

    # 3) GIFy zvlášť (animované súbory musia byť tiež kompletné)
    gifs = [i for i in imgs if ".gif" in i["src"].lower()]
    broken_gifs = [i for i in gifs if not i["complete"] or i["naturalWidth"] == 0]
    check(f"[{label}] GIF odkazy sa načítali ({len(gifs)} ks)", not broken_gifs,
          "; ".join(i["src"][:90] for i in broken_gifs[:5]))

    # 4) CSS background obrázky
    bg_urls = [u for u in data["bgs"] if u.startswith("http")]
    bad_bg = [
        r for r in net
        if r["status"] >= 400 and any(r["url"] == u for u in bg_urls)
    ]
    check(f"[{label}] background obrázky vracajú 200", not bad_bg,
          "; ".join(r["url"] for r in bad_bg[:5]))

    shot = SHOTS / f"images_{label.replace('/', '_').replace(' ', '_')}.png"
    await page.screenshot(path=str(shot))
    print(f"  → {len(imgs)} viditeľných obrázkov, {len(net)} image requestov, screenshot: {shot.name}")


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        net = []

        def on_response(resp):
            try:
                if is_image_request(resp.url, resp.request.resource_type):
                    net.append({
                        "url": resp.url,
                        "status": resp.status,
                        "content_type": resp.headers.get("content-type", ""),
                    })
            except Exception:
                pass

        def on_failed(req):
            try:
                if is_image_request(req.url, req.resource_type):
                    net.append({
                        "url": req.url, "status": 0, "failed": True,
                        "error": (req.failure or ""), "content_type": "",
                    })
            except Exception:
                pass

        page.on("response", on_response)
        page.on("requestfailed", on_failed)

        await restore_session(context, page)

        # zoznam profilov z výpisu serverov
        await page.goto(BASE, wait_until="networkidle")
        await page.wait_for_timeout(1500)
        slugs = await page.eval_on_selector_all(
            'a[href^="/server/"]',
            "els => Array.from(new Set(els.map(e => e.getAttribute('href'))))",
        )
        slugs = [s for s in slugs if s and s.count("/") == 2][:MAX_PROFILES]
        check("našli sa profily serverov na výpise", len(slugs) > 0, f"{len(slugs)} profilov")

        await audit_page(page, BASE + "/", "domov", net)
        await audit_page(page, BASE + "/staff", "staff", net)
        for s in slugs:
            await audit_page(page, BASE + s, f"profil {s.rsplit('/', 1)[-1]}", net)

        await browser.close()

    ok = sum(1 for _, o, _ in results if o)
    print(f"\n{ok}/{len(results)} kontrol OK")
    sys.exit(0 if ok == len(results) else 1)


asyncio.run(main())
