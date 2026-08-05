"""
End-to-end test: vytvorenie servera s verziou 26.2 a overenie odznaku verzie
na profile v desktop aj mobilnej šírke (375 px).

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/version_badge_mobile_e2e.py

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
SERVER_NAME = f"E2E Mobile {STAMP}"
SERVER_IP = f"e2emob{STAMP}.example.com"
VERSION = "26.2"
BADGE_LABEL = f"Filtrovať servery podľa verzie v{VERSION}"

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


async def badge_metrics(page):
    """Vráti (počet, box, štýly, text) odznaku verzie na aktuálnej stránke."""
    badge = page.get_by_label(BADGE_LABEL).first
    if await badge.count() == 0:
        return None
    box = await badge.bounding_box()
    styles = await badge.evaluate(
        "el => { const s = getComputedStyle(el);"
        " return { ws: s.whiteSpace, color: s.color, bg: s.backgroundColor,"
        " lh: parseFloat(s.lineHeight) || parseFloat(s.fontSize) }; }"
    )
    return badge, box, styles, (await badge.inner_text()).strip()


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
            "E2E test odznaku verzie 26.2 na mobile."
        )
        version_select = page.locator("form select").first
        await version_select.select_option(VERSION)
        check("formulár akceptuje verziu 26.2", await version_select.input_value() == VERSION)
        await page.get_by_role("button", name="Java").first.click()
        await page.locator("form button[type=submit]").first.click()
        await page.wait_for_url(lambda u: "/add-server" not in u, timeout=20000)
        check("server bol vytvorený", "/add-server" not in page.url, page.url)

        # ---- 2) Otvorenie profilu servera ----
        await page.goto(f"{BASE}/servers", wait_until="domcontentloaded")
        await page.get_by_text(SERVER_NAME, exact=False).first.wait_for(timeout=30000)
        await page.get_by_text(SERVER_NAME, exact=False).first.click()
        await page.wait_for_timeout(2500)
        detail_url = page.url
        check("profil servera sa otvoril", "/server/" in detail_url, detail_url)

        # ---- 3) Odznak na desktope ----
        m = await badge_metrics(page)
        check("desktop: odznak verzie existuje", m is not None)
        if m:
            _, box, styles, text = m
            check("desktop: odznak zobrazuje v26.2", text == f"v{VERSION}", text)
            check("desktop: odznak je viditeľný", box is not None and box["width"] > 0)
            check("desktop: text sa nezalamuje (nowrap)", "nowrap" in styles["ws"], styles["ws"])
            await m[0].screenshot(path=str(SHOTS / "mobile_e2e_badge_desktop.png"))
        await page.screenshot(path=str(SHOTS / "mobile_e2e_profile_desktop.png"))

        # ---- 4) Odznak na mobilnej šírke 375 px ----
        await page.set_viewport_size({"width": 375, "height": 812})
        await page.goto(detail_url, wait_until="domcontentloaded")
        await page.wait_for_timeout(2500)
        m = await badge_metrics(page)
        check("mobil: odznak verzie existuje", m is not None)
        if m:
            badge, box, styles, text = m
            check("mobil: odznak zobrazuje v26.2", text == f"v{VERSION}", text)
            check(
                "mobil: odznak sa zmestí do viewportu",
                box is not None and box["x"] >= 0 and box["x"] + box["width"] <= 375,
                str(box),
            )
            check(
                "mobil: odznak je na jednom riadku",
                box is not None and box["height"] < styles["lh"] * 2,
                f'height={box["height"]} lh={styles["lh"]}',
            )
            check("mobil: text sa nezalamuje (nowrap)", "nowrap" in styles["ws"], styles["ws"])
            check(
                "mobil: odznak má kontrastné pozadie",
                styles["bg"] not in ("rgba(0, 0, 0, 0)", "transparent"),
                styles["bg"],
            )
            await badge.screenshot(path=str(SHOTS / "mobile_e2e_badge_375.png"))
        await page.screenshot(path=str(SHOTS / "mobile_e2e_profile_375.png"))

        print("\nDETAIL URL:", detail_url)
        print("IP:", SERVER_IP)
        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} krokov OK")
    sys.exit(1 if failed else 0)

asyncio.run(main())
