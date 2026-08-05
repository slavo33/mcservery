"""
End-to-end test: vytvorenie servera s verziou 26.2, zobrazenie na profile a filtre.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/version_26_2_e2e.py

Prihlásenie sa obnoví zo Supabase session v premenných prostredia
(LOVABLE_BROWSER_SUPABASE_STORAGE_KEY / _SESSION_JSON / _COOKIES_JSON).
"""
import asyncio, json, os, sys, time
from pathlib import Path
from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

STAMP = str(int(time.time()))
SERVER_NAME = f"E2E NextGen {STAMP}"
SERVER_IP = f"e2e{STAMP}.example.com"
VERSION = "26.2"

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

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        await restore_session(context, page)

        # ---- 1) Vytvorenie servera s verziou 26.2 ----
        await page.goto(f"{BASE}/add-server", wait_until="domcontentloaded")
        text_inputs = page.locator("form input[type=text]")
        await text_inputs.nth(0).fill(SERVER_NAME)
        await text_inputs.nth(1).fill(SERVER_IP)
        await page.locator("form textarea").first.fill(
            "E2E test server pre overenie next-gen verzie 26.2."
        )
        version_select = page.locator("form select").first
        await version_select.select_option(VERSION)
        check("formulár akceptuje verziu 26.2", await version_select.input_value() == VERSION)

        # nekompatibilné voľby nesmú byť ponúknuté
        bedrock = page.get_by_role("button", name="Bedrock")
        check("Bedrock nie je ponúknutý pri 26.2", await bedrock.count() == 0)
        await page.get_by_role("button", name="Java").first.click()

        await page.screenshot(path=str(SHOTS / "1_form.png"))
        await page.get_by_role("button", name="Java").first.wait_for()
        await page.locator("form button[type=submit]").first.click()
        await page.wait_for_url(lambda u: "/add-server" not in u, timeout=20000)
        check("server bol vytvorený (redirect z formulára)", "/add-server" not in page.url, page.url)

        # ---- 2) Profil servera zobrazuje v26.2 ----
        await page.goto(f"{BASE}/servers", wait_until="domcontentloaded")
        await page.get_by_text(SERVER_NAME, exact=False).first.wait_for(timeout=30000)
        await page.get_by_text(SERVER_NAME, exact=False).first.click()
        await page.wait_for_timeout(2500)
        body = await page.locator("body").inner_text()
        check("profil servera zobrazuje odznak v26.2", "v26.2" in body)
        title = await page.title()
        check("SEO title obsahuje verziu", "26.2" in title, title)
        await page.screenshot(path=str(SHOTS / "2_profile.png"))
        detail_url = page.url

        # ---- 3) Filtre podľa verzie (chipy) ----
        await page.goto(f"{BASE}/servers", wait_until="domcontentloaded")
        await page.get_by_text(SERVER_NAME, exact=False).first.wait_for(timeout=30000)

        chip = page.get_by_role("button", name=VERSION, exact=True).first
        if await chip.count() == 0:
            # filtre môžu byť skryté za prepínačom
            toggle = page.get_by_role("button", name=lambda n: "iltr" in (n or "")).first
            if await toggle.count():
                await toggle.click()
            chip = page.get_by_role("button", name=VERSION, exact=True).first
        await chip.click()
        await page.wait_for_timeout(1000)
        listing = await page.locator("body").inner_text()
        check("filter 26.2 zobrazí náš server", SERVER_NAME in listing)
        await page.screenshot(path=str(SHOTS / "3_filter_2602.png"))

        await chip.click()  # zrušenie 26.2
        other = page.get_by_role("button", name="1.8.9", exact=True).first
        await other.click()
        await page.wait_for_timeout(1000)
        listing_other = await page.locator("body").inner_text()
        check("filter inej verzie náš server skryje", SERVER_NAME not in listing_other)
        await page.screenshot(path=str(SHOTS / "4_filter_other.png"))

        print("\nDETAIL URL:", detail_url)
        print("IP:", SERVER_IP)
        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} krokov OK")
    sys.exit(1 if failed else 0)

asyncio.run(main())
