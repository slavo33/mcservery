"""
E2E test dostupnosti (axe-core) na verejných stránkach.

Pre každú verejnú URL a každý breakpoint (mobil / desktop) spustí axe-core
a nahlási porušenia WCAG 2.1 A/AA, najmä:

 1. **nedostatočný kontrast textu** (`color-contrast`),
 2. **nesprávna štruktúra nadpisov** (`heading-order`, `page-has-heading-one`,
    `empty-heading`),
 3. **chýbajúce aria / prístupné názvy** (`button-name`, `link-name`,
    `image-alt`, `label`, `aria-*` pravidlá),
 4. **landmarky a jazyk dokumentu** (`region`, `landmark-one-main`,
    `html-has-lang`, `document-title`),
 5. **duplicitné id v ARIA** (`duplicate-id-aria`).

Každé porušenie sa vypíše s pravidlom, závažnosťou, počtom uzlov, selektorom
a odkazom na dokumentáciu. Screenshot problémovej stránky sa ukladá do
`e2e/screenshots/`, plný JSON report do `e2e/a11y-report.json`.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/accessibility_axe_e2e.py
    E2E_MAX_URLS=8 python3 e2e/accessibility_axe_e2e.py
    E2E_A11Y_FAIL_ON=serious python3 e2e/accessibility_axe_e2e.py
"""
import asyncio
import json
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
REPORT = ROOT / "a11y-report.json"
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
MAX_URLS = int(os.environ.get("E2E_MAX_URLS", "4"))

AXE_PATH = Path(__file__).resolve().parents[1] / "node_modules" / "axe-core" / "axe.min.js"

STATIC_PUBLIC = ["/", "/servers", "/staff", "/vip", "/terms", "/privacy"]

VIEWPORTS = [
    ("mobil-390", 390, 844),
    ("desktop-1280", 1280, 900),
]

# Závažnosti, ktoré test považuje za chybu (ostatné sa iba vypíšu).
SEVERITY_ORDER = ["minor", "moderate", "serious", "critical"]
FAIL_ON = os.environ.get("E2E_A11Y_FAIL_ON", "serious")
FAIL_LEVEL = SEVERITY_ORDER.index(FAIL_ON) if FAIL_ON in SEVERITY_ORDER else 2

AXE_OPTIONS = {
    "runOnly": {"type": "tag", "values": ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]},
    "resultTypes": ["violations"],
}

results = []
violations_all = []


def check(ok: bool, label: str, detail: str = "") -> bool:
    results.append((ok, label, detail))
    print(("  OK   " if ok else "  FAIL ") + label + (f" — {detail}" if detail else ""))
    return ok


def fetch_sitemap_urls(limit: int):
    urls = []
    try:
        req = urllib.request.Request(f"{BASE}/sitemap.xml", headers={"User-Agent": "a11y-e2e"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            root = ET.fromstring(resp.read())
    except (urllib.error.URLError, ET.ParseError, OSError) as exc:
        print(f"  (sitemap.xml nedostupná: {exc})")
        return urls
    for loc in root.findall(".//sm:url/sm:loc", NS):
        path = urlparse((loc.text or "").strip()).path or "/"
        if path not in STATIC_PUBLIC and path not in urls:
            urls.append(path)
        if len(urls) >= limit:
            break
    return urls


async def analyse(page, path: str, vp_name: str):
    await page.add_script_tag(path=str(AXE_PATH))
    return await page.evaluate(
        "opts => axe.run(document, opts).then(r => ({violations: r.violations}))",
        AXE_OPTIONS,
    )


async def main():
    if not AXE_PATH.exists():
        print(f"CHYBA: axe-core sa nenašiel na {AXE_PATH} (spusti `bun add -d axe-core`)")
        return 1

    paths = STATIC_PUBLIC + fetch_sitemap_urls(MAX_URLS)
    print(f"Kontrolujem {len(paths)} verejných URL × {len(VIEWPORTS)} breakpointov")
    print(f"Chybou je závažnosť >= {SEVERITY_ORDER[FAIL_LEVEL]}\n")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        for vp_name, w, h in VIEWPORTS:
            context = await browser.new_context(viewport={"width": w, "height": h})
            page = await context.new_page()
            for path in paths:
                url = f"{BASE}{path}"
                print(f"[{vp_name}] {path}")
                try:
                    resp = await page.goto(url, wait_until="networkidle", timeout=45000)
                except Exception as exc:  # noqa: BLE001
                    check(False, f"{path} [{vp_name}] načítanie stránky", str(exc)[:160])
                    continue
                if resp is not None and resp.status >= 400:
                    check(False, f"{path} [{vp_name}] HTTP status", f"{resp.status}")
                    continue
                await page.wait_for_timeout(700)

                try:
                    report = await analyse(page, path, vp_name)
                except Exception as exc:  # noqa: BLE001
                    check(False, f"{path} [{vp_name}] beh axe-core", str(exc)[:160])
                    continue

                viols = report.get("violations", [])
                blocking = [v for v in viols
                            if SEVERITY_ORDER.index(v.get("impact") or "minor") >= FAIL_LEVEL]

                for v in viols:
                    nodes = v.get("nodes", [])
                    violations_all.append({
                        "url": path,
                        "viewport": vp_name,
                        "rule": v.get("id"),
                        "impact": v.get("impact"),
                        "help": v.get("help"),
                        "helpUrl": v.get("helpUrl"),
                        "count": len(nodes),
                        "targets": [
                            ", ".join(map(str, n.get("target", []))) for n in nodes[:5]
                        ],
                        "summary": [
                            (n.get("failureSummary") or "").replace("\n", " ")[:200]
                            for n in nodes[:3]
                        ],
                    })
                    marker = "✖" if v in blocking else "•"
                    print(f"    {marker} [{v.get('impact')}] {v.get('id')}: "
                          f"{v.get('help')} ({len(nodes)}×)")
                    for n in nodes[:3]:
                        print(f"        → {', '.join(map(str, n.get('target', [])))}")
                    print(f"        {v.get('helpUrl')}")

                if blocking:
                    shot = SHOTS / f"a11y_{vp_name}_{path.strip('/').replace('/', '_') or 'home'}.png"
                    try:
                        await page.screenshot(path=str(shot))
                    except Exception:  # noqa: BLE001
                        pass

                check(
                    not blocking,
                    f"{path} [{vp_name}] axe-core bez závažných porušení",
                    ", ".join(f"{v['id']}({v['impact']})" for v in blocking) if blocking else
                    (f"{len(viols)} drobných upozornení" if viols else "0 porušení"),
                )
            await context.close()
        await browser.close()

    REPORT.write_text(json.dumps(violations_all, indent=2, ensure_ascii=False), encoding="utf-8")

    passed = sum(1 for ok, _, _ in results if ok)
    total = len(results)
    print(f"\nVýsledok: {passed}/{total} kontrol prešlo")
    print(f"Report: {REPORT}")
    if passed != total:
        print("\nZlyhané kontroly:")
        for ok, label, detail in results:
            if not ok:
                print(f"  - {label}: {detail}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
