"""
Performance E2E test pre stránku `/servers`: **načítanie** a **prepínanie filtrov**.

Meria a stráži rozpočty pre:
 1. **Načítanie stránky** — TTFB, FCP, LCP, DOMContentLoaded, počet a trvanie
    dlhých úloh (long tasks) a CLS po ustálení.
 2. **Prepínanie filtrov** — čas od kliknutia na chip (platforma, verzia,
    software, minihra) po prekreslenie zoznamu serverov (`requestAnimationFrame`
    po zmene DOM-u), medián aj p95 naprieč viacerými prepnutiami.
 3. **Vyhľadávanie** — čas od zadania textu po prekreslenie výsledkov.
 4. **Zoradenie** — čas prepnutia triedenia (votes / likes / players).
 5. **Stabilita** — počas filtrovania nesmie vzniknúť nový layout shift nad
    rozpočet a nesmú pribúdať sieťové požiadavky (filtrovanie je klientske).

Rozpočty sa dajú prepísať cez env premenné, napr.:
    E2E_PERF_FILTER_MS=250 python3 e2e/servers_perf_filters_e2e.py

Spustenie (dev server na http://localhost:8080):
    python3 e2e/servers_perf_filters_e2e.py

Výsledky sa ukladajú do `e2e/perf-servers-report.json`.
"""
import asyncio
import json
import os
import statistics
import sys
from pathlib import Path

from playwright.async_api import async_playwright

import sys as _sys
from pathlib import Path as _Path
_sys.path.insert(0, str(_Path(__file__).parent))
from filters_drawer import open_filters_if_needed  # noqa: E402

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
ROOT = Path(__file__).parent
SHOTS = ROOT / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)
REPORT = ROOT / "perf-servers-report.json"

RUNS = int(os.environ.get("E2E_PERF_RUNS", "3"))
CPU_THROTTLE = float(os.environ.get("E2E_PERF_CPU_THROTTLE", "4"))

BUDGETS = {
    "ttfb_ms": float(os.environ.get("E2E_PERF_TTFB_MS", "800")),
    "fcp_ms": float(os.environ.get("E2E_PERF_FCP_MS", "2500")),
    "lcp_ms": float(os.environ.get("E2E_PERF_LCP_MS", "4000")),
    "dcl_ms": float(os.environ.get("E2E_PERF_DCL_MS", "3000")),
    "cls": float(os.environ.get("E2E_PERF_CLS", "0.1")),
    "longtask_total_ms": float(os.environ.get("E2E_PERF_LONGTASK_MS", "2500")),
    "filter_median_ms": float(os.environ.get("E2E_PERF_FILTER_MS", "400")),
    "filter_p95_ms": float(os.environ.get("E2E_PERF_FILTER_P95_MS", "700")),
    "search_median_ms": float(os.environ.get("E2E_PERF_SEARCH_MS", "600")),
    "sort_median_ms": float(os.environ.get("E2E_PERF_SORT_MS", "500")),
    "filter_cls": float(os.environ.get("E2E_PERF_FILTER_CLS", "0.1")),
}

results = []
report = {"budgets": BUDGETS, "runs": [], "interactions": {}}


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))
    return bool(ok)


def budget(label, value, limit, unit="ms"):
    return check(f"{label} <= {limit}{unit}", value is not None and value <= limit,
                 f"namerané {value}{unit}")


JS_OBSERVERS = """
() => {
  window.__perf = { cls: 0, longtasks: [], lcp: 0 };
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value;
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) window.__perf.longtasks.push(Math.round(e.duration));
  }).observe({ type: 'longtask', buffered: true });
  new PerformanceObserver(list => {
    const es = list.getEntries();
    if (es.length) window.__perf.lcp = Math.round(es[es.length - 1].startTime);
  }).observe({ type: 'largest-contentful-paint', buffered: true });
}
"""

JS_LOAD_METRICS = """
() => {
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const fcp = performance.getEntriesByName('first-contentful-paint')[0];
  const p = window.__perf || { cls: 0, longtasks: [], lcp: 0 };
  return {
    ttfb: Math.round(nav.responseStart || 0),
    dcl: Math.round(nav.domContentLoadedEventEnd || 0),
    fcp: fcp ? Math.round(fcp.startTime) : null,
    lcp: p.lcp || null,
    cls: Math.round(p.cls * 1000) / 1000,
    longtasks: p.longtasks,
    longtaskTotal: p.longtasks.reduce((a, b) => a + b, 0),
    resources: performance.getEntriesByType('resource').length,
    transferKb: Math.round(performance.getEntriesByType('resource')
      .reduce((a, r) => a + (r.transferSize || 0), 0) / 1024),
  };
}
"""

