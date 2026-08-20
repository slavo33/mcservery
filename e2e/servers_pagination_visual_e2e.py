"""
Vizuálne regresné testy pre stránkovanie na /servers.

Pokrýva:
 1. stránku 1 (prev je deaktivované) a stránku 2 (aktívny stav čísla),
 2. poslednú stranu (next je deaktivované),
 3. hover/focus stav tlačidiel stránkovania,
 4. deaktivované tlačidlá – vizuál aj `disabled` atribút.

Spustenie (dev server na http://localhost:8080):
    python3 e2e/servers_pagination_visual_e2e.py
    UPDATE_BASELINES=1 python3 e2e/servers_pagination_visual_e2e.py
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


async def goto_servers(page, page_num=None):
    url = BASE + "/servers" + (f"?page={page_num}" if page_num else "")
    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
    try:
        await page.wait_for_selector("[data-server-grid], [data-empty-state]", timeout=20000)
    except Exception:
        pass
    await page.add_style_tag(content=STABILIZE_CSS)
    await page.evaluate("window.scrollTo(0, 0)")
    await page.wait_for_timeout(700)


async def scroll_to_pagination(page):
    await page.locator("[data-pagination]").first.scroll_into_view_if_needed()
    await page.mouse.move(0, 0)
    await page.evaluate("() => document.activeElement && document.activeElement.blur()")
    await page.wait_for_timeout(350)


async def run_viewport(page, vp):
    await goto_servers(page)

    if await page.locator("[data-pagination]").count() == 0:
        note(f"[{vp}] stránkovanie preskočené", "iba jedna strana výsledkov")
        return

    page_count = int(await page.locator("[data-server-grid]").first.get_attribute("data-page-count") or 1)
    check(f"[{vp}] stránkovanie sa zobrazí pri viac stranách", page_count > 1, f"strán: {page_count}")

    # ---- strana 1
    await scroll_to_pagination(page)
    prev_disabled = await page.locator("[data-page-prev]").first.is_disabled()
    next_disabled = await page.locator("[data-page-next]").first.is_disabled()
    check(f"[{vp}] strana 1 – 'predchádzajúca' je deaktivovaná", prev_disabled)
    check(f"[{vp}] strana 1 – 'nasledujúca' je aktívna", not next_disabled)
    current = await page.locator("[data-pagination] [aria-current='page']").count()
    check(f"[{vp}] strana 1 – práve jedno aria-current tlačidlo", current == 1, f"počet: {current}")
    await snapshot(page, f"[{vp}] stránkovanie – strana 1", f"pg_page1_{vp}", "[data-pagination]")

    # hover a focus stav navigačných tlačidiel
    await page.locator("[data-page-next]").first.hover()
    await page.wait_for_timeout(200)
    await snapshot(page, f"[{vp}] stránkovanie – hover 'nasledujúca'", f"pg_next_hover_{vp}", "[data-pagination]")
    await page.mouse.move(0, 0)
    await page.locator("[data-page-next]").first.focus()
    await page.wait_for_timeout(200)
    await snapshot(page, f"[{vp}] stránkovanie – focus 'nasledujúca'", f"pg_next_focus_{vp}", "[data-pagination]")
    await page.evaluate("() => document.activeElement && document.activeElement.blur()")

    # ---- strana 2
    await page.locator("[data-page-btn='2']").first.click()
    await page.wait_for_timeout(800)
    await page.add_style_tag(content=STABILIZE_CSS)
    await scroll_to_pagination(page)
    grid_page = await page.locator("[data-server-grid]").first.get_attribute("data-page")
    check(f"[{vp}] prechod na stranu 2", grid_page == "2", f"data-page={grid_page}")
    check(f"[{vp}] strana 2 – URL obsahuje page=2", "page=2" in page.url, page.url)
    check(
        f"[{vp}] strana 2 – 'predchádzajúca' je aktívna",
        not await page.locator("[data-page-prev]").first.is_disabled(),
    )
    await snapshot(page, f"[{vp}] stránkovanie – strana 2", f"pg_page2_{vp}", "[data-pagination]")
    await snapshot(page, f"[{vp}] stránkovanie – strana 2 (mriežka)", f"pg_page2_grid_{vp}", "[data-server-grid]")

    # ---- posledná strana: next deaktivované
    await page.locator(f"[data-page-btn='{page_count}']").first.click()
    await page.wait_for_timeout(800)
    await page.add_style_tag(content=STABILIZE_CSS)
    await scroll_to_pagination(page)
    check(
        f"[{vp}] posledná strana – 'nasledujúca' je deaktivovaná",
        await page.locator("[data-page-next]").first.is_disabled(),
    )
    await snapshot(page, f"[{vp}] stránkovanie – posledná strana", f"pg_last_{vp}", "[data-pagination]")

    # deaktivované tlačidlo nereaguje na kliknutie (pointer-events: none)
    styles = await page.evaluate(
        """() => {
            const b = document.querySelector('[data-page-next]');
            const cs = getComputedStyle(b);
            return { pe: cs.pointerEvents, op: parseFloat(cs.opacity) };
        }"""
    )
    check(f"[{vp}] deaktivované tlačidlo je vizuálne stlmené", styles["op"] < 0.6, str(styles))
    check(f"[{vp}] deaktivované tlačidlo neprijíma kliknutia", styles["pe"] == "none", str(styles))


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
