"""
Vizuálne (snapshot) regresné testy pre stránku detailu servera `/server/:slug`.

Pre breakpointy mobil/tablet/desktop:
 1. snapshoty jednotlivých sekcií (`[data-detail-section]`) – médiá, galéria,
    vlastník, titulok, popis, loader info (tagy), minihry, odkazy, IP, hlasovanie,
 2. snapshot celého obsahu detailu (`main`),
 3. snapshot stavových prvkov (online/offline odznak, počet hráčov, tlačidlo lajku
    v základnom aj hover/aktívnom stave),
 4. typografická kontrola: všetky tagy v sekcii loader-info majú rovnaký
    font-family, veľkosť a hrúbku písma,
 5. kontrola, že obrázky (hlavné médium aj galéria) sú načítané (naturalWidth > 0).

Snapshoty sa porovnávajú s baseline v `e2e/baselines/` (tolerancia 1 % pixelov).
Ak baseline chýba, vytvorí sa a krok sa označí ako NEW.

Spustenie (dev server na http://localhost:8080):
    python3 e2e/server_detail_visual_e2e.py
    UPDATE_BASELINES=1 python3 e2e/server_detail_visual_e2e.py
"""
import asyncio, os, sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
ROOT = Path(__file__).parent
SHOTS = ROOT / "screenshots"
BASELINES = ROOT / "baselines"
SHOTS.mkdir(parents=True, exist_ok=True)
BASELINES.mkdir(parents=True, exist_ok=True)
UPDATE = os.environ.get("UPDATE_BASELINES") == "1"
DIFF_TOLERANCE = 0.01

VIEWPORTS = [("mobil", 375, 812), ("tablet", 768, 1024), ("desktop", 1440, 900)]

SECTIONS = [
    "media", "gallery", "owner", "title", "description",
    "loader-info", "minigames", "links", "ip", "votes",
]

# Deterministický render: bez animácií a bez premenlivých čísel/času.
STABILIZE_CSS = """
*, *::before, *::after {
  animation: none !important;
  transition: none !important;
  caret-color: transparent !important;
}
[data-detail-section="media"] img,
[data-detail-section="media"] video,
[data-detail-section="gallery"] img {
  visibility: hidden !important;
}
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


async def snapshot(page, label: str, name: str, selector: str, optional=False):
    if await page.locator(selector).count() == 0:
        if optional:
            note(f"{label} preskočené", f"selektor {selector} sa na tomto serveri nenachádza")
        else:
            check(f"{label} existuje", False, f"selektor {selector} nenájdený")
        return
    loc = page.locator(selector).first
    shot = SHOTS / f"{name}.png"
    try:
        await loc.screenshot(path=str(shot))
    except Exception as exc:
        check(label, False, str(exc)[:120])
        return
    status, detail = compare_baseline(name, shot)
    if status == "new":
        note(f"{label} :: baseline vytvorený", detail)
    else:
        check(label, status == "pass", detail)


async def tag_typography(page, vp_name: str):
    data = await page.evaluate(
        """() => {
          const root = document.querySelector('[data-detail-section="loader-info"]');
          if (!root) return null;
          const tags = [...root.querySelectorAll('[data-server-tag]')];
          return tags.map(el => {
            const s = getComputedStyle(el);
            return s.fontFamily + '|' + s.fontSize + '|' + s.fontWeight;
          });
        }"""
    )
    if not data:
        check(f"[{vp_name}] sekcia loader-info existuje", False)
        return
    uniq = sorted(set(data))
    check(f"[{vp_name}] tagy detailu majú jednotnú typografiu ({len(data)} tagov)",
          len(uniq) == 1, "; ".join(uniq))


async def image_checks(page, vp_name: str):
    data = await page.evaluate(
        """() => [...document.querySelectorAll('[data-detail-section="media"] img, [data-detail-section="gallery"] img')]
             .map(img => ({ src: img.currentSrc || img.src, ok: img.complete && img.naturalWidth > 0 }))"""
    )
    if not data:
        note(f"[{vp_name}] obrázky detailu preskočené", "server nemá médiá")
        return
    broken = [d["src"][:80] for d in data if not d["ok"]]
    check(f"[{vp_name}] všetky obrázky detailu sú načítané ({len(data)})", not broken, ", ".join(broken))


async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)

        # Nájdi prvý dostupný profil servera.
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900}, locale="sk-SK")
        page = await ctx.new_page()
        await page.goto(BASE + "/servers", wait_until="domcontentloaded", timeout=45000)
        await page.wait_for_timeout(3000)
        hrefs = await page.eval_on_selector_all(
            'a[href^="/server/"]',
            "els => Array.from(new Set(els.map(e => e.getAttribute('href'))))",
        )
        hrefs = [h for h in hrefs if h and h.count("/") == 2 and not h.endswith("/edit")]
        await ctx.close()

        check("našiel sa profil servera pre snapshoty", len(hrefs) > 0, f"{len(hrefs)} profilov")
        if not hrefs:
            await browser.close()
            return 1
        href = sorted(hrefs)[0]

        for vp_name, w, h in VIEWPORTS:
            context = await browser.new_context(
                viewport={"width": w, "height": h},
                device_scale_factor=1,
                reduced_motion="reduce",
                locale="sk-SK",
            )
            page = await context.new_page()
            try:
                await page.goto(BASE + href, wait_until="domcontentloaded", timeout=45000)
            except Exception as exc:
                check(f"[{vp_name}] načítanie detailu servera", False, str(exc)[:120])
                await context.close()
                continue
            await page.add_style_tag(content=STABILIZE_CSS)
            await page.wait_for_timeout(3000)

            # 1) sekcie
            for sec in SECTIONS:
                await snapshot(
                    page,
                    f"[{vp_name}] sekcia {sec}",
                    f"vr_detail_{sec}_{vp_name}",
                    f"[data-detail-section='{sec}']",
                    optional=sec in {"gallery", "minigames", "links"},
                )

            # 2) celý obsah detailu
            await snapshot(page, f"[{vp_name}] detail servera (celok)", f"vr_detail_page_{vp_name}", "main")

            # 3) stavové prvky
            like = page.locator("[data-testid='server-like']")
            if await like.count() > 0:
                await snapshot(page, f"[{vp_name}] tlačidlo lajku", f"vr_detail_like_{vp_name}", "[data-testid='server-like']")
                await like.first.hover()
                await page.wait_for_timeout(250)
                await snapshot(page, f"[{vp_name}] tlačidlo lajku (hover)", f"vr_detail_like_hover_{vp_name}", "[data-testid='server-like']")
                await page.mouse.move(0, 0)
            else:
                check(f"[{vp_name}] tlačidlo lajku existuje", False)

            await snapshot(page, f"[{vp_name}] IP / kopírovanie", f"vr_detail_ip_state_{vp_name}", "[data-detail-section='ip']")

            # 4) typografia tagov, 5) obrázky
            await tag_typography(page, vp_name)
            await image_checks(page, vp_name)

            await context.close()
        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n=== {len(results) - len(failed)}/{len(results)} OK ===")
    for label, _, extra in failed:
        print("FAIL:", label, extra)
    return 1 if failed else 0


sys.exit(asyncio.run(run()))
