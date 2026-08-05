"""
E2E test: render verejných stránok na rôznych šírkach (mobil / tablet / desktop).

Pre každú verejnú URL (statické route + vzorka zo sitemapy) a každý breakpoint
(360, 375, 768, 1024, 1280, 1920 px) overuje:

 1. **žiadny horizontálny pretok dokumentu** — `documentElement.scrollWidth`
    nepresiahne šírku viewportu (tolerancia 1 px),
 2. **žiadny prvok mimo layout kontajner** — každý viditeľný element sa vojde
    do šírky viewportu (pravý okraj ≤ šírka + 1 px, ľavý okraj ≥ -1 px),
 3. **obsah nepretečie svoj kontajner** — `scrollWidth` prvku nepresiahne jeho
    `clientWidth` (odhalí dlhé IP adresy, URL a nadpisy bez zalomenia),
 4. **žiadne orezané texty** — text s `overflow: hidden` nemá väčšiu prirodzenú
    šírku než jeho box (mimo zámerného `text-overflow: ellipsis` / `line-clamp`),
 5. **hlavička a pätička** sú na plnú šírku viewportu a viditeľné,
 6. **hlavný obsah `main`** má nenulovú výšku (stránka sa naozaj vyrenderovala),
 7. **dotykové ciele** (odkazy a tlačidlá v hlavičke) majú na mobile aspoň 32 px,
 8. **žiadne chyby v konzole** počas renderu.

Screenshoty problémových stavov sa ukladajú do `e2e/screenshots/`.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/responsive_overflow_e2e.py
    E2E_MAX_URLS=8 python3 e2e/responsive_overflow_e2e.py
"""
import asyncio
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree as ET

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
ROOT = Path(__file__).parent
SHOTS = ROOT / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
MAX_URLS = int(os.environ.get("E2E_MAX_URLS", "5"))
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")

STATIC_PUBLIC = ["/", "/servers", "/staff", "/vip"]

VIEWPORTS = [
    ("mobil-360", 360, 780),
    ("mobil-375", 375, 812),
    ("tablet-768", 768, 1024),
    ("tablet-1024", 1024, 768),
    ("desktop-1280", 1280, 900),
    ("desktop-1920", 1920, 1080),
]

TOLERANCE = 1  # px
MIN_TOUCH = 32  # px na mobile

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b""
    except Exception as e:
        return 0, str(e).encode()


def norm(path):
    path = (path or "/").split("?")[0].split("#")[0]
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]
    return path or "/"


def sitemap_paths():
    paths = []
    status, body = fetch(BASE + "/sitemap.xml")
    body = body.decode("utf-8", "replace")
    if status != 200 or not body.strip():
        return paths
    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        return paths
    locs = []
    if root.tag.endswith("sitemapindex"):
        for sm in root.findall("sm:sitemap/sm:loc", NS):
            s, b = fetch(sm.text.strip())
            b = b.decode("utf-8", "replace")
            if s != 200 or not b.strip():
                continue
            try:
                sub = ET.fromstring(b)
            except ET.ParseError:
                continue
            locs.extend(sub.findall("sm:url/sm:loc", NS))
    else:
        locs = root.findall("sm:url/sm:loc", NS)
    for loc in locs:
        paths.append(norm(urlparse(loc.text.strip()).path))
    return paths


