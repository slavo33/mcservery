"""
Vizuálne regresné E2E testy hlavných rozložení stránky.

Pre každú hlavnú stránku (/, /servers, /add-server, /vip, /staff, /terms,
/privacy, /404) a každý breakpoint (mobil 375, tablet 768, desktop 1440):

 1. urobí deterministický screenshot viewportu (animácie vypnuté, dynamický
    obsah – zoznamy serverov/inzerátov, počty hráčov, časy – zamaskovaný),
 2. porovná ho s baseline v `e2e/baselines/` (tolerancia 1 % odlišných pixelov),
 3. urobí a porovná samostatný screenshot hlavičky a pätičky,
 4. overí, že rozloženie nepreteká (scrollWidth ≤ clientWidth) a že hlavička
    aj pätička majú na danom breakpointe očakávané rozmery.

Ak baseline chýba, vytvorí sa a krok sa označí ako NEW (nie zlyhanie).

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/layout_visual_regression_e2e.py
    UPDATE_BASELINES=1 python3 e2e/layout_visual_regression_e2e.py   # prepíše baseline
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

VIEWPORTS = [
    ("mobil", 375, 812),
    ("tablet", 768, 1024),
    ("desktop", 1440, 900),
]

PAGES = [
    ("home", "/"),
    ("servers", "/servers"),
    ("add-server", "/add-server"),
    ("vip", "/vip"),
    ("staff", "/staff"),
    ("terms", "/terms"),
    ("privacy", "/privacy"),
    ("notfound", "/404"),
]

# CSS, ktoré robí screenshoty deterministickými
STABILIZE_CSS = """
*, *::before, *::after {
  animation: none !important;
  transition: none !important;
  caret-color: transparent !important;
  scroll-behavior: auto !important;
}
/* dynamický obsah – maskovaný jednotnou plochou, rozloženie ostáva zachované */
[data-server-card],
[data-staff-post],
[data-live-players],
[data-vote-count],
[data-relative-time],
img, video, canvas, iframe {
  visibility: hidden !important;
}
[data-server-card], [data-staff-post] {
  background: #1a1a1a !important;
  visibility: visible !important;
}
[data-server-card] *, [data-staff-post] * { visibility: hidden !important; }
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


def record_shot(label: str, name: str, shot: Path):
    status, detail = compare_baseline(name, shot)
    if status == "new":
        note(f"{label} :: baseline vytvorený", detail)
    else:
        check(label, status == "pass", detail)


async def snapshot(page, label_prefix: str, name_prefix: str, selector=None):
    target = page if selector is None else page.locator(selector).first
    if selector is not None and await page.locator(selector).count() == 0:
        check(f"{label_prefix} existuje", False, f"selektor {selector} nenájdený")
        return
    shot = SHOTS / f"{name_prefix}.png"
    await target.screenshot(path=str(shot))
    record_shot(label_prefix, name_prefix, shot)


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
            for page_name, path in PAGES:
                key = f"vr_{page_name}_{vp_name}"
                label = f"[{vp_name}] {path}"
                try:
                    await page.goto(BASE + path, wait_until="networkidle", timeout=30000)
                except Exception as exc:
                    check(f"{label} načítanie", False, str(exc)[:120])
                    continue
                await page.add_style_tag(content=STABILIZE_CSS)
                await page.evaluate("window.scrollTo(0, 0)")
                await page.wait_for_timeout(400)

                m = await page.evaluate(
                    """() => {
                      const header = document.querySelector('header');
                      const footer = document.querySelector('footer');
                      const r = el => el ? el.getBoundingClientRect() : null;
                      return {
                        scrollW: document.documentElement.scrollWidth,
                        clientW: document.documentElement.clientWidth,
                        header: r(header) && { w: r(header).width, h: r(header).height },
                        footer: r(footer) && { w: r(footer).width },
                      };
                    }"""
                )
                check(f"{label} bez horizontálneho pretoku", m["scrollW"] <= m["clientW"] + 1,
                      f"{m['scrollW']} > {m['clientW']}")
                check(f"{label} hlavička na celú šírku", bool(m["header"]) and abs(m["header"]["w"] - m["clientW"]) <= 1,
                      str(m["header"]))
                check(f"{label} pätička na celú šírku", bool(m["footer"]) and abs(m["footer"]["w"] - m["clientW"]) <= 1,
                      str(m["footer"]))

                await snapshot(page, f"{label} vizuál stránky", key)
                await snapshot(page, f"{label} vizuál hlavičky", key + "_header", "header")
                await snapshot(page, f"{label} vizuál pätičky", key + "_footer", "footer")

            await context.close()
        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n=== {len(results) - len(failed)}/{len(results)} OK ===")
    for label, _, extra in failed:
        print("FAIL:", label, extra)
    return 1 if failed else 0


sys.exit(asyncio.run(run()))