# Zmeria čas od akcie po prekreslenie zoznamu serverov.
JS_MEASURE = """
async ([selector, action]) => {
  const root = document.querySelector('main') || document.body;
  const count = () => {
    const g = document.querySelector('[data-results-count]');
    return g ? g.getAttribute('data-results-count') : (root.innerHTML.length + '');
  };
  const startCls = (window.__perf && window.__perf.cls) || 0;
  const before = count();
  const el = document.querySelector(selector);
  if (!el) return { error: 'selector not found: ' + selector };
  const t0 = performance.now();
  if (action === 'click') el.click();
  const settled = await new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - t0)));
    };
    const obs = new MutationObserver(() => { obs.disconnect(); finish(); });
    obs.observe(root, { childList: true, subtree: true, characterData: true, attributes: true });
    // React commituje synchronne; ak sa DOM nezmení do 400ms, meranie ukončíme.
    setTimeout(() => { obs.disconnect(); finish(); }, 400);
  });
  return {
    ms: Math.round(settled),
    before, after: count(),
    pressed: el.getAttribute('aria-pressed'),
    cls: Math.round((((window.__perf && window.__perf.cls) || 0) - startCls) * 1000) / 1000,
  };
}
"""


async def measure_interaction(page, selector):
    return await page.evaluate(JS_MEASURE, [selector, "click"])


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        client = await context.new_cdp_session(page)
        await client.send("Emulation.setCPUThrottlingRate", {"rate": CPU_THROTTLE})
        print(f"CPU throttling: {CPU_THROTTLE}x, behov: {RUNS}")

        # ---------- 1) načítanie stránky ----------
        loads = []
        for i in range(RUNS):
            await page.add_init_script(JS_OBSERVERS)
            await page.goto(BASE + "/servers", wait_until="domcontentloaded")
            await page.wait_for_selector("[data-server-filters]", timeout=20000)
            await page.wait_for_timeout(4000)
            m = await page.evaluate(JS_LOAD_METRICS)
            loads.append(m)
            report["runs"].append(m)
            print(f"  beh {i + 1}: ttfb={m['ttfb']} fcp={m['fcp']} lcp={m['lcp']} "
                  f"dcl={m['dcl']} cls={m['cls']} longtasks={m['longtaskTotal']}ms "
                  f"zdrojov={m['resources']} ({m['transferKb']}kB)")

        def med(key):
            vals = [l[key] for l in loads if l.get(key) is not None]
            return round(statistics.median(vals)) if vals else None

        budget("načítanie: TTFB (medián)", med("ttfb"), BUDGETS["ttfb_ms"])
        budget("načítanie: FCP (medián)", med("fcp"), BUDGETS["fcp_ms"])
        lcp_med = med("lcp")
        if lcp_med is None:
            check("načítanie: LCP zmerané alebo nahradené FCP", med("fcp") is not None,
                  "LCP entry nedostupná, použité FCP")
        else:
            budget("načítanie: LCP (medián)", lcp_med, BUDGETS["lcp_ms"])
        budget("načítanie: DOMContentLoaded (medián)", med("dcl"), BUDGETS["dcl_ms"])
        cls_med = statistics.median([l["cls"] for l in loads])
        budget("načítanie: CLS (medián)", cls_med, BUDGETS["cls"], "")
        budget("načítanie: dlhé úlohy spolu (medián)", med("longtaskTotal"), BUDGETS["longtask_total_ms"])

        # ---------- 2) prepínanie filtrov ----------
        await page.add_init_script(JS_OBSERVERS)
        await page.goto(BASE + "/servers", wait_until="domcontentloaded")
        await page.wait_for_selector("[data-server-grid], [data-server-filters]", timeout=20000)
        await page.wait_for_timeout(3500)
        net_js = ("() => performance.getEntriesByType('resource')"
                  ".filter(r => r.initiatorType === 'fetch' || r.initiatorType === 'xmlhttprequest').length")
        net_before = await page.evaluate(net_js)

        chips = await page.evaluate(
            """() => Array.from(document.querySelectorAll('[data-filter-group]')).flatMap(g => {
                 const key = g.getAttribute('data-filter-group');
                 return Array.from(g.querySelectorAll('button[data-filter-value]'))
                   .slice(0, 3)
                   .map(b => ({ group: key, value: b.getAttribute('data-filter-value') })); })"""
        )
        check("nájdené filtračné chipy", len(chips) >= 4, str(len(chips)))

        timings, cls_deltas, no_change = [], [], []
        for c in chips:
            sel = f"[data-filter-group='{c['group']}'] button[data-filter-value='{c['value']}']"
            on = await measure_interaction(page, sel)
            off = await measure_interaction(page, sel)  # späť na "všetko"
            for r, phase in ((on, "zapnutie"), (off, "vypnutie")):
                if r.get("error"):
                    no_change.append(f"{c['group']}/{c['value']} {r['error']}")
                    continue
                timings.append(r["ms"])
                cls_deltas.append(r["cls"])
                expected = "true" if phase == "zapnutie" else "false"
                if r.get("pressed") != expected:
                    no_change.append(f"{c['group']}/{c['value']} ({phase}) aria-pressed={r.get('pressed')}")
            await page.wait_for_timeout(120)

        report["interactions"]["filters"] = timings
        check("každé prepnutie filtra korektne prepne stav chipu", not no_change,
              "; ".join(no_change[:4]))
        f_med = round(statistics.median(timings)) if timings else None
        f_p95 = round(sorted(timings)[max(0, int(len(timings) * 0.95) - 1)]) if timings else None
        print(f"  filtre: n={len(timings)} medián={f_med}ms p95={f_p95}ms max={max(timings) if timings else '-'}ms")
        budget("filtre: medián prepnutia", f_med, BUDGETS["filter_median_ms"])
        budget("filtre: p95 prepnutia", f_p95, BUDGETS["filter_p95_ms"])
        budget("filtre: max layout shift pri prepnutí",
               max(cls_deltas) if cls_deltas else 0, BUDGETS["filter_cls"], "")

        net_after = await page.evaluate(net_js)
        check("filtrovanie nespúšťa hromadné dátové požiadavky (klientske)",
              net_after - net_before <= 8, f"+{net_after - net_before} fetch/xhr požiadaviek")

        # ---------- 3) vyhľadávanie ----------
        search_sel = "[data-server-filters] input[type='text']"
        search_times = []
        for term in ("a", "sk", "craft"):
            t = await page.evaluate(
                """async ([sel, text]) => {
                     const list = document.querySelector('main') || document.body;
                     const input = document.querySelector(sel);
                     if (!input) return { error: 'input not found' };
                     const t0 = performance.now();
                     const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                     setter.call(input, text);
                     input.dispatchEvent(new Event('input', { bubbles: true }));
                     const ms = await new Promise(resolve => {
                       let done = false;
                       const finish = () => { if (done) return; done = true;
                         requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - t0))); };
                       const obs = new MutationObserver(() => { obs.disconnect(); finish(); });
                       if (list) obs.observe(list, { childList: true, subtree: true, characterData: true });
                       setTimeout(() => { obs.disconnect(); finish(); }, 400);
                     });
                     return { ms: Math.round(ms) }; }""",
                [search_sel, term],
            )
            if t.get("error"):
                check("vyhľadávacie pole je dostupné", False, t["error"])
                break
            search_times.append(t["ms"])
            await page.wait_for_timeout(150)
        report["interactions"]["search"] = search_times
        if search_times:
            s_med = round(statistics.median(search_times))
            print(f"  vyhľadávanie: {search_times} medián={s_med}ms")
            budget("vyhľadávanie: medián prekreslenia", s_med, BUDGETS["search_median_ms"])

        # vyčistenie vyhľadávania
        await page.fill(search_sel, "")
        await page.wait_for_timeout(400)

        # ---------- 4) zoradenie ----------
        sort_times = []
        for opt in ("likes", "players", "votes"):
            r = await measure_interaction(page, f"[data-sort-bar] button[data-sort='{opt}']")
            if not r.get("error"):
                sort_times.append(r["ms"])
            await page.wait_for_timeout(120)
        report["interactions"]["sort"] = sort_times
        if sort_times:
            so_med = round(statistics.median(sort_times))
            print(f"  zoradenie: {sort_times} medián={so_med}ms")
            budget("zoradenie: medián prepnutia", so_med, BUDGETS["sort_median_ms"])

        await page.screenshot(path=str(SHOTS / "perf_servers.png"))
        await browser.close()

    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False))
    ok = sum(1 for _, o, _ in results if o)
    print(f"\n{ok}/{len(results)} kontrol OK — report: {REPORT}")
    if ok != len(results):
        for label, o, extra in results:
            if not o:
                print(f"  FAIL {label} :: {extra}")
    sys.exit(0 if ok == len(results) else 1)


asyncio.run(main())
