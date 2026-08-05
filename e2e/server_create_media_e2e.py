"""
End-to-end test: vytvorenie servera + validácia + nahrávanie fotiek/GIFov + lajkovanie.

Overuje:
 1. Neprihlásený používateľ nemôže odoslať formulár (tlačidlo je disabled, výzva na login).
 2. Po prihlásení sa formulár dá použiť a klientská validácia blokuje prázdne povinné polia.
 3. Nahrávanie obrázka (PNG -> WebP konverzia) a GIFu (zostáva GIF) do storage,
    náhľady sa reálne zobrazia (naturalWidth > 0).
 4. Uloženie servera prejde a presmeruje na výpis; server je dohľadateľný.
 5. Na profile servera sa nahraté médiá načítajú (HTTP 200, image/*).
 6. Lajkovanie funguje: počet sa zvýši, po opätovnom kliknutí zníži (perzistentné po reloade).
 7. Upratanie: testovací server sa na konci vymaže.

Spustenie (dev server na http://localhost:8080, prihlásená session v env):
    python3 e2e/server_create_media_e2e.py
"""
import asyncio, json, os, sys, time, base64
from pathlib import Path

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)
TMP = Path("/tmp/browser/server_create_media")
TMP.mkdir(parents=True, exist_ok=True)

STAMP = str(int(time.time()))
SERVER_NAME = f"E2E Test {STAMP}"
SERVER_IP = f"e2e{STAMP}.test.local"

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def make_fixtures():
    """Vytvorí malý PNG a animovaný GIF ako testovacie prílohy."""
    png = TMP / "shot.png"
    gif = TMP / "anim.gif"
    if not png.exists():
        from PIL import Image
        Image.new("RGB", (640, 360), (180, 30, 40)).save(png)
    if not gif.exists():
        from PIL import Image
        frames = [Image.new("P", (120, 120), i) for i in (1, 2, 3)]
        frames[0].save(gif, save_all=True, append_images=frames[1:], duration=120, loop=0)
    return png, gif


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
        return True
    return False


async def fill_form(page, name, ip, description):
    await page.fill('input[placeholder="MôjServer"]', name)
    await page.fill('input[placeholder="play.mojserver.sk"]', ip)
    await page.fill('textarea[placeholder="Opíš svoj server..."]', description)


