"""
SEO a performance rozpočty pre stránku `/servers`.

Test číta prahy z `budgets/servers-budget.json` (jediný zdroj pravdy, zhodný
s Lighthouse rozpočtami) a pri každej zmene UI overí, že:

SEO
  * <title> a <meta name="description"> existujú a majú rozumnú dĺžku,
  * na stránke je práve jeden <h1>,
  * canonical smeruje na /servers a stránka nie je noindex,
  * OpenGraph a Twitter Card metadáta sú kompletné,
  * JSON-LD obsahuje očakávané typy (CollectionPage, BreadcrumbList),
  * <html lang> a viewport sú nastavené, obrázky majú alt,
  * stránka má dosť interných odkazov (crawl budget).

Performance (desktop aj mobil s CPU throttlingom)
  * TTFB, FCP, LCP, DOMContentLoaded, CLS, celkové trvanie long tasks,
  * veľkosť JS/CSS/celkového prenosu a počet requestov.

Spustenie (dev server na http://localhost:8080):
    python3 e2e/servers_seo_perf_budget_e2e.py

Výsledky: `e2e/servers-seo-perf-report.json`.
"""
import asyncio
import json
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
ROOT = Path(__file__).parent
REPORT = ROOT / "servers-seo-perf-report.json"
BUDGET_FILE = ROOT.parent / "budgets" / "servers-budget.json"

BUDGET = json.loads(BUDGET_FILE.read_text(encoding="utf-8"))
SEO = BUDGET["seo"]
PERF = BUDGET["performance"]
PATH = BUDGET.get("path", "/servers")

VIEWPORTS = {
    "desktop": {"width": 1280, "height": 1800},
    "mobile": {"width": 390, "height": 1800},
}

results = []
report = {"budget": BUDGET, "seo": {}, "performance": {}}


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("  OK   " if ok else "  FAIL ") + label + (f" — {extra}" if extra else ""))


COLLECT_JS = """
() => new Promise((resolve) => {
  let cls = 0;
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
  let lcp = null;
  try {
    new PerformanceObserver((l) => {
      const es = l.getEntries();
      if (es.length) lcp = es[es.length - 1].startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
  let longtask = 0;
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) longtask += e.duration;
    }).observe({ type: 'longtask', buffered: true });
  } catch {}
  setTimeout(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime ?? null;
    const res = performance.getEntriesByType('resource');
    const kb = (arr) => arr.reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0) / 1024;
    resolve({
      ttfb: nav.responseStart ?? null,
      dcl: nav.domContentLoadedEventEnd ?? null,
      fcp,
      lcp,
      cls,
      longtask,
      requests: res.length,
      scriptKb: kb(res.filter((r) => r.initiatorType === 'script' || /\\.m?js(\\?|$)/.test(r.name))),
      cssKb: kb(res.filter((r) => r.initiatorType === 'link' || /\\.css(\\?|$)/.test(r.name))),
      totalKb: kb(res),
    });
  }, 3500);
})
"""


