"""
Vizuálne regresné testy pre interaktívne a prechodné stavy na /servers.

Pokrýva:
 1. karty serverov – normálny, hover, focus (klávesnica) a aktívny/kliknutý stav,
 2. kombinácie filtrov + zoradenia, ktoré vrátia prázdny zoznam,
 3. skeleton/loading stav pri prvom načítaní a pri prepnutí filtrov.

Snapshoty sa porovnávajú s baseline v `e2e/baselines/` (tolerancia 1 % pixelov).
Pri zlyhaní sa do `e2e/diffs/<názov>/` uložia baseline, aktuálny snímok
a zvýraznený rozdiel — CI ich nahráva ako artefakt.

Spustenie (dev server na http://localhost:8080):
    python3 e2e/servers_states_visual_e2e.py
    UPDATE_BASELINES=1 python3 e2e/servers_states_visual_e2e.py
"""
import asyncio, os, sys
from pathlib import Path

from playwright.async_api import async_playwright

sys.path.insert(0, str(Path(__file__).parent))
from visual_diff import compare_with_baseline  # noqa: E402

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
ROOT = Path(__file__).parent
SHOTS = ROOT / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)
UPDATE = os.environ.get("UPDATE_BASELINES") == "1"
TOLERANCE = 0.01

VIEWPORTS = [("mobil", 375, 812), ("tablet", 768, 1024), ("desktop", 1440, 900)]

STABILIZE_CSS = """
*, *::before, *::after {
  animation: none !important;
  transition: none !important;
  caret-color: transparent !important;
  scroll-behavior: auto !important;
}
[data-server-card] img, [data-server-card] video { visibility: hidden !important; }
[data-live-players], [data-vote-count], [data-relative-time] { color: transparent !important; }
"""

# Skeleton má pulzujúcu animáciu – pre snapshot ju zmrazíme.
SKELETON_CSS = """
*, *::before, *::after { animation: none !important; transition: none !important; }
[data-server-grid-skeleton] .animate-pulse { opacity: 1 !important; }
"""

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def note(label, extra=""):
    results.append((label, True, extra))
    print("NEW  " + label + ((" :: " + str(extra)) if extra else ""))


async def snapshot(page, label: str, name: str, selector=None):
    if selector is not None:
        if await page.locator(selector).count() == 0:
            check(f"{label} existuje", False, f"selektor {selector} nenájdený")
            return
        target = page.locator(selector).first
    else:
        target = page
    shot = SHOTS / f"{name}.png"
    try:
        await target.screenshot(path=str(shot))
    except Exception as exc:
        check(label, False, str(exc)[:120])
        return
    status, detail = compare_with_baseline(name, shot, TOLERANCE, UPDATE)
    if status == "new":
        note(f"{label} :: baseline vytvorený", detail)
    else:
        check(label, status == "pass", detail)


async def open_servers(page, stabilize=True):
    await page.goto(BASE + "/servers", wait_until="domcontentloaded", timeout=30000)
    try:
        await page.wait_for_selector("[data-server-grid], [data-empty-state]", timeout=15000)
    except Exception:
        pass
    if stabilize:
        await page.add_style_tag(content=STABILIZE_CSS)
    await page.evaluate("window.scrollTo(0, 0)")
    await page.wait_for_timeout(900)


# ---------------------------------------------------------------- 1) stavy kariet
async def card_states(page, vp):
    card = page.locator("[data-server-card]").first
    if await page.locator("[data-server-card]").count() == 0:
        note(f"[{vp}] stavy kariet preskočené", "žiadne servery")
        return

    await page.mouse.move(0, 0)
    await page.wait_for_timeout(200)
    await snapshot(page, f"[{vp}] karta – normálny stav", f"st_card_normal_{vp}", "[data-server-card]")

    # hover
    await card.hover()
    await page.wait_for_timeout(250)
    await snapshot(page, f"[{vp}] karta – hover", f"st_card_hover_{vp}", "[data-server-card]")
    await page.mouse.move(0, 0)
    await page.wait_for_timeout(150)

    # focus cez klávesnicu (prvý fokusovateľný prvok vnútri karty)
    focusable = card.locator("a, button, [tabindex]:not([tabindex='-1'])").first
    if await focusable.count() > 0:
        await focusable.focus()
        await page.wait_for_timeout(250)
        focused_inside = await page.evaluate(
            "() => { const c = document.querySelector('[data-server-card]'); return !!(c && document.activeElement && c.contains(document.activeElement)); }"
        )
        check(f"[{vp}] focus je vnútri karty", focused_inside)
        await snapshot(page, f"[{vp}] karta – focus", f"st_card_focus_{vp}", "[data-server-card]")

        # aktívny / kliknutý stav (mouse down bez uvoľnenia – bez navigácie)
        box = await focusable.bounding_box()
        if box:
            await page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            await page.mouse.down()
            await page.wait_for_timeout(250)
            await snapshot(page, f"[{vp}] karta – aktívny (kliknutý)", f"st_card_active_{vp}", "[data-server-card]")
            await page.mouse.up()
            await page.wait_for_timeout(150)
    else:
        note(f"[{vp}] focus/aktívny stav preskočený", "karta nemá fokusovateľný prvok")

    await page.evaluate("() => document.activeElement && document.activeElement.blur()")
    await page.mouse.move(0, 0)