async def main():
    png, gif = make_fixtures()

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)

        # ---------- 1) anonymný používateľ ----------
        anon = await browser.new_context(viewport={"width": 1280, "height": 1800})
        apage = await anon.new_page()
        await apage.goto(BASE + "/add-server", wait_until="networkidle")
        await apage.wait_for_timeout(800)
        submit = apage.locator('form button[type="submit"]')
        check("neprihlásený: tlačidlo Pridať je zakázané", await submit.is_disabled())
        body = (await apage.inner_text("main")).lower()
        check("neprihlásený: zobrazí sa výzva na prihlásenie",
              "prihlás" in body or "login" in body or "sign in" in body)
        await apage.screenshot(path=str(SHOTS / "create_anon.png"))
        await anon.close()

        # ---------- prihlásený kontext ----------
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        net = []
        page.on("response", lambda r: net.append(
            {"url": r.url, "status": r.status, "ct": r.headers.get("content-type", "")}
        ))
        console_errors = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)

        signed = await restore_session(context, page)
        check("session bola obnovená", signed,
              os.environ.get("LOVABLE_BROWSER_AUTH_STATUS", "unknown"))
        if not signed:
            await browser.close()
            print("\nBEZ PRIHLÁSENIA – ďalšie kroky nie je možné overiť")
            sys.exit(1)

        await page.goto(BASE + "/add-server", wait_until="networkidle")
        await page.wait_for_timeout(1200)
        submit = page.locator('form button[type="submit"]')
        check("prihlásený: tlačidlo Pridať je aktívne", not await submit.is_disabled())

        # ---------- 2) validácia povinných polí ----------
        await submit.click()
        await page.wait_for_timeout(800)
        check("validácia: prázdny formulár neuloží a zostane na /add-server",
              "/add-server" in page.url)
        invalid = await page.evaluate(
            "() => document.querySelectorAll('form :invalid').length"
        )
        check("validácia: povinné polia sú označené ako neplatné", invalid > 0, f"{invalid} polí")

        # neplatná URL v sociálnych sieťach
        await fill_form(page, SERVER_NAME, SERVER_IP, "E2E automatizovaný test zápisu servera.")
        await page.fill('input[placeholder="https://discord.gg/..."]', "javascript:alert(1)")
        await submit.click()
        await page.wait_for_timeout(700)
        check("validácia: nebezpečná URL nespôsobí uloženie", "/add-server" in page.url)
        await page.fill('input[placeholder="https://discord.gg/..."]', "")

        # ---------- 3) nahrávanie fotky + GIFu ----------
        upload_start = len(net)
        async with page.expect_file_chooser() as fc:
            await page.click("text=" + (await page.inner_text("text=/Formáty|Formats|PNG|JPG/i")).split("\n")[0]
                             if False else 'input[type="file"] + *, div:has(> input[type="file"])')
            chooser = await fc.value
        await chooser.set_files([str(png), str(gif)])
        await page.wait_for_timeout(6000)

        previews = await page.evaluate(
            """() => Array.from(document.querySelectorAll('form img')).map(i => ({
                 src: i.currentSrc || i.src, w: i.naturalWidth, complete: i.complete }))"""
        )
        check("nahrané 2 náhľady médií (foto + GIF)", len(previews) >= 2, f"{len(previews)}")
        check("všetky náhľady sa dekódovali",
              all(p["complete"] and p["w"] > 0 for p in previews),
              "; ".join(p["src"][:80] for p in previews if p["w"] == 0))
        check("GIF ostal GIF (bez konverzie)",
              any(".gif" in p["src"].lower() for p in previews),
              "; ".join(p["src"].rsplit("/", 1)[-1] for p in previews))
        check("statická fotka bola skonvertovaná na WebP",
              any(".webp" in p["src"].lower() for p in previews))

        upload_calls = [r for r in net[upload_start:]
                        if "/storage/v1/object/" in r["url"] and "server-images" in r["url"]]
        failed_uploads = [r for r in upload_calls if r["status"] >= 400]
        check("uploady do storage prešli bez chyby", not failed_uploads,
              "; ".join(f"{r['status']} {r['url'][:80]}" for r in failed_uploads[:3]))

        await page.screenshot(path=str(SHOTS / "create_filled.png"))

        # ---------- 4) uloženie ----------
        await submit.click()
        try:
            await page.wait_for_url("**/servers", timeout=20000)
            saved = True
        except Exception:
            saved = False
        check("server sa uložil a nastalo presmerovanie na /servers", saved, page.url)

        # nájdenie profilu podľa mena
        await page.goto(BASE + f"/servers?q={SERVER_NAME.replace(' ', '+')}", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        href = await page.evaluate(
            """(nm) => {
                 const a = Array.from(document.querySelectorAll('a[href^="/server/"]'))
                   .find(e => e.textContent.includes(nm));
                 return a ? a.getAttribute('href') : null; }""",
            SERVER_NAME,
        )
        check("nový server je vo výpise a má profilový odkaz", bool(href), str(href))

        if href:
            net.clear()
            await page.goto(BASE + href, wait_until="networkidle")
            await page.wait_for_timeout(2500)

            # ---------- 5) médiá na profile ----------
            imgs = await page.evaluate(
                """() => Array.from(document.querySelectorAll('img'))
                     .map(i => ({ src: i.currentSrc || i.src, w: i.naturalWidth, c: i.complete }))
                     .filter(i => i.src.includes('server-images'))"""
            )
            check("nahraté médiá sú na profile servera", len(imgs) >= 2, f"{len(imgs)}")
            check("médiá na profile sa načítali (naturalWidth > 0)",
                  imgs and all(i["c"] and i["w"] > 0 for i in imgs),
                  "; ".join(i["src"][:80] for i in imgs if i["w"] == 0))
            media_resp = [r for r in net if "server-images" in r["url"]]
            check("médiá vracajú HTTP 200 a content-type image/*",
                  media_resp and all(r["status"] == 200 and r["ct"].startswith("image/")
                                     for r in media_resp),
                  "; ".join(f"{r['status']} {r['ct']}" for r in media_resp[:3]))

            # ---------- 6) lajkovanie ----------
            like = page.locator('[data-testid="server-like"]')
            check("lajkovacie tlačidlo je dostupné", await like.count() == 1)
            before = int((await like.inner_text()).strip() or "0")
            await like.click()
            await page.wait_for_timeout(1800)
            after = int((await like.inner_text()).strip() or "0")
            check("lajk zvýšil počet o 1", after == before + 1, f"{before} -> {after}")
            check("lajk je vizuálne aktívny (aria-pressed)",
                  await like.get_attribute("aria-pressed") == "true")

            await page.reload(wait_until="networkidle")
            await page.wait_for_timeout(2500)
            like = page.locator('[data-testid="server-like"]')
            persisted = int((await like.inner_text()).strip() or "0")
            check("lajk je perzistentný po obnovení stránky", persisted == after,
                  f"{after} -> {persisted}")

            await like.click()
            await page.wait_for_timeout(1800)
            unliked = int((await like.inner_text()).strip() or "0")
            check("odlajkovanie zníži počet späť", unliked == before, f"{persisted} -> {unliked}")

            await page.screenshot(path=str(SHOTS / "create_profile.png"))

            # ---------- 7) upratanie ----------
            page.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
            deleted = await page.evaluate(
                """async (ip) => {
                     const mod = await import('/src/integrations/supabase/client.ts');
                     const { error } = await mod.supabase.from('servers').delete().eq('ip', ip);
                     return error ? error.message : 'ok'; }""",
                SERVER_IP,
            )
            check("testovací server bol vymazaný", deleted == "ok", str(deleted))

        fatal = [e for e in console_errors if "Failed to load resource" not in e]
        check("žiadne fatálne chyby v konzole", not fatal, "; ".join(fatal[:3]))

        await browser.close()

    ok = sum(1 for _, o, _ in results if o)
    print(f"\n{ok}/{len(results)} kontrol OK")
    sys.exit(0 if ok == len(results) else 1)


asyncio.run(main())
