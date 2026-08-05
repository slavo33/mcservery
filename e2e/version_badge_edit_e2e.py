"""
End-to-end test: VersionBadge po editácii verzie.

Scenár:
 1. Vytvorí server s verziou 26.2.
 2. Overí odznak `v26.2` na karte v zozname aj na profile (+ screenshoty odznaku).
 3. Zmení verziu cez editáciu na 1.20.4.
 4. Overí, že odznak sa aktualizoval na `v1.20.4` na profile aj na karte
    a že starý `v26.2` sa už nikde nezobrazuje.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/version_badge_edit_e2e.py
"""
import asyncio, json, os, sys, time
from pathlib import Path
from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

STAMP = str(int(time.time()))
SERVER_NAME = f"E2E Badge {STAMP}"
SERVER_IP = f"badge{STAMP}.example.com"
VERSION_A = "26.2"
VERSION_B = "1.20.4"

results = []
def check(label, ok, extra=""):
    results.append((label, ok, extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + extra) if extra else ""))


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


async def open_detail(page):
    await page.goto(f"{BASE}/servers", wait_until="domcontentloaded")
    await page.get_by_text(SERVER_NAME, exact=False).first.wait_for(timeout=30000)
    await page.get_by_text(SERVER_NAME, exact=False).first.click()
    await page.wait_for_timeout(2500)


async def badge_on_card(page, version):
    """Vráti (nájdený, screenshot_ok) pre odznak na karte v zozname."""
    await page.goto(f"{BASE}/servers", wait_until="domcontentloaded")
    card = page.get_by_text(SERVER_NAME, exact=False).first
    await card.wait_for(timeout=30000)
    badge = page.get_by_label(f"Verzia v{version}").first
    found = await badge.count() > 0
    if found:
        await badge.screenshot(path=str(SHOTS / f"badge_card_v{version}.png"))
    return found


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        await restore_session(context, page)

        # ---- 1) Vytvorenie servera s 26.2 ----
        await page.goto(f"{BASE}/add-server", wait_until="domcontentloaded")
        text_inputs = page.locator("form input[type=text]")
        await text_inputs.nth(0).fill(SERVER_NAME)
        await text_inputs.nth(1).fill(SERVER_IP)
        await page.locator("form textarea").first.fill(
            "E2E test odznaku verzie po editácii."
        )
        await page.locator("form select").first.select_option(VERSION_A)
        await page.get_by_role("button", name="Java").first.click()
        await page.locator("form button[type=submit]").first.click()
        await page.wait_for_url(lambda u: "/add-server" not in u, timeout=20000)
        check("server s 26.2 bol vytvorený", "/add-server" not in page.url, page.url)

        # ---- 2) Odznak pred editáciou ----
        check(f"karta zobrazuje odznak v{VERSION_A}", await badge_on_card(page, VERSION_A))

        await open_detail(page)
        detail_url = page.url
        profile_badge = page.get_by_label(f"Filtrovať servery podľa verzie v{VERSION_A}").first
        ok = await profile_badge.count() > 0
        check(f"profil zobrazuje odznak v{VERSION_A}", ok)
        if ok:
            await profile_badge.screenshot(path=str(SHOTS / f"badge_profile_v{VERSION_A}.png"))
            href = await profile_badge.get_attribute("href")
            check("odznak na profile odkazuje na filter", (href or "").endswith(f"version={VERSION_A}"), href or "")

        # mobilné zobrazenie – odznak nesmie zalamovať
        await page.set_viewport_size({"width": 375, "height": 812})
        await page.wait_for_timeout(600)
        box = await profile_badge.bounding_box()
        check("odznak na mobile je na jednom riadku", bool(box) and box["height"] < 40, str(box))
        await page.screenshot(path=str(SHOTS / "badge_profile_mobile.png"))
        await page.set_viewport_size({"width": 1280, "height": 1800})

        # ---- 3) Editácia verzie na 1.20.4 ----
        edit_url = detail_url.replace("/server/", "/edit-server/")
        await page.goto(edit_url, wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)
        if "edit" not in page.url:
            # fallback – tlačidlo Upraviť na profile
            await page.goto(detail_url, wait_until="domcontentloaded")
            await page.get_by_role("button", name=lambda n: "prav" in (n or "")).first.click()
            await page.wait_for_timeout(2000)
        select = page.locator("form select").first
        await select.select_option(VERSION_B)
        check("editácia akceptuje 1.20.4", await select.input_value() == VERSION_B)
        await page.locator("form button[type=submit]").first.click()
        await page.wait_for_timeout(3000)
        await page.screenshot(path=str(SHOTS / "badge_after_edit_form.png"))

        # ---- 4) Odznak po editácii ----
        await open_detail(page)
        body = await page.locator("body").inner_text()
        new_badge = page.get_by_label(f"Filtrovať servery podľa verzie v{VERSION_B}").first
        ok_new = await new_badge.count() > 0
        check(f"profil po editácii zobrazuje v{VERSION_B}", ok_new)
        if ok_new:
            await new_badge.screenshot(path=str(SHOTS / f"badge_profile_v{VERSION_B}.png"))
        check("starý odznak v26.2 sa už nezobrazuje", f"v{VERSION_A}" not in body)
        check("SEO title obsahuje novú verziu", VERSION_B in await page.title())

        check(f"karta po editácii zobrazuje v{VERSION_B}", await badge_on_card(page, VERSION_B))
        check("karta už nezobrazuje v26.2", not await badge_on_card(page, VERSION_A))

        print("\nDETAIL URL:", detail_url)
        print("IP:", SERVER_IP)
        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} krokov OK")
    sys.exit(1 if failed else 0)

asyncio.run(main())
