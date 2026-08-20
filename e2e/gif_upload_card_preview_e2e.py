"""
E2E test: **nahranie GIFu** vo formulári `/add-server` a jeho **náhľad na karte servera**.

Cieľom je zachytiť rozbité nahrávania (konverzia GIFu na statický WebP, 404 z
storage, zlý content-type, prázdny/nedekódovaný náhľad na karte).

Overuje:
 1. GIF sa nahrá bez konverzie — verejná URL končí na `.gif`, storage vracia
    HTTP 200 s `content-type: image/gif`.
 2. Nahratý súbor je stále **animovaný** (viac než 1 snímka v GIF dátach) a má
    rovnakú veľkosť ako originál (žiadne prekódovanie).
 3. Náhľad v formulári sa reálne dekóduje (`naturalWidth > 0`) a dá sa odstrániť.
 4. Príliš veľký súbor (> 10 MB) a nepodporovaný typ sú odmietnuté s hláškou.
 5. Po uložení servera je GIF prvým obrázkom, takže sa použije ako **náhľad karty**
    vo výpise `/servers` aj na domovskej stránke — obrázok karty sa načíta
    (HTTP 200, `naturalWidth > 0`, vyplní kartu bez nulových rozmerov)
    na mobile aj desktope.
 6. Upratanie: testovací server sa vymaže.

Spustenie (dev server na http://localhost:8080, prihlásená session v env):
    python3 e2e/gif_upload_card_preview_e2e.py
"""
import asyncio
import json
import os
import sys
import time
from pathlib import Path

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)
TMP = Path("/tmp/browser/gif_upload_card")
TMP.mkdir(parents=True, exist_ok=True)

STAMP = str(int(time.time()))
SERVER_NAME = f"E2E GIF {STAMP}"
SERVER_IP = f"gif{STAMP}.test.local"

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def gif_frame_count(data: bytes) -> int:
    """Spočíta snímky v GIF dátach (počet image descriptorov 0x2C)."""
    from io import BytesIO
    from PIL import Image
    with Image.open(BytesIO(data)) as im:
        return getattr(im, "n_frames", 1)


def make_fixtures():
    from PIL import Image
    gif = TMP / "animated.gif"
    big = TMP / "too-big.gif"
    txt = TMP / "not-an-image.txt"
    if not gif.exists():
        frames = [Image.new("P", (320, 180), i * 40) for i in range(1, 5)]
        frames[0].save(gif, save_all=True, append_images=frames[1:], duration=100, loop=0)
    if not big.exists():
        big.write_bytes(gif.read_bytes() + b"\x00" * (11 * 1024 * 1024))
    if not txt.exists():
        txt.write_text("toto nie je obrazok")
    return gif, big, txt


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
        await page.evaluate(f"window.localStorage.setItem({json.dumps(key)}, {json.dumps(sess)})")
        return True
    return False


JS_FORM_PREVIEWS = """
() => Array.from(document.querySelectorAll('form img')).map(i => ({
  src: i.currentSrc || i.src, w: i.naturalWidth, h: i.naturalHeight, complete: i.complete
}))
"""

JS_CARD_IMG = """
(name) => {
  const link = Array.from(document.querySelectorAll('a[href^="/server/"]'))
    .find(a => (a.textContent || '').includes(name));
  if (!link) return null;
  const img = link.querySelector('img');
  if (!img) return { found: true, img: false };
  const r = img.getBoundingClientRect();
  return {
    found: true, img: true,
    src: img.currentSrc || img.src,
    w: img.naturalWidth, h: img.naturalHeight, complete: img.complete,
    boxW: Math.round(r.width), boxH: Math.round(r.height),
    alt: img.getAttribute('alt') || '',
    href: link.getAttribute('href'),
  };
}
"""


