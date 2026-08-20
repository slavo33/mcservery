"""
Vizuálne regresné testy pre navigáciu z karty servera na detail.

Pokrýva:
 1. kliknutie na kartu → detail servera (URL, nadpis, vizuál),
 2. loading stav detailu (spomalený backend),
 3. chybový/„nenájdené“ stav pri neexistujúcom serveri,
 4. návrat späť na /servers (tlačidlo Späť aj história prehliadača).

Spustenie (dev server na http://localhost:8080):
    python3 e2e/server_detail_navigation_visual_e2e.py
    UPDATE_BASELINES=1 python3 e2e/server_detail_navigation_visual_e2e.py
"""
import asyncio, os, sys
from pathlib import Path

from playwright.async_api import async_playwright

sys.path.insert(0, str(Path(__file__).parent))
from visual_diff import compare_with_baseline, enforce_budget  # noqa: E402

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
ROOT = Path(__file__).parent
SHOTS = ROOT / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)
UPDATE = os.environ.get("UPDATE_BASELINES") == "1"

VIEWPORTS = [("mobil", 375, 812), ("desktop", 1440, 900)]

STABILIZE_CSS = """
*, *::before, *::after {
  animation: none !important; transition: none !important;
  caret-color: transparent !important; scroll-behavior: auto !important;
}
img, video { visibility: hidden !important; }
[data-live-players], [data-vote-count], [data-relative-time] { color: transparent !important; }
"""

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def note(label, extra=""):
    results.append((label, True, extra))
    print("NEW  " + label + ((" :: " + str(extra)) if extra else ""))


async def snapshot(page, label, name, selector=None):
    target = page
    if selector is not None:
        if await page.locator(selector).count() == 0:
            check(f"{label} existuje", False, f"selektor {selector} nenájdený")
            return
        target = page.locator(selector).first
    shot = SHOTS / f"{name}.png"
    try:
        await target.screenshot(path=str(shot))
    except Exception as exc:
        check(label, False, str(exc)[:140])
        return
    status, detail = compare_with_baseline(name, shot, update=UPDATE)
    if status == "new":
        note(f"{label} :: baseline vytvorený", detail)
    else:
        check(label, status == "pass", detail)


async def stabilize(page):
    await page.add_style_tag(content=STABILIZE_CSS)
    await page.mouse.move(0, 0)
    await page.evaluate("() => { window.scrollTo(0, 0); document.activeElement && document.activeElement.blur(); }")
    await page.wait_for_timeout(600)


async def open_servers(page):
    await page.goto(BASE + "/servers", wait_until="domcontentloaded", timeout=30000)
    try:
        await page.wait_for_selector("[data-server-grid], [data-empty-state]", timeout=20000)
    except Exception:
        pass
    await stabilize(page)


# ------------------------------------------------- 1) klik na kartu → detail
async def click_card_to_detail(page, vp):
    if await page.locator("[data-server-card]").count() == 0:
        note(f"[{vp}] klik na kartu preskočený", "žiadne servery")
        return None

    # kartu obaľuje <Link> – odkaz je predok, nie potomok
    link = page.locator("a[href^='/server/']:has([data-server-card])").first
    if await link.count() == 0:
        link = page.locator("a[href^='/server/']").first
    if await link.count() == 0:
        check(f"[{vp}] karta obsahuje odkaz na detail", False)
        return None

    href = await link.get_attribute("href")
    await link.scroll_into_view_if_needed()
    await link.click()
    try:
        await page.wait_for_url("**/server/**", timeout=20000)
    except Exception:
        check(f"[{vp}] klik na kartu naviguje na detail", False, page.url)
        return None
    check(f"[{vp}] klik na kartu naviguje na detail", href in page.url, page.url)

    try:
        await page.wait_for_selector("h1", timeout=20000)
    except Exception:
        pass
    await stabilize(page)
    has_h1 = await page.locator("h1").count() > 0
    check(f"[{vp}] detail má nadpis h1", has_h1)
    await snapshot(page, f"[{vp}] detail po kliknutí na kartu", f"det_nav_detail_{vp}")
    return href


