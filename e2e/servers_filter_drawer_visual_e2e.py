"""
Vizuálne regresné testy pre mobilný filter drawer na /servers.

Pokrýva:
 1. zatvorený stav (spúšťač „Filtre“),
 2. otvorenie drawera,
 3. výber filtra v drawer-i (draft stav) a aplikovanie,
 4. reset filtrov v drawer-i,
 5. zatvorenie bez aplikovania (Escape) – filtre sa nesmú zmeniť.

Spustenie (dev server na http://localhost:8080):
    python3 e2e/servers_filter_drawer_visual_e2e.py
    UPDATE_BASELINES=1 python3 e2e/servers_filter_drawer_visual_e2e.py
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

VIEWPORTS = [("mobil", 375, 812), ("mobil_sm", 320, 720)]

STABILIZE_CSS = """
*, *::before, *::after {
  animation: none !important; transition: none !important;
  caret-color: transparent !important; scroll-behavior: auto !important;
}
[data-server-card] img, [data-server-card] video { visibility: hidden !important; }
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


async def open_servers(page):
    await page.goto(BASE + "/servers", wait_until="domcontentloaded", timeout=30000)
    try:
        await page.wait_for_selector("[data-server-grid], [data-empty-state]", timeout=20000)
    except Exception:
        pass
    await page.add_style_tag(content=STABILIZE_CSS)
    await page.evaluate("window.scrollTo(0, 0)")
    await page.wait_for_timeout(600)


async def run_viewport(page, vp):
    await open_servers(page)

    trigger = page.locator("[data-filter-drawer-trigger]")
    check(f"[{vp}] spúšťač filtrov je viditeľný", await trigger.count() > 0 and await trigger.first.is_visible())
    desktop_groups_hidden = await page.evaluate(
        """() => !document.querySelector('[data-server-filters] [data-filter-group]')"""
    )
    check(f"[{vp}] filtre sú na mobile skryté v drawer-i", desktop_groups_hidden)
    await snapshot(page, f"[{vp}] filter panel – zatvorený drawer", f"drw_closed_{vp}", "[data-server-filters]")

    # ---- otvorenie
    await trigger.first.click()
    await page.wait_for_selector("[data-filter-drawer]", timeout=8000)
    await page.wait_for_timeout(500)
    await page.add_style_tag(content=STABILIZE_CSS)
    drawer = page.locator("[data-filter-drawer]")
    check(f"[{vp}] drawer sa otvorí", await drawer.first.is_visible())
    check(
        f"[{vp}] spúšťač má aria-expanded=true",
        await trigger.first.get_attribute("aria-expanded") == "true",
    )
    groups = await drawer.locator("[data-filter-group]").count()
    check(f"[{vp}] drawer obsahuje skupiny filtrov", groups >= 3, f"skupín: {groups}")
    await snapshot(page, f"[{vp}] drawer – otvorený", f"drw_open_{vp}", "[data-filter-drawer]")

    # ---- výber filtra (draft) a aplikovanie
    chip = drawer.locator("[data-filter-group='version'] button[data-filter-value]").first
    version = await chip.get_attribute("data-filter-value")
    await chip.click()
    await page.wait_for_timeout(250)
    check(
        f"[{vp}] výber v drawer-i je označený (aria-pressed)",
        await chip.get_attribute("aria-pressed") == "true",
    )
    await snapshot(page, f"[{vp}] drawer – vybraný filtre (draft)", f"drw_draft_{vp}", "[data-filter-drawer]")

    await page.locator("[data-filter-apply]").first.click()
    await page.wait_for_timeout(800)
    await page.add_style_tag(content=STABILIZE_CSS)
    check(f"[{vp}] po aplikovaní sa drawer zatvorí", await page.locator("[data-filter-drawer]").count() == 0)
    badge = page.locator("[data-filter-active-count]")
    check(f"[{vp}] spúšťač zobrazí počet aktívnych filtrov", await badge.count() > 0)
    await snapshot(page, f"[{vp}] filter panel – po aplikovaní", f"drw_applied_{vp}", "[data-server-filters]")
    await snapshot(page, f"[{vp}] /servers po aplikovaní filtra", f"drw_applied_page_{vp}")

    # ---- reset
    await page.locator("[data-filter-drawer-trigger]").first.click()
    await page.wait_for_selector("[data-filter-drawer]", timeout=8000)
    await page.wait_for_timeout(450)
    await page.add_style_tag(content=STABILIZE_CSS)
    drawer = page.locator("[data-filter-drawer]")
    preselected = await drawer.locator(f"[data-filter-value='{version}']").first.get_attribute("aria-pressed")
    check(f"[{vp}] drawer prevezme aplikované filtre", preselected == "true", f"aria-pressed={preselected}")
    await snapshot(page, f"[{vp}] drawer – s aplikovanými filtrami", f"drw_reopen_{vp}", "[data-filter-drawer]")

    await page.locator("[data-filter-reset]").first.click()
    await page.wait_for_timeout(300)
    after_reset = await drawer.locator(f"[data-filter-value='{version}']").first.get_attribute("aria-pressed")
    check(f"[{vp}] reset zruší výber v drawer-i", after_reset == "false", f"aria-pressed={after_reset}")
    await snapshot(page, f"[{vp}] drawer – po resete", f"drw_reset_{vp}", "[data-filter-drawer]")

    await page.locator("[data-filter-apply]").first.click()
    await page.wait_for_timeout(800)
    await page.add_style_tag(content=STABILIZE_CSS)
    check(
        f"[{vp}] po aplikovaní resetu zmizne počítadlo filtrov",
        await page.locator("[data-filter-active-count]").count() == 0,
    )
    await snapshot(page, f"[{vp}] filter panel – po resete", f"drw_reset_applied_{vp}", "[data-server-filters]")

    # ---- zatvorenie bez aplikovania (Escape)
    await page.locator("[data-filter-drawer-trigger]").first.click()
    await page.wait_for_selector("[data-filter-drawer]", timeout=8000)
    await page.wait_for_timeout(400)
    await page.locator("[data-filter-drawer] [data-filter-group='platform'] button[data-filter-value]").first.click()
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(600)
    check(f"[{vp}] Escape zatvorí drawer", await page.locator("[data-filter-drawer]").count() == 0)
    check(
        f"[{vp}] zatvorenie bez 'Použiť' filtre neaplikuje",
        await page.locator("[data-filter-active-count]").count() == 0,
    )
    await page.add_style_tag(content=STABILIZE_CSS)
    await page.wait_for_timeout(300)
    await snapshot(page, f"[{vp}] filter panel – po zatvorení bez aplikovania", f"drw_dismissed_{vp}", "[data-server-filters]")

    # horizontálne pretečenie s otvoreným drawerom
    await page.locator("[data-filter-drawer-trigger]").first.click()
    await page.wait_for_selector("[data-filter-drawer]", timeout=8000)
    await page.wait_for_timeout(400)
    m = await page.evaluate(
        "() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth })"
    )
    check(f"[{vp}] drawer nespôsobí horizontálne pretečenie", m["s"] <= m["c"] + 1, f"{m['s']} > {m['c']}")


async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        for vp, w, h in VIEWPORTS:
            context = await browser.new_context(
                viewport={"width": w, "height": h}, device_scale_factor=1,
                reduced_motion="reduce", locale="sk-SK", has_touch=True, is_mobile=True,
            )
            page = await context.new_page()
            try:
                await run_viewport(page, vp)
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
