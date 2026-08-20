"""
Vizuálne (snapshot) regresné testy pre karty serverov a panel filtrov.

Pre breakpointy mobil/tablet/desktop:
 1. snapshot panelu filtrov (`[data-server-filters]`) v základnom aj aktívnom stave,
 2. snapshot lišty zoradenia (`[data-sort-bar]`) vrátane aktívneho triedenia,
 3. snapshot prvej karty servera (`[data-server-card]`) – normálny aj hover stav,
 4. typografické kontroly: všetky tagy na karte majú rovnaký font-family a
    veľkosť písma, filter-chipy majú jednotný font.

Snapshoty sa porovnávajú s baseline v `e2e/baselines/` (tolerancia 1 % pixelov).
Ak baseline chýba, vytvorí sa a krok sa označí ako NEW.

Spustenie (dev server na http://localhost:8080):
    python3 e2e/server_card_filters_visual_e2e.py
    UPDATE_BASELINES=1 python3 e2e/server_card_filters_visual_e2e.py
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
}
[data-server-card] img,
[data-server-card] video { visibility: hidden !important; }
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


async def snapshot(page, label: str, name: str, selector: str):
    loc = page.locator(selector).first
    if await page.locator(selector).count() == 0:
        check(f"{label} existuje", False, f"selektor {selector} nenájdený")
        return
    shot = SHOTS / f"{name}.png"
    await loc.screenshot(path=str(shot))
    status, detail = compare_baseline(name, shot)
    if status == "new":
        note(f"{label} :: baseline vytvorený", detail)
    else:
        check(label, status == "pass", detail)


async def typography_checks(page, vp_name: str):
    data = await page.evaluate(
        """() => {
          const card = document.querySelector('[data-server-card]');
          // tagy zoskupené podľa rodičovského riadku – v rámci riadku musia byť identické
          const groups = {};
          if (card) {
            [...card.querySelectorAll('[data-server-tag]')].forEach((el, i) => {
              const s = getComputedStyle(el);
              const parent = el.parentElement;
              const key = parent ? (parent.getAttribute('data-tag-row') || parent.className || 'row') : 'root';
              (groups[key] = groups[key] || []).push(s.fontFamily + '|' + s.fontSize + '|' + s.fontWeight);
            });
          }
          const chipFonts = [...document.querySelectorAll('[data-server-filters] .filter-chip')].map(el => {
            const s = getComputedStyle(el);
            return s.fontFamily + '|' + s.fontSize;
          });
          const families = card ? [...new Set([...card.querySelectorAll('[data-server-tag]')]
            .map(el => getComputedStyle(el).fontFamily))] : [];
          return { groups, chipFonts, families, hasCard: !!card };
        }"""
    )
    if data["hasCard"]:
        for idx, (key, fonts) in enumerate(data["groups"].items()):
            uniq = sorted(set(fonts))
            check(f"[{vp_name}] tagy v riadku #{idx + 1} majú jednotnú typografiu", len(uniq) == 1, "; ".join(uniq))
        check(f"[{vp_name}] všetky tagy karty majú rovnaký font-family", len(data["families"]) == 1,
              "; ".join(data["families"]))
    if data["chipFonts"]:
        uniq = sorted(set(data["chipFonts"]))
        check(f"[{vp_name}] filter-chipy majú jednotnú typografiu", len(uniq) == 1, "; ".join(uniq))
    else:
        check(f"[{vp_name}] filter-chipy nájdené", False, "žiadny .filter-chip")



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
                await page.goto(BASE + "/servers", wait_until="networkidle", timeout=30000)
            except Exception as exc:
                check(f"[{vp_name}] načítanie /servers", False, str(exc)[:120])
                await context.close()
                continue
            await page.add_style_tag(content=STABILIZE_CSS)
            await page.wait_for_timeout(600)

            # 1) základný stav
            await snapshot(page, f"[{vp_name}] panel filtrov", f"vr_filters_{vp_name}", "[data-server-filters]")
            await snapshot(page, f"[{vp_name}] lišta zoradenia", f"vr_sortbar_{vp_name}", "[data-sort-bar]")

            has_card = await page.locator("[data-server-card]").count() > 0
            if has_card:
                await snapshot(page, f"[{vp_name}] karta servera", f"vr_card_{vp_name}", "[data-server-card]")
                await page.locator("[data-server-card]").first.hover()
                await page.wait_for_timeout(250)
                await snapshot(page, f"[{vp_name}] karta servera (hover)", f"vr_card_hover_{vp_name}", "[data-server-card]")
                await page.mouse.move(0, 0)
            else:
                note(f"[{vp_name}] karta servera preskočená", "žiadne servery v zozname")

            await typography_checks(page, vp_name)

            # 2) aktívny stav filtrov (vybraný chip + text vo vyhľadávaní + iné triedenie)
            chip = page.locator("[data-server-filters] .filter-chip").nth(1)
            if await chip.count() > 0:
                await chip.click()
            search = page.locator("[data-server-filters] input[type=text]").first
            if await search.count() > 0:
                await search.fill("survival")
            sort_players = page.locator("[data-sort-bar] [data-sort='players']")
            if await sort_players.count() > 0:
                await sort_players.click()
            await page.mouse.move(0, 0)
            await page.wait_for_timeout(400)
            await snapshot(page, f"[{vp_name}] panel filtrov (aktívny)", f"vr_filters_active_{vp_name}", "[data-server-filters]")
            await snapshot(page, f"[{vp_name}] lišta zoradenia (aktívna)", f"vr_sortbar_active_{vp_name}", "[data-sort-bar]")

            await context.close()
        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n=== {len(results) - len(failed)}/{len(results)} OK ===")
    for label, _, extra in failed:
        print("FAIL:", label, extra)
    return 1 if failed else 0


sys.exit(asyncio.run(run()))