async def audit_seo(page):
    await page.goto(f"{BASE}{PATH}", wait_until="domcontentloaded")
    await page.wait_for_timeout(2500)

    data = await page.evaluate(
        """() => {
      const meta = (sel) => document.querySelector(sel)?.getAttribute('content') || '';
      const jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map((s) => { try { return JSON.parse(s.textContent); } catch { return null; } })
        .filter(Boolean);
      const types = [];
      const walk = (n) => {
        if (Array.isArray(n)) return n.forEach(walk);
        if (n && typeof n === 'object') {
          if (n['@type']) types.push(...[].concat(n['@type']));
          if (n['@graph']) walk(n['@graph']);
        }
      };
      walk(jsonld);
      const imgs = [...document.querySelectorAll('main img')];
      return {
        title: document.title || '',
        description: meta('meta[name="description"]'),
        robots: meta('meta[name="robots"]'),
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
        h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
        og: Object.fromEntries(['og:title','og:description','og:type','og:url','og:image']
          .map((p) => [p, meta(`meta[property="${p}"]`) || meta(`meta[name="${p}"]`)])),
        tw: Object.fromEntries(['twitter:card','twitter:title','twitter:description']
          .map((p) => [p, meta(`meta[name="${p}"]`) || meta(`meta[property="${p}"]`)])),
        jsonLdTypes: [...new Set(types)],
        lang: document.documentElement.getAttribute('lang') || '',
        viewport: meta('meta[name="viewport"]'),
        imgsWithoutAlt: imgs.filter((i) => !(i.getAttribute('alt') || '').trim()).length,
        internalLinks: [...document.querySelectorAll('a[href^="/"]')].length,
      };
    }"""
    )
    report["seo"] = data

    t = data["title"]
    check(
        f"SEO: dĺžka <title> ({len(t)} znakov)",
        SEO["titleMinChars"] <= len(t) <= SEO["titleMaxChars"],
        t,
    )
    d = data["description"]
    check(
        f"SEO: dĺžka meta description ({len(d)} znakov)",
        SEO["descriptionMinChars"] <= len(d) <= SEO["descriptionMaxChars"],
        d[:80],
    )
    check(
        f"SEO: počet <h1> = {len(data['h1'])}",
        SEO["minH1"] <= len(data["h1"]) <= SEO["maxH1"],
        "; ".join(data["h1"])[:80],
    )
    if SEO["requireCanonical"]:
        canonical_ok = data["canonical"].rstrip("/").endswith(SEO["canonicalPath"])
        check("SEO: canonical smeruje na /servers", canonical_ok, data["canonical"])
    if SEO["requireIndexable"]:
        check("SEO: stránka nie je noindex", "noindex" not in data["robots"].lower(), data["robots"])
    for prop in SEO["requireOpenGraph"]:
        check(f"SEO: {prop}", bool(data["og"].get(prop)), data["og"].get(prop, "")[:60])
    for prop in SEO["requireTwitter"]:
        check(f"SEO: {prop}", bool(data["tw"].get(prop)), data["tw"].get(prop, "")[:60])
    for typ in SEO["requireJsonLdTypes"]:
        check(f"SEO: JSON-LD typ {typ}", typ in data["jsonLdTypes"], ", ".join(data["jsonLdTypes"]))
    if SEO["requireHtmlLang"]:
        check("SEO: <html lang>", bool(data["lang"]), data["lang"])
    if SEO["requireViewport"]:
        check("SEO: meta viewport", bool(data["viewport"]), data["viewport"][:60])
    check(
        "SEO: všetky obrázky v <main> majú alt",
        data["imgsWithoutAlt"] <= SEO["maxImagesWithoutAlt"],
        f"bez alt: {data['imgsWithoutAlt']}",
    )
    check(
        "SEO: dostatok interných odkazov",
        data["internalLinks"] >= SEO["requireInternalLinksMin"],
        f"{data['internalLinks']}",
    )


async def audit_perf(browser, device):
    budget = PERF[device]
    context = await browser.new_context(viewport=VIEWPORTS[device])
    page = await context.new_page()
    if budget.get("cpuThrottle"):
        client = await context.new_cdp_session(page)
        await client.send("Emulation.setCPUThrottlingRate", {"rate": budget["cpuThrottle"]})
    await page.goto(f"{BASE}{PATH}", wait_until="domcontentloaded")
    m = await page.evaluate(COLLECT_JS)
    report["performance"][device] = m
    await context.close()

    def num(label, value, limit, unit=""):
        if value is None:
            check(f"perf[{device}]: {label} (nemerané)", True, "metrika nedostupná")
            return
        check(
            f"perf[{device}]: {label} {value:.0f}{unit} ≤ {limit}{unit}",
            value <= limit,
        )

    num("TTFB", m["ttfb"], budget["ttfb_ms"], "ms")
    num("FCP", m["fcp"], budget["fcp_ms"], "ms")
    num("LCP", m["lcp"], budget["lcp_ms"], "ms")
    num("DCL", m["dcl"], budget["dcl_ms"], "ms")
    check(
        f"perf[{device}]: CLS {m['cls']:.3f} ≤ {budget['cls']}",
        m["cls"] <= budget["cls"],
    )
    num("long tasks spolu", m["longtask"], budget["longtask_total_ms"], "ms")
    num("JS prenos", m["scriptKb"], budget["script_kb"], "kB")
    num("CSS prenos", m["cssKb"], budget["stylesheet_kb"], "kB")
    num("celkový prenos", m["totalKb"], budget["total_kb"], "kB")
    num("počet requestov", m["requests"], budget["requests"])


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport=VIEWPORTS["desktop"])
        page = await context.new_page()
        print("== SEO rozpočet /servers ==")
        await audit_seo(page)
        await context.close()
        for device in ("desktop", "mobile"):
            print(f"== Performance rozpočet /servers ({device}) ==")
            await audit_perf(browser, device)
        await browser.close()

    passed = sum(1 for _, ok, _ in results if ok)
    report["summary"] = {"passed": passed, "total": len(results)}
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\n{passed}/{len(results)} kontrol prešlo — report: {REPORT}")
    if passed != len(results):
        print("Neúspešné kontroly:")
        for label, ok, extra in results:
            if not ok:
                print(f"  - {label} {extra}")
        sys.exit(1)


asyncio.run(main())
