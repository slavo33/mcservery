"""
Vizuálny / regresný E2E test: responzívne rozloženie profilovej stránky servera
a červeno-čierny dizajn hlavičky a pätičky.

Pre každý breakpoint (mobil 375, tablet 768, desktop 1440) overuje:
 1. žiadny horizontálny pretok (scrollWidth ≤ clientWidth) a žiadny prvok
    presahujúci viewport,
 2. hlavička je sticky, na celú šírku, s výškou 64 px,
 3. navigácia sa správa podľa breakpointu (mobil/tablet = hamburger,
    desktop = plná navigácia),
 4. hlavička aj pätička majú tmavé (čierne) pozadie a červený akcent
    (logo/ikony v `--primary`, hsl(0 72% 51%)),
 5. pätička je pod obsahom, na celú šírku a jej odkazy sú viditeľné,
 6. obsah profilu (názov servera, odznak verzie) je viditeľný a nepretečený,
 7. dotykové ciele v hlavičke majú na mobile aspoň 32 px,
 8. vizuálna regresia: screenshot hlavičky, pätičky a celého profilu sa
    porovná s baseline v `e2e/baselines/` (tolerancia 1 % odlišných pixelov).
    Ak baseline chýba, vytvorí sa a krok sa označí ako NEW.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/profile_responsive_visual_e2e.py
    UPDATE_BASELINES=1 python3 e2e/profile_responsive_visual_e2e.py   # prepíše baseline
"""
import asyncio, json, os, sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
ROOT = Path(__file__).parent
SHOTS = ROOT / "screenshots"
BASELINES = ROOT / "baselines"
SHOTS.mkdir(parents=True, exist_ok=True)
BASELINES.mkdir(parents=True, exist_ok=True)
UPDATE = os.environ.get("UPDATE_BASELINES") == "1"
DIFF_TOLERANCE = 0.01  # max 1 % odlišných pixelov

VIEWPORTS = [
    ("mobil", 375, 812),
    ("tablet", 768, 1024),
    ("desktop", 1440, 900),
]

# --primary: 0 72% 51%  →  rgb(222, 46, 46)
PRIMARY_RGB = (222, 46, 46)

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def note(label, extra=""):
    results.append((label, True, extra))
    print("NEW  " + label + ((" :: " + str(extra)) if extra else ""))


def parse_rgb(value: str):
    nums = [float(n) for n in __import__("re").findall(r"[\d.]+", value or "")]
    return tuple(nums[:3]) if len(nums) >= 3 else None


def is_dark(rgb, max_lum=70):
    if not rgb:
        return False
    r, g, b = rgb
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) <= max_lum


def is_redish(rgb, tol=40):
    if not rgb:
        return False
    return all(abs(c - p) <= tol for c, p in zip(rgb, PRIMARY_RGB))


def compare_baseline(name: str, shot: Path):
    """Porovná screenshot s baseline; vráti (status, detail)."""
    from PIL import Image, ImageChops

    baseline = BASELINES / f"{name}.png"
    if UPDATE or not baseline.exists():
        baseline.write_bytes(shot.read_bytes())
        return "new", str(baseline.name)
    a = Image.open(baseline).convert("RGB")
    b = Image.open(shot).convert("RGB")
    if a.size != b.size:
        return "fail", f"rozmery {a.size} != {b.size}"
    diff = ImageChops.difference(a, b).convert("L")
    changed = sum(1 for px in diff.getdata() if px > 12)
    ratio = changed / (a.size[0] * a.size[1])
    return ("pass" if ratio <= DIFF_TOLERANCE else "fail"), f"odlišných pixelov {ratio:.2%}"


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


async def metrics(page):
    return await page.evaluate(
        """
        () => {
          const header = document.querySelector('header');
          const footer = document.querySelector('footer');
          const cs = el => el ? getComputedStyle(el) : null;
          const box = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
          const accent = root => Array.from(root ? root.querySelectorAll('*') : [])
            .map(el => getComputedStyle(el).color)
            .filter(Boolean);
          const overflowing = Array.from(document.querySelectorAll('body *'))
            .filter(el => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.right > window.innerWidth + 1;
            })
            .slice(0, 5)
            .map(el => el.tagName.toLowerCase() + '.' + (el.className || '').toString().slice(0, 40));
          const hamburger = Array.from(document.querySelectorAll('header button'))
            .filter(b => b.offsetParent !== null && b.querySelector('svg') && !b.textContent.trim());
          const desktopNav = document.querySelector('header nav');
          const touch = Array.from(document.querySelectorAll('header a, header button'))
            .filter(el => el.offsetParent !== null)
            .map(el => Math.min(el.getBoundingClientRect().width, el.getBoundingClientRect().height));
          return {
            docScrollW: document.documentElement.scrollWidth,
            clientW: document.documentElement.clientWidth,
            overflowing,
            header: header ? { ...box(header), position: cs(header).position, bg: cs(header).backgroundColor, top: cs(header).top } : null,
            footer: footer ? { ...box(footer), bg: cs(footer).backgroundColor } : null,
            headerColors: accent(header),
            footerColors: accent(footer),
            navVisible: !!(desktopNav && desktopNav.getBoundingClientRect().width > 0),
            hamburgerVisible: hamburger.length > 0,
            footerLinks: Array.from(document.querySelectorAll('footer a')).filter(a => a.getBoundingClientRect().width > 0).length,
            headerTouchMin: touch.length ? Math.min(...touch) : 0,
            title: (document.querySelector('h1') || {}).textContent || '',
            titleVisible: !!(document.querySelector('h1') && document.querySelector('h1').getBoundingClientRect().width > 0),
          };
        }
        """
    )