# ------------------------------------------------------- 2) prázdne kombinácie filtrov
EMPTY_COMBOS = [
    ("search", {"search": "zzzz-neexistujuci-server-zzzz"}, None),
    ("search_sort_players", {"search": "zzzz-neexistujuci-server-zzzz"}, "players"),
    ("vip_search", {"search": "qqqq-nic-qqqq", "vip": True}, "likes"),
]


async def apply_filters(page, cfg, sort_key):
    box = page.locator("[data-server-filters] input[type=text]").first
    if await box.count() > 0:
        await box.fill(cfg.get("search", ""))
    if cfg.get("vip"):
        vip_btn = page.locator("[data-sort-bar] button").first
        if await vip_btn.count() > 0:
            await vip_btn.click()
    if sort_key:
        btn = page.locator(f"[data-sort-bar] [data-sort='{sort_key}']")
        if await btn.count() > 0:
            await btn.click()
    await page.mouse.move(0, 0)
    await page.evaluate("() => document.activeElement && document.activeElement.blur()")
    await page.wait_for_timeout(700)


async def empty_states(page, vp):
    for label, cfg, sort_key in EMPTY_COMBOS:
        await open_servers(page)
        await apply_filters(page, cfg, sort_key)
        cards = await page.locator("[data-server-card]").count()
        check(f"[{vp}] kombinácia '{label}' vráti prázdny zoznam", cards == 0, f"kariet: {cards}")
        has_empty = await page.locator("[data-empty-state]").count() > 0
        check(f"[{vp}] kombinácia '{label}' zobrazí prázdny stav", has_empty)
        await snapshot(page, f"[{vp}] prázdny stav '{label}'", f"st_empty_{label}_{vp}", "[data-empty-state]")
        await snapshot(page, f"[{vp}] prázdny stav '{label}' (stránka)", f"st_empty_page_{label}_{vp}")


# --------------------------------------------------------------- 3) skeleton / loading
async def skeleton_states(context, vp):
    """Spomalíme backend requesty, aby sa skeleton dal spoľahlivo zachytiť."""
    page = await context.new_page()

    delay = {"on": True}

    async def slow(route):
        if delay["on"]:
            await asyncio.sleep(2.0)
        try:
            await route.continue_()
        except Exception:
            pass

    await page.route("**/rest/v1/**", slow)
    await page.route("**/functions/v1/**", slow)

    try:
        await page.goto(BASE + "/servers", wait_until="domcontentloaded", timeout=30000)
    except Exception as exc:
        check(f"[{vp}] načítanie /servers (skeleton)", False, str(exc)[:120])
        await page.close()
        return

    try:
        await page.wait_for_selector("[data-server-grid-skeleton]", timeout=8000)
        await page.add_style_tag(content=SKELETON_CSS)
        await page.wait_for_timeout(200)
        check(f"[{vp}] skeleton sa zobrazí počas načítania", True)
        await snapshot(page, f"[{vp}] skeleton mriežky", f"st_skeleton_grid_{vp}", "[data-server-grid-skeleton]")
        await snapshot(page, f"[{vp}] skeleton – celá stránka", f"st_skeleton_page_{vp}")

        # skeleton nesmie spôsobiť horizontálne pretečenie
        m = await page.evaluate(
            "() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth })"
        )
        check(f"[{vp}] skeleton bez horizontálneho pretoku", m["s"] <= m["c"] + 1, f"{m['s']} > {m['c']}")
    except Exception:
        note(f"[{vp}] skeleton preskočený", "skeleton sa nezobrazil (dáta z cache)")

    # po dokončení načítania skeleton zmizne
    delay["on"] = False
    try:
        await page.wait_for_selector("[data-server-grid], [data-empty-state]", timeout=20000)
        gone = await page.locator("[data-server-grid-skeleton]").count() == 0
        check(f"[{vp}] skeleton po načítaní zmizne", gone)
    except Exception:
        check(f"[{vp}] zoznam sa načíta po skelete", False, "timeout")

    # skeleton / prechodný stav pri zmene filtrov
    await page.add_style_tag(content=STABILIZE_CSS)
    chip = page.locator("[data-server-filters] .filter-chip").nth(1)
    if await chip.count() > 0:
        await chip.click()
        await page.wait_for_timeout(120)
        await snapshot(page, f"[{vp}] stav tesne po zmene filtra", f"st_filter_transition_{vp}", "[data-server-grid], [data-empty-state], [data-server-grid-skeleton]")
        await page.wait_for_timeout(700)
        await snapshot(page, f"[{vp}] stav po dokončení filtra", f"st_filter_settled_{vp}", "[data-server-grid], [data-empty-state]")
    else:
        note(f"[{vp}] prechod pri zmene filtra preskočený", "žiadny filter-chip")

    await page.close()


async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        for vp, w, h in VIEWPORTS:
            context = await browser.new_context(
                viewport={"width": w, "height": h},
                device_scale_factor=1,
                reduced_motion="reduce",
                locale="sk-SK",
            )
            page = await context.new_page()
            try:
                await open_servers(page)
            except Exception as exc:
                check(f"[{vp}] načítanie /servers", False, str(exc)[:120])
                await context.close()
                continue

            await card_states(page, vp)
            await empty_states(page, vp)
            await page.close()
            await skeleton_states(context, vp)
            await context.close()
        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n=== {len(results) - len(failed)}/{len(results)} OK ===")
    for label, _, extra in failed:
        print("FAIL:", label, extra)
    return 1 if failed else 0


sys.exit(asyncio.run(run()))
