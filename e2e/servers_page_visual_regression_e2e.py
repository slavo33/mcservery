"""
Vizuálne regresné testy pre stránku /servers.

Pre breakpointy mobil (375), tablet (768) a desktop (1440) urobí deterministické
screenshoty celej stránky aj kľúčových blokov v týchto stavoch:

 1. základný stav (načítaný zoznam),
 2. aktívne vyhľadávanie (výsledky),
 3. prázdny stav (vyhľadávanie bez výsledkov),
 4. aktívne zoradenie podľa hráčov,
 5. druhá strana stránkovania (ak existuje).

Snapshoty sa porovnávajú s baseline v `e2e/baselines/` (tolerancia 1 % pixelov).
Ak baseline chýba, vytvorí sa a krok sa označí ako NEW (nie zlyhanie).

Spustenie (dev server na http://localhost:8080):
    python3 e2e/servers_page_visual_regression_e2e.py
    UPDATE_BASELINES=1 python3 e2e/servers_page_visual_regression_e2e.py
"""
import asyncio, os, sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
ROOT = Path(__file__).parent
SHOTS = ROOT / "screenshots"
BASELINES = ROOT / "baselines"
SHOTS.mkdir(parents=True, exist_ok=True)
BASELINES.mkdir(parents=True, exist_ok=True)
UPDATE = os.environ.get("UPDATE_BASELINES") == "1"
DIFF_TOLERANCE = 0.01

VIEWPORTS = [("mobil", 375, 812), ("tablet", 768, 1024), ("desktop", 1440, 900)]

# Deterministický render: bez animácií, bez obrázkov a bez premenlivých čísel.
STABILIZE_CSS = """
*, *::before, *::after {
  animation: none !important;
  transition: none !important;
  caret-color: transparent !important;
  scroll-behavior: auto !important;
}
img, video, canvas, iframe { visibility: hidden !important; }
[data-live-players], [data-vote-count], [data-relative-time] {
  color: transparent !important;
}
"""

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def note(label, extra=""):
    results.append((label, True, extra))
    print("NEW  " + label + ((" :: " + str(extra)) if extra else ""))


def compare_baseline(name: str, shot: Path):
    from PIL import Image, ImageChops

    baseline = BASELINES / f"{name}.png"
    if UPDATE or not baseline.exists():
        baseline.write_bytes(shot.read_bytes())
        return "new", baseline.name
    a = Image.open(baseline).convert("RGB")
    b = Image.open(shot).convert("RGB")
    if a.size != b.size:
        return "fail", f"rozmery {a.size} != {b.size}"
    diff = ImageChops.difference(a, b).convert("L")
    changed = sum(1 for px in diff.getdata() if px > 12)
    ratio = changed / (a.size[0] * a.size[1])
    return ("pass" if ratio <= DIFF_TOLERANCE else "fail"), f"odlišných pixelov {ratio:.2%}"


async def snapshot(page, label: str, name: str, selector=None):
    if selector is not None:
        if await page.locator(selector).count() == 0:
            check(f"{label} existuje", False, f"selektor {selector} nenájdený")
            return
        target = page.locator(selector).first
    else:
        target = page
    shot = SHOTS / f"{name}.png"
    await target.screenshot(path=str(shot))
    status, detail = compare_baseline(name, shot)
    if status == "new":
        note(f"{label} :: baseline vytvorený", detail)
    else:
        check(label, status == "pass", detail)


async def prepare(page):
    await page.goto(BASE + "/servers", wait_until="domcontentloaded", timeout=30000)
    await page.add_style_tag(content=STABILIZE_CSS)
    await page.evaluate("window.scrollTo(0, 0)")
    # počkaj na dokončenie načítania zoznamu (skeleton zmizne / karty sa objavia)
    try:
        await page.wait_for_selector("[data-server-grid], [data-server-card]", timeout=15000)
    except Exception:
        pass
    await page.wait_for_timeout(1200)


async def search(page, text: str):
    box = page.locator("[data-server-filters] input[type=text]").first
    if await box.count() == 0:
        return False
    await box.fill(text)
    await page.mouse.move(0, 0)
    await page.wait_for_timeout(600)
    return True


async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        for vp_name, w, h in VIEWPORTS:
            context = await browser.new_context(
                viewport={"width": w, "height": h},
                device_scale_factor=1,
                reduced_motion="reduce",
                locale="sk-SK",
            )
            page = await context.new_page()
            try:
                await prepare(page)
            except Exception as exc:
                check(f"[{vp_name}] načítanie /servers", False, str(exc)[:120])
                await context.close()
                continue

            # 0) žiadne horizontálne pretečenie
            m = await page.evaluate(
                "() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth })"
            )
            check(f"[{vp_name}] /servers bez horizontálneho pretoku", m["s"] <= m["c"] + 1, f"{m['s']} > {m['c']}")

            # 1) základný stav
            await snapshot(page, f"[{vp_name}] /servers základný stav", f"vr_serverspage_{vp_name}")
            await snapshot(page, f"[{vp_name}] mriežka serverov", f"vr_serverspage_grid_{vp_name}", "[data-server-grid]")

            # 2) aktívne vyhľadávanie s výsledkami
            if await search(page, "s"):
                await snapshot(page, f"[{vp_name}] /servers vyhľadávanie", f"vr_serverspage_search_{vp_name}")

            # 3) prázdny stav
            if await search(page, "zzzz-neexistujuci-server-zzzz"):
                count = await page.locator("[data-server-card]").count()
                check(f"[{vp_name}] prázdny stav nemá karty", count == 0, f"kariet: {count}")
                await snapshot(page, f"[{vp_name}] /servers prázdny stav", f"vr_serverspage_empty_{vp_name}")
                await search(page, "")

            # 4) aktívne zoradenie podľa hráčov
            sort_players = page.locator("[data-sort-bar] [data-sort='players']")
            if await sort_players.count() > 0:
                await sort_players.click()
                await page.mouse.move(0, 0)
                await page.wait_for_timeout(600)
                await snapshot(page, f"[{vp_name}] /servers zoradenie podľa hráčov", f"vr_serverspage_sort_players_{vp_name}")
            else:
                note(f"[{vp_name}] zoradenie podľa hráčov preskočené", "chýba [data-sort='players']")

            # 5) druhá strana stránkovania
            next_btn = page.get_by_role("button", name="2", exact=True)
            if await next_btn.count() > 0:
                await next_btn.first.click()
                await page.evaluate("window.scrollTo(0, 0)")
                await page.wait_for_timeout(700)
                await snapshot(page, f"[{vp_name}] /servers strana 2", f"vr_serverspage_page2_{vp_name}")
            else:
                note(f"[{vp_name}] strana 2 preskočená", "stránkovanie nie je dostupné")

            await context.close()
        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n=== {len(results) - len(failed)}/{len(results)} OK ===")
    for label, _, extra in failed:
        print("FAIL:", label, extra)
    return 1 if failed else 0


sys.exit(asyncio.run(run()))
