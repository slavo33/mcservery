"""
E2E regresný test: rozloženie stránky detailu servera (`/server/:slug`).

Overuje:
 1. prítomnosť a poradie sekcií v DOM-e podľa `data-detail-section`
    (media → gallery → owner → title → description → loader-info →
     minigames → links → ip → votes → comments),
 2. že poradie je zhodné aj vizuálne (rastúca vertikálna pozícia),
 3. že sekcia loader-info obsahuje platformu (Java/Bedrock), software (loader)
    a odznak verzie, a že minihry sú vždy až ZA loader informáciami,
 4. že layout sa nezlomí pri veľmi dlhých popisoch a názvoch — vloží sa
    dlhý text (aj bez medzier) a kontroluje sa absencia horizontálneho
    overflow, neprekrývanie sekcií a zachované poradie,
 5. to isté na mobilnom (390px), tablet (768px) aj desktop (1440px) breakpointe.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/server_detail_sections_e2e.py
    E2E_MAX_SERVERS=3 python3 e2e/server_detail_sections_e2e.py
"""
import asyncio
import os
import sys

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
MAX_SERVERS = int(os.environ.get("E2E_MAX_SERVERS", "3"))

# Kanonické poradie sekcií; voliteľné sekcie sa preskočia ak chýbajú.
ORDER = [
    "media", "gallery", "owner", "title", "description",
    "loader-info", "minigames", "links", "ip", "votes", "comments",
]
REQUIRED = {"media", "owner", "title", "description", "loader-info", "ip", "votes", "comments"}

BREAKPOINTS = [("mobil", 390, 844), ("tablet", 768, 1024), ("desktop", 1440, 900)]

LONG_WORD = "Superdlhynazovbezmedzier" * 12
LONG_TEXT = ("Toto je veľmi dlhý popis servera. " * 60) + " " + LONG_WORD

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


async def read_sections(page):
    return await page.evaluate(
        """() => Array.from(document.querySelectorAll('[data-detail-section]')).map(el => {
             const r = el.getBoundingClientRect();
             return {
               name: el.getAttribute('data-detail-section'),
               top: r.top + window.scrollY,
               bottom: r.bottom + window.scrollY,
               right: r.right,
               width: r.width,
               text: (el.textContent || '').trim().slice(0, 400),
             };
           })"""
    )


async def overflow_info(page):
    return await page.evaluate(
        """() => ({
             docWidth: document.documentElement.scrollWidth,
             clientWidth: document.documentElement.clientWidth,
             offenders: Array.from(document.querySelectorAll('main *'))
               .filter(el => el.getBoundingClientRect().right >
                             document.documentElement.clientWidth + 1)
               .slice(0, 5)
               .map(el => el.tagName + '.' + (el.className || '').toString().slice(0, 60)),
           })"""
    )


async def audit(page, label, expect_long=False):
    secs = await read_sections(page)
    names = [s["name"] for s in secs]

    check(f"[{label}] sekcie majú data-detail-section", len(names) >= len(REQUIRED), str(names))

    missing = sorted(REQUIRED - set(names))
    check(f"[{label}] všetky povinné sekcie sú prítomné", not missing, ", ".join(missing))

    # poradie v DOM-e
    idx = [ORDER.index(n) for n in names if n in ORDER]
    check(f"[{label}] poradie sekcií v DOM zodpovedá špecifikácii",
          idx == sorted(idx), " → ".join(names))

    unknown = [n for n in names if n not in ORDER]
    check(f"[{label}] žiadne neznáme sekcie", not unknown, ", ".join(unknown))

    # vizuálne poradie
    tops = [s["top"] for s in secs if s["name"] in ORDER]
    check(f"[{label}] vizuálne poradie (top) je rastúce",
          all(a <= b + 1 for a, b in zip(tops, tops[1:])),
          str([round(t) for t in tops]))

    by = {s["name"]: s for s in secs}

    # loader informácie
    li = by.get("loader-info")
    if li:
        has_platform = await page.locator("[data-detail-section='loader-info'] [data-server-platform]").count()
        has_software = await page.locator("[data-detail-section='loader-info'] [data-server-software]").count()
        check(f"[{label}] loader-info obsahuje platformu", has_platform > 0)
        check(f"[{label}] loader-info obsahuje software/loader", has_software > 0)

    if "minigames" in by and li:
        check(f"[{label}] minihry sú až za loader informáciami",
              by["minigames"]["top"] >= li["bottom"] - 1,
              f"minigames.top={round(by['minigames']['top'])} loader.bottom={round(li['bottom'])}")

    if "gallery" in by and "media" in by:
        check(f"[{label}] galéria nasleduje po hlavnom médiu",
              by["gallery"]["top"] >= by["media"]["top"])

    # neprekrývanie susedných sekcií
    ordered = [s for s in secs if s["name"] in ORDER]
    overlaps = [f"{a['name']}/{b['name']}" for a, b in zip(ordered, ordered[1:])
                if b["top"] + 1 < a["top"]]
    check(f"[{label}] sekcie sa neprekrývajú v nesprávnom poradí", not overlaps, ", ".join(overlaps))

    # overflow
    ov = await overflow_info(page)
    check(f"[{label}] žiadny horizontálny overflow",
          ov["docWidth"] <= ov["clientWidth"] + 1,
          f"{ov['docWidth']} > {ov['clientWidth']} ({', '.join(ov['offenders'])})")

    desc = by.get("description")
    if desc:
        check(f"[{label}] popis sa zmestí do šírky kontajnera",
              desc["right"] <= ov["clientWidth"] + 1,
              f"right={round(desc['right'])} client={ov['clientWidth']}")
        if expect_long:
            check(f"[{label}] dlhý popis sa zalamuje (viacriadkový, bez orezania)",
                  desc["bottom"] - desc["top"] > 60,
                  f"výška={round(desc['bottom'] - desc['top'])}px")


async def inject_long_content(page):
    """Nasimuluje extrémne dlhý popis a názov priamo v DOM-e."""
    await page.evaluate(
        """([text, word]) => {
             const d = document.querySelector('[data-detail-section="description"]');
             if (d) d.textContent = text;
             const h1 = document.querySelector('h1');
             if (h1) h1.textContent = word;
           }""",
        [LONG_TEXT, LONG_WORD],
    )
    await page.wait_for_timeout(300)


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 1800})
        page = await context.new_page()

        await page.goto(BASE + "/servers", wait_until="domcontentloaded")
        await page.wait_for_timeout(2500)
        hrefs = await page.eval_on_selector_all(
            'a[href^="/server/"]',
            "els => Array.from(new Set(els.map(e => e.getAttribute('href'))))",
        )
        hrefs = [h for h in hrefs if h and h.count("/") == 2 and not h.endswith("/edit")][:MAX_SERVERS]
        check("našli sa profily serverov", len(hrefs) > 0, f"{len(hrefs)} profilov")
        if not hrefs:
            await browser.close()
            sys.exit(1)

        for href in hrefs:
            slug = href.rsplit("/", 1)[-1]
            for bp, w, h in BREAKPOINTS:
                await page.set_viewport_size({"width": w, "height": h})
                await page.goto(BASE + href, wait_until="domcontentloaded")
                await page.wait_for_timeout(2200)
                await audit(page, f"{slug} @{bp}")
                await inject_long_content(page)
                await audit(page, f"{slug} @{bp} dlhý popis", expect_long=True)

        await browser.close()

    ok = sum(1 for _, o, _ in results if o)
    print(f"\n{ok}/{len(results)} kontrol OK")
    sys.exit(0 if ok == len(results) else 1)


asyncio.run(main())