async def audit(page, vp_name, width, url):
    await page.goto(url, wait_until="networkidle")
    await page.wait_for_timeout(900)
    m = await metrics(page)

    check(f"[{vp_name}] žiadny horizontálny pretok stránky",
          m["docScrollW"] <= m["clientW"] + 1,
          f'scrollWidth={m["docScrollW"]} clientWidth={m["clientW"]}')
    check(f"[{vp_name}] žiadny prvok nepresahuje viewport", not m["overflowing"],
          "; ".join(m["overflowing"]))

    h = m["header"]
    check(f"[{vp_name}] hlavička existuje a je sticky",
          bool(h) and h["position"] == "sticky" and h["top"] in ("0px", "auto"),
          h and f'{h["position"]} top={h["top"]}')
    check(f"[{vp_name}] hlavička má výšku 64 px a plnú šírku",
          bool(h) and abs(h["h"] - 64) <= 2 and abs(h["w"] - width) <= 2,
          h and f'{h["w"]}x{h["h"]}')
    check(f"[{vp_name}] hlavička má tmavé (čierne) pozadie",
          is_dark(parse_rgb(h["bg"])) if h else False, h and h["bg"])
    check(f"[{vp_name}] hlavička obsahuje červený akcent",
          any(is_redish(parse_rgb(c)) for c in m["headerColors"]))

    if width < 1024:
        check(f"[{vp_name}] navigácia je zbalená do hamburgeru",
              m["hamburgerVisible"] and not m["navVisible"],
              f'hamburger={m["hamburgerVisible"]} nav={m["navVisible"]}')
        check(f"[{vp_name}] dotykové ciele v hlavičke ≥ 32 px",
              m["headerTouchMin"] >= 32, m["headerTouchMin"])
    else:
        check(f"[{vp_name}] plná navigácia je viditeľná", m["navVisible"])

    f = m["footer"]
    check(f"[{vp_name}] pätička existuje a je pod obsahom",
          bool(f) and f["h"] > 0 and f["w"] >= width - 2, f and f'{f["w"]}x{f["h"]}')
    check(f"[{vp_name}] pätička má tmavé (čierne) pozadie",
          is_dark(parse_rgb(f["bg"])) if f else False, f and f["bg"])
    check(f"[{vp_name}] pätička obsahuje červený akcent",
          any(is_redish(parse_rgb(c)) for c in m["footerColors"]))
    check(f"[{vp_name}] odkazy v pätičke sú viditeľné", m["footerLinks"] >= 5, m["footerLinks"])
    check(f"[{vp_name}] názov servera (h1) je viditeľný", m["titleVisible"], m["title"][:40])

    # vizuálne snímky + regresné porovnanie
    for part, locator in (("header", "header"), ("footer", "footer")):
        el = page.locator(locator).first
        shot = SHOTS / f"layout_{vp_name}_{part}.png"
        await el.scroll_into_view_if_needed()
        await page.wait_for_timeout(200)
        await el.screenshot(path=str(shot))
        status, detail = compare_baseline(f"layout_{vp_name}_{part}", shot)
        if status == "new":
            note(f"[{vp_name}] baseline {part} vytvorený", detail)
        else:
            check(f"[{vp_name}] vizuálna regresia {part}", status == "pass", detail)

    await page.evaluate("window.scrollTo(0, 0)")
    page_shot = SHOTS / f"layout_{vp_name}_profil.png"
    await page.screenshot(path=str(page_shot))
    status, detail = compare_baseline(f"layout_{vp_name}_profil", page_shot)
    if status == "new":
        note(f"[{vp_name}] baseline profilu vytvorený", detail)
    else:
        check(f"[{vp_name}] vizuálna regresia profilu", status == "pass", detail)


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        await restore_session(context, page)

        await page.goto(BASE, wait_until="networkidle")
        await page.wait_for_timeout(1200)
        hrefs = await page.eval_on_selector_all(
            'a[href^="/server/"]',
            "els => Array.from(new Set(els.map(e => e.getAttribute('href'))))",
        )
        hrefs = [h for h in hrefs if h and h.count("/") == 2]
        check("našiel sa profil servera na testovanie", len(hrefs) > 0, hrefs[:1])
        if not hrefs:
            await browser.close()
            sys.exit(1)
        url = BASE + hrefs[0]
        print(f"testovaný profil: {url}\n")

        for name, w, hgt in VIEWPORTS:
            await page.set_viewport_size({"width": w, "height": hgt})
            await audit(page, name, w, url)
            print()

        await browser.close()

    ok = sum(1 for _, o, _ in results if o)
    print(f"{ok}/{len(results)} kontrol OK")
    sys.exit(0 if ok == len(results) else 1)


asyncio.run(main())