# --------------------------------------------------------- 2) loading stav
async def loading_state(context, vp, href):
    page = await context.new_page()
    delay = {"on": True}

    async def slow(route):
        if delay["on"]:
            await asyncio.sleep(2.5)
        try:
            await route.continue_()
        except Exception:
            pass

    await page.route("**/rest/v1/**", slow)
    await page.route("**/functions/v1/**", slow)

    try:
        await page.goto(BASE + href, wait_until="domcontentloaded", timeout=30000)
    except Exception as exc:
        check(f"[{vp}] načítanie detailu (loading)", False, str(exc)[:140])
        await page.close()
        return

    await page.wait_for_timeout(500)
    await page.add_style_tag(content=STABILIZE_CSS + "\n.animate-pulse, .animate-spin { opacity: 1 !important; }")
    await page.wait_for_timeout(200)
    await snapshot(page, f"[{vp}] detail – loading stav", f"det_nav_loading_{vp}")

    delay["on"] = False
    try:
        await page.wait_for_selector("h1", timeout=25000)
        check(f"[{vp}] detail sa načíta po loadingu", True)
    except Exception:
        check(f"[{vp}] detail sa načíta po loadingu", False, "timeout")
    await page.close()


# ------------------------------------------------------- 3) chybový stav
async def error_state(page, vp):
    await page.goto(BASE + "/server/neexistujuci-server-xyz-404", wait_until="domcontentloaded", timeout=30000)
    await page.wait_for_timeout(2500)
    await stabilize(page)
    body = (await page.inner_text("body")).lower()
    known = any(k in body for k in ["nenájden", "nebol", "not found", "404", "chyba", "späť"])
    check(f"[{vp}] neexistujúci server zobrazí zrozumiteľnú hlášku", known, body[:120].replace("\n", " "))
    cards = await page.locator("[data-server-card]").count()
    check(f"[{vp}] chybový stav nezobrazuje zoznam serverov", cards == 0, f"kariet: {cards}")
    await snapshot(page, f"[{vp}] detail – chybový stav", f"det_nav_error_{vp}")


# --------------------------------------------------------- 4) návrat späť
async def back_navigation(page, vp, href):
    await open_servers(page)
    link = page.locator(f"a[href='{href}']").first
    if await link.count() == 0:
        note(f"[{vp}] návrat späť preskočený", "odkaz na server sa nenašiel")
        return
    await link.scroll_into_view_if_needed()
    await link.click()
    try:
        await page.wait_for_url("**/server/**", timeout=20000)
    except Exception:
        check(f"[{vp}] navigácia na detail pred návratom", False, page.url)
        return
    await stabilize(page)

    # v hlavičke môže byť skrytý mobilný odkaz – hľadáme viditeľné tlačidlo v obsahu
    back = page.locator("main [data-detail-back], main a[href='/servers']").locator("visible=true").first
    if await back.count() > 0:
        await back.click()
        try:
            await page.wait_for_url("**/servers**", timeout=15000)
            check(f"[{vp}] tlačidlo Späť vráti na /servers", "/servers" in page.url, page.url)
        except Exception:
            check(f"[{vp}] tlačidlo Späť vráti na /servers", False, page.url)
    else:
        note(f"[{vp}] tlačidlo Späť sa nenašlo", "použije sa iba história prehliadača")
        await page.go_back()
        await page.wait_for_timeout(800)
        check(f"[{vp}] história prehliadača vráti na /servers", "/servers" in page.url, page.url)

    try:
        await page.wait_for_selector("[data-server-grid], [data-empty-state]", timeout=20000)
    except Exception:
        pass
    await stabilize(page)
    await snapshot(page, f"[{vp}] /servers po návrate z detailu", f"det_nav_back_{vp}")


async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        for vp, w, h in VIEWPORTS:
            context = await browser.new_context(
                viewport={"width": w, "height": h}, device_scale_factor=1,
                reduced_motion="reduce", locale="sk-SK",
            )
            page = await context.new_page()
            try:
                await open_servers(page)
                href = await click_card_to_detail(page, vp)
                await error_state(page, vp)
                if href:
                    await back_navigation(page, vp, href)
                await page.close()
                if href:
                    await loading_state(context, vp, href)
            except Exception as exc:
                check(f"[{vp}] beh testu", False, str(exc)[:160])
            await context.close()
        await browser.close()

    ok, _ = enforce_budget()
    failed = [r for r in results if not r[1]]
    print(f"\n=== {len(results) - len(failed)}/{len(results)} OK ===")
    for label, _, extra in failed:
        print("FAIL:", label, extra)
    return 1 if (failed or not ok) else 0


sys.exit(asyncio.run(run()))