async def main():
    gif, big, txt = make_fixtures()
    original_bytes = gif.read_bytes()
    original_frames = gif_frame_count(original_bytes)
    check("fixture: testovací GIF je animovaný", original_frames > 1, f"{original_frames} snímok")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        net = []
        page.on("response", lambda r: net.append(
            {"url": r.url, "status": r.status, "ct": r.headers.get("content-type", "")}))
        console_errors = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)

        signed = await restore_session(context, page)
        check("session bola obnovená", signed, os.environ.get("LOVABLE_BROWSER_AUTH_STATUS", "unknown"))
        if not signed:
            await browser.close()
            print("\nBEZ PRIHLÁSENIA – test nie je možné dokončiť")
            sys.exit(1)

        await page.goto(BASE + "/add-server", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)

        # ---------- 1) odmietnutie nevalidných súborov ----------
        await page.set_input_files('input[type="file"]', [str(txt)])
        await page.wait_for_timeout(1500)
        toast = ""
        try:
            toast = await page.inner_text("[data-sonner-toast]", timeout=2500)
        except Exception:
            toast = ""
        check("nepodporovaný typ súboru je odmietnutý s hláškou",
              "obrázok" in toast.lower() or "image" in toast.lower(), toast[:120])
        check("po odmietnutí nevznikol žiadny náhľad",
              len(await page.evaluate(JS_FORM_PREVIEWS)) == 0)

        await page.set_input_files('input[type="file"]', [str(big)])
        await page.wait_for_timeout(2000)
        try:
            toast = await page.inner_text("[data-sonner-toast]", timeout=2500)
        except Exception:
            toast = ""
        check("súbor nad 10 MB je odmietnutý s hláškou",
              "veľký" in toast.lower() or "10mb" in toast.lower().replace(" ", ""), toast[:120])

        # ---------- 2) nahranie GIFu ----------
        upload_start = len(net)
        await page.set_input_files('input[type="file"]', [str(gif)])
        await page.wait_for_timeout(6000)

        previews = await page.evaluate(JS_FORM_PREVIEWS)
        check("GIF vytvoril presne jeden náhľad", len(previews) == 1, str(len(previews)))
        if not previews:
            await browser.close()
            sys.exit(1)
        gif_url = previews[0]["src"]
        check("náhľad používa .gif URL (bez konverzie na WebP)",
              gif_url.lower().split("?")[0].endswith(".gif"), gif_url[:120])
        check("náhľad sa dekódoval (naturalWidth > 0)",
              previews[0]["complete"] and previews[0]["w"] > 0,
              f"{previews[0]['w']}x{previews[0]['h']}")

        uploads = [r for r in net[upload_start:]
                   if "/storage/v1/object/" in r["url"] and "server-images" in r["url"]]
        failed = [r for r in uploads if r["status"] >= 400]
        check("upload GIFu do storage prešiel", uploads and not failed,
              "; ".join(f"{r['status']} {r['url'][:70]}" for r in (failed or uploads)[:2]))

        # ---------- 3) obsah v storage je stále animovaný GIF ----------
        head = await page.evaluate(
            """async (url) => {
                 const r = await fetch(url, { cache: 'no-store' });
                 const buf = new Uint8Array(await r.arrayBuffer());
                 return { status: r.status, ct: r.headers.get('content-type') || '',
                          size: buf.length, bytes: Array.from(buf.slice(0, 6)),
                          b64: btoa(String.fromCharCode(...buf.slice(0, 200000))) }; }""",
            gif_url,
        )
        check("GIF v storage vracia HTTP 200", head["status"] == 200, str(head["status"]))
        check("content-type je image/gif", head["ct"].startswith("image/gif"), head["ct"])
        check("súbor začína GIF hlavičkou", bytes(head["bytes"]).startswith(b"GIF8"),
              str(head["bytes"]))
        check("veľkosť súboru zodpovedá originálu (bez prekódovania)",
              head["size"] == len(original_bytes), f"{head['size']} vs {len(original_bytes)}")
        import base64
        frames = gif_frame_count(base64.b64decode(head["b64"]))
        check("nahratý GIF ostal animovaný", frames == original_frames,
              f"{frames} vs {original_frames}")

        # ---------- 4) odstránenie a opätovné nahranie ----------
        remove_btn = page.locator('form button[aria-label*="odstrániť"]').first
        await remove_btn.click(force=True)
        await page.wait_for_timeout(600)
        check("náhľad sa dá odstrániť", len(await page.evaluate(JS_FORM_PREVIEWS)) == 0)
        await page.set_input_files('input[type="file"]', [str(gif)])
        await page.wait_for_timeout(6000)
        previews = await page.evaluate(JS_FORM_PREVIEWS)
        check("GIF sa dá nahrať znova", len(previews) == 1, str(len(previews)))
        gif_url = previews[0]["src"] if previews else gif_url

        # ---------- 5) uloženie servera ----------
        await page.fill('input[placeholder="MôjServer"]', SERVER_NAME)
        await page.fill('input[placeholder="play.mojserver.sk"]', SERVER_IP)
        await page.fill('textarea[placeholder="Opíš svoj server..."]',
                        "E2E test GIF náhľadu na karte servera.")
        await page.select_option("#add-version", label="1.21.4")
        await page.click('button.filter-chip:has-text("Java")')
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(SHOTS / "gif_form.png"))

        await page.locator('form button[type="submit"]').click()
        try:
            await page.wait_for_url("**/servers", timeout=20000)
            saved = True
        except Exception:
            saved = False
        check("server s GIFom sa uložil", saved, page.url)

        # ---------- 6) náhľad na karte servera ----------
        card_ok = False
        href = None
        if saved:
            for vp_name, w, h in (("desktop", 1280, 1800), ("mobil", 390, 900)):
                await page.set_viewport_size({"width": w, "height": h})
                net.clear()
                await page.goto(BASE + f"/servers?q={SERVER_NAME.replace(' ', '+')}",
                                wait_until="domcontentloaded")
                await page.wait_for_timeout(4000)
                card = await page.evaluate(JS_CARD_IMG, SERVER_NAME)
                if not check(f"[{vp_name}] karta servera je vo výpise", bool(card and card.get("found"))):
                    continue
                href = card.get("href") or href
                check(f"[{vp_name}] karta má obrázok", card.get("img") is True)
                check(f"[{vp_name}] karta používa nahraný GIF",
                      card.get("src", "").split("?")[0].endswith(".gif"), str(card.get("src"))[:110])
                check(f"[{vp_name}] náhľad karty sa načítal (naturalWidth > 0)",
                      card.get("complete") and card.get("w", 0) > 0,
                      f"{card.get('w')}x{card.get('h')}")
                check(f"[{vp_name}] náhľad karty má nenulové rozmery v layoute",
                      card.get("boxW", 0) > 50 and card.get("boxH", 0) > 30,
                      f"{card.get('boxW')}x{card.get('boxH')}")
                check(f"[{vp_name}] náhľad karty má alt text", bool(card.get("alt")), str(card.get("alt")))
                media = [r for r in net if "server-images" in r["url"] and r["url"].split("?")[0].endswith(".gif")]
                check(f"[{vp_name}] GIF na karte vracia 200 a image/gif",
                      media and all(r["status"] == 200 and r["ct"].startswith("image/gif") for r in media),
                      "; ".join(f"{r['status']} {r['ct']}" for r in media[:2]) or "žiadna požiadavka")
                await page.screenshot(path=str(SHOTS / f"gif_card_{vp_name}.png"))
                card_ok = True

            # domovská stránka
            await page.set_viewport_size({"width": 1280, "height": 1800})
            await page.goto(BASE + "/", wait_until="domcontentloaded")
            await page.wait_for_timeout(4000)
            broken_home = await page.evaluate(
                """() => Array.from(document.querySelectorAll('a[href^="/server/"] img'))
                     .filter(i => i.complete && i.naturalWidth === 0)
                     .map(i => i.currentSrc || i.src)"""
            )
            check("na domovskej stránke nie sú rozbité náhľady kariet",
                  not broken_home, "; ".join(broken_home[:3]))

            # detail servera
            if href:
                net.clear()
                await page.goto(BASE + href, wait_until="domcontentloaded")
                await page.wait_for_timeout(3000)
                detail = await page.evaluate(
                    """() => Array.from(document.querySelectorAll('img'))
                         .filter(i => (i.currentSrc || i.src).split('?')[0].endsWith('.gif'))
                         .map(i => ({ w: i.naturalWidth, c: i.complete }))"""
                )
                check("GIF sa zobrazuje aj na detaile servera",
                      detail and all(d["c"] and d["w"] > 0 for d in detail), str(detail))

        # ---------- 7) upratanie ----------
        deleted = await page.evaluate(
            """async (ip) => {
                 const mod = await import('/src/integrations/supabase/client.ts');
                 const { error } = await mod.supabase.from('servers').delete().eq('ip', ip);
                 return error ? error.message : 'ok'; }""",
            SERVER_IP,
        )
        check("testovací server bol vymazaný", deleted == "ok", str(deleted))

        IGNORED = ("Failed to load resource", "Function components cannot be given refs")
        fatal = [e for e in console_errors if not any(i in e for i in IGNORED)]
        check("žiadne fatálne chyby v konzole", not fatal, "; ".join(fatal[:3]))

        await browser.close()

    ok = sum(1 for _, o, _ in results if o)
    print(f"\n{ok}/{len(results)} kontrol OK")
    if ok != len(results):
        for label, o, extra in results:
            if not o:
                print(f"  FAIL {label} :: {extra}")
    sys.exit(0 if ok == len(results) else 1)


asyncio.run(main())