# Prehliadačová analýza rozloženia — vracia prvky, ktoré pretekajú.
LAYOUT_JS = """
() => {
    const vw = document.documentElement.clientWidth;
    const desc = (el) => {
        const cls = (el.getAttribute('class') || '').split(/\\s+/).slice(0, 3).join('.');
        const txt = (el.textContent || '').trim().slice(0, 40);
        return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}${txt ? ' "' + txt + '"' : ''}`;
    };
    const visible = (el, r, st) =>
        r.width > 0 && r.height > 0 &&
        st.visibility !== 'hidden' && st.display !== 'none' && st.opacity !== '0';

    const outside = [];
    const selfOverflow = [];
    const clipped = [];

    for (const el of Array.from(document.body.querySelectorAll('*'))) {
        const st = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (!visible(el, r, st)) continue;
        if (st.position === 'fixed' && r.width <= vw + 1 && r.left >= -1) {
            // fixné prvky (napr. dialógy) kontrolujeme rovnako, len bez scrollu
        }
        if (r.right > vw + 1 || r.left < -1) {
            outside.push({ el: desc(el), left: Math.round(r.left), right: Math.round(r.right) });
        }
        const scrollsX = ['auto', 'scroll'].includes(st.overflowX);
        if (!scrollsX && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
            selfOverflow.push({
                el: desc(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
            });
        }
        // Orezaný text bez zámerného ellipsis / line-clamp.
        const leaf = el.children.length === 0 && (el.textContent || '').trim().length > 0;
        if (leaf && st.overflowX === 'hidden' && st.textOverflow !== 'ellipsis'
            && st.webkitLineClamp === 'none' && el.scrollWidth > el.clientWidth + 1) {
            clipped.push({ el: desc(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
        }
    }

    const rectOf = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
    };

    const smallTargets = Array.from(document.querySelectorAll('header a, header button'))
        .filter((el) => {
            const r = el.getBoundingClientRect();
            const st = getComputedStyle(el);
            return visible(el, r, st) && (r.width < 32 || r.height < 32);
        })
        .map((el) => ({ el: desc(el), w: Math.round(el.getBoundingClientRect().width),
                        h: Math.round(el.getBoundingClientRect().height) }));

    return {
        vw,
        docScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        outside: outside.slice(0, 6),
        outsideCount: outside.length,
        selfOverflow: selfOverflow.slice(0, 6),
        selfOverflowCount: selfOverflow.length,
        clipped: clipped.slice(0, 6),
        clippedCount: clipped.length,
        header: rectOf('header'),
        footer: rectOf('footer'),
        main: rectOf('main'),
        smallTargets: smallTargets.slice(0, 6),
    };
}
"""


async def main():
    sm = [p for p in sitemap_paths() if p.startswith("/server/")]
    paths = []
    for p in STATIC_PUBLIC + sm:
        if p not in paths:
            paths.append(p)
    paths = paths[:MAX_URLS]
    check("máme verejné URL na kontrolu", len(paths) > 0, paths)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)

        for name, width, height in VIEWPORTS:
            ctx = await browser.new_context(
                viewport={"width": width, "height": height},
                user_agent=UA,
                device_scale_factor=1,
                is_mobile=width < 768,
                has_touch=width < 768,
            )
            page = await ctx.new_page()
            errors = []
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(str(e)))

            for path in paths:
                label = f"[{name} {width}px {path}]"
                errors.clear()
                await page.goto(BASE + path, wait_until="networkidle")
                await page.wait_for_timeout(400)
                m = await page.evaluate(LAYOUT_JS)

                ok_doc = m["docScrollWidth"] <= width + TOLERANCE
                check(f"{label} žiadny horizontálny pretok dokumentu", ok_doc,
                      f"scrollWidth={m['docScrollWidth']} vw={width}")
                check(f"{label} body nepresahuje viewport",
                      m["bodyScrollWidth"] <= width + TOLERANCE, m["bodyScrollWidth"])

                ok_outside = m["outsideCount"] == 0
                check(f"{label} žiadny prvok mimo layout kontajner", ok_outside,
                      m["outside"] if not ok_outside else "")

                ok_self = m["selfOverflowCount"] == 0
                check(f"{label} žiadny obsah nepretečie svoj kontajner", ok_self,
                      m["selfOverflow"] if not ok_self else "")

                ok_clip = m["clippedCount"] == 0
                check(f"{label} žiadny nechcene orezaný text", ok_clip,
                      m["clipped"] if not ok_clip else "")

                hdr, ftr, mn = m["header"], m["footer"], m["main"]
                check(f"{label} hlavička je na plnú šírku",
                      bool(hdr) and abs(hdr["w"] - width) <= 2, hdr)
                check(f"{label} pätička je na plnú šírku",
                      bool(ftr) and abs(ftr["w"] - width) <= 2, ftr)
                check(f"{label} hlavný obsah sa vyrenderoval",
                      bool(mn) and mn["h"] > 100, mn)

                if width < 768:
                    check(f"{label} dotykové ciele v hlavičke ≥ {MIN_TOUCH} px",
                          len(m["smallTargets"]) == 0, m["smallTargets"])

                check(f"{label} bez chýb v konzole", len(errors) == 0, errors[:3])

                if not (ok_doc and ok_outside and ok_self and ok_clip):
                    slug = path.strip("/").replace("/", "_") or "home"
                    await page.screenshot(path=str(SHOTS / f"overflow_{name}_{slug}.png"))

            await ctx.close()

        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} OK")
    if failed:
        for lbl, _, extra in failed:
            print("FAILED:", lbl, extra)
        sys.exit(1)


asyncio.run(main())
