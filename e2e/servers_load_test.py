"""
Load test pre stránku `/servers` — správanie pri viacerých **súbežných používateľoch**.

Simuluje N virtuálnych používateľov (každý vo vlastnom izolovanom kontexte
prehliadača, teda vlastná cache aj session storage), ktorí naraz otvoria
`/servers`, počkajú na vykreslenie zoznamu a spravia typickú interakciu
(filter + vyhľadávanie). Pre každého používateľa sa zbierajú metriky:

  * **TTFB**  — `responseStart - requestStart`
  * **FCP**   — first-contentful-paint
  * **DCL**   — domContentLoadedEventEnd
  * **LCP**   — largest-contentful-paint
  * **CLS**   — kumulatívny layout shift po ustálení
  * **grid_ms** — čas od navigácie po vykreslenie kariet serverov
  * chyby — `pageerror`, console error, HTTP >= 400 a zlyhané requesty

Beh prebieha vo vlnách (`E2E_LOAD_WAVES`), aby sa dala sledovať degradácia pri
opakovanej záťaži. Výsledky (p50/p95/max/priemer + chybovosť) sa ukladajú do
`e2e/load-servers-report.json` a porovnávajú s rozpočtami.

Rozpočty a záťaž sa dajú prepísať cez env premenné, napr.:
    E2E_LOAD_USERS=12 E2E_LOAD_P95_LCP_MS=6000 python3 e2e/servers_load_test.py

Spustenie (dev server na http://localhost:8080):
    python3 e2e/servers_load_test.py
"""
import asyncio
import json
import os
import statistics
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
ROOT = Path(__file__).parent
REPORT = ROOT / "load-servers-report.json"

USERS = int(os.environ.get("E2E_LOAD_USERS", "8"))
WAVES = int(os.environ.get("E2E_LOAD_WAVES", "2"))
RAMP_MS = int(os.environ.get("E2E_LOAD_RAMP_MS", "150"))  # odstup medzi štartmi používateľov
SETTLE_MS = int(os.environ.get("E2E_LOAD_SETTLE_MS", "1500"))
NAV_TIMEOUT_MS = int(os.environ.get("E2E_LOAD_NAV_TIMEOUT_MS", "45000"))

BUDGETS = {
    "p95_ttfb_ms": float(os.environ.get("E2E_LOAD_P95_TTFB_MS", "2000")),
    "p95_fcp_ms": float(os.environ.get("E2E_LOAD_P95_FCP_MS", "5000")),
    "p95_dcl_ms": float(os.environ.get("E2E_LOAD_P95_DCL_MS", "6000")),
    "p95_lcp_ms": float(os.environ.get("E2E_LOAD_P95_LCP_MS", "8000")),
    "p95_grid_ms": float(os.environ.get("E2E_LOAD_P95_GRID_MS", "10000")),
    "p95_cls": float(os.environ.get("E2E_LOAD_P95_CLS", "0.1")),
    "max_cls": float(os.environ.get("E2E_LOAD_MAX_CLS", "0.25")),
    "error_rate": float(os.environ.get("E2E_LOAD_ERROR_RATE", "0.0")),
    "failure_rate": float(os.environ.get("E2E_LOAD_FAILURE_RATE", "0.0")),
    "degradation_ratio": float(os.environ.get("E2E_LOAD_DEGRADATION", "2.5")),
}

results = []
report = {
    "base_url": BASE,
    "config": {"users": USERS, "waves": WAVES, "ramp_ms": RAMP_MS},
    "budgets": BUDGETS,
    "waves": [],
    "aggregate": {},
}

IGNORED_CONSOLE = (
    "Function components cannot be given refs",
    "React Router Future Flag",
    "Download the React DevTools",
)


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(f"{'OK  ' if ok else 'FAIL'} | {label}{(' — ' + extra) if extra else ''}")


def pct(values, p):
    vals = sorted(v for v in values if v is not None)
    if not vals:
        return None
    if len(vals) == 1:
        return vals[0]
    k = (len(vals) - 1) * (p / 100)
    lo, hi = int(k), min(int(k) + 1, len(vals) - 1)
    return vals[lo] + (vals[hi] - vals[lo]) * (k - lo)


def summarize(values):
    vals = [v for v in values if v is not None]
    if not vals:
        return None
    return {
        "count": len(vals),
        "min": round(min(vals), 3),
        "p50": round(statistics.median(vals), 3),
        "p95": round(pct(vals, 95), 3),
        "max": round(max(vals), 3),
        "avg": round(statistics.fmean(vals), 3),
    }


COLLECT_JS = """
() => new Promise((resolve) => {
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const paint = performance.getEntriesByName('first-contentful-paint')[0];
  let cls = 0;
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) {}
  let lcp = null;
  try {
    new PerformanceObserver((l) => {
      const es = l.getEntries();
      if (es.length) lcp = es[es.length - 1].startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {}
  setTimeout(() => resolve({
    ttfb: nav.responseStart ? nav.responseStart - (nav.requestStart || 0) : null,
    fcp: paint ? paint.startTime : null,
    dcl: nav.domContentLoadedEventEnd || null,
    load: nav.loadEventEnd || null,
    lcp,
    cls,
  }), 400);
})
"""


async def virtual_user(browser, uid, wave):
    ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
    page = await ctx.new_page()
    errors = []
    http_errors = []

    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))

    def on_console(msg):
        if msg.type == "error" and not any(s in msg.text for s in IGNORED_CONSOLE):
            errors.append(f"console: {msg.text[:160]}")

    page.on("console", on_console)
    page.on(
        "response",
        lambda r: http_errors.append(f"{r.status} {r.url[:120]}") if r.status >= 400 else None,
    )
    page.on("requestfailed", lambda r: http_errors.append(f"failed {r.url[:120]}"))

    entry = {"user": uid, "wave": wave, "ok": False}
    try:
        loop = asyncio.get_event_loop()
        t0 = loop.time()
        await page.goto(f"{BASE}/servers", wait_until="domcontentloaded", timeout=NAV_TIMEOUT_MS)
        await page.wait_for_selector("[data-server-grid]", timeout=NAV_TIMEOUT_MS)
        entry["grid_ms"] = (loop.time() - t0) * 1000
        entry["cards"] = await page.locator("[data-server-grid] h3").count()

        # typická interakcia používateľa: filter platformy + vyhľadávanie
        t1 = loop.time()
        btn = page.get_by_role("button", name="Java", exact=True).first
        if await btn.count():
            await btn.click()
            await page.wait_for_timeout(250)
        entry["filter_ms"] = (loop.time() - t1) * 1000

        t2 = loop.time()
        box = page.get_by_placeholder("Hľadaj server podľa názvu alebo IP...")
        if await box.count():
            await box.fill("a")
            await page.wait_for_timeout(300)
        entry["search_ms"] = (loop.time() - t2) * 1000

        await page.wait_for_timeout(SETTLE_MS)
        metrics = await page.evaluate(COLLECT_JS)
        entry.update({k: v for k, v in metrics.items()})
        entry["ok"] = True
    except Exception as exc:  # timeout / crash pri záťaži
        entry["error"] = f"{type(exc).__name__}: {exc}"[:200]
    finally:
        entry["js_errors"] = errors[:5]
        entry["http_errors"] = http_errors[:5]
        await ctx.close()

    return entry


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        all_entries = []
        for wave in range(1, WAVES + 1):
            print(f"\n--- vlna {wave}/{WAVES}: {USERS} súbežných používateľov ---")

            async def staged(uid):
                await asyncio.sleep((uid * RAMP_MS) / 1000)
                return await virtual_user(browser, uid, wave)

            entries = await asyncio.gather(*(staged(i) for i in range(USERS)))
            all_entries.extend(entries)
            report["waves"].append(
                {
                    "wave": wave,
                    "entries": entries,
                    "grid_ms": summarize([e.get("grid_ms") for e in entries if e.get("ok")]),
                }
            )

        await browser.close()

    ok_entries = [e for e in all_entries if e.get("ok")]
    total = len(all_entries)
    failures = total - len(ok_entries)
    with_errors = [e for e in all_entries if e.get("js_errors") or e.get("http_errors")]

    agg = {
        "requests": total,
        "successful": len(ok_entries),
        "failures": failures,
        "failure_rate": round(failures / total, 4) if total else 1.0,
        "error_rate": round(len(with_errors) / total, 4) if total else 1.0,
        "ttfb_ms": summarize([e.get("ttfb") for e in ok_entries]),
        "fcp_ms": summarize([e.get("fcp") for e in ok_entries]),
        "dcl_ms": summarize([e.get("dcl") for e in ok_entries]),
        "lcp_ms": summarize([e.get("lcp") for e in ok_entries]),
        "cls": summarize([e.get("cls") for e in ok_entries]),
        "grid_ms": summarize([e.get("grid_ms") for e in ok_entries]),
        "filter_ms": summarize([e.get("filter_ms") for e in ok_entries]),
        "search_ms": summarize([e.get("search_ms") for e in ok_entries]),
    }
    report["aggregate"] = agg
    print("\n=== agregované metriky ===")
    print(json.dumps(agg, indent=2, ensure_ascii=False))

    # ---- vyhodnotenie rozpočtov ----
    check("Všetci virtuálni používatelia načítali /servers", failures == 0, f"{failures}/{total} zlyhaní")
    check(
        "Chybovosť (JS/HTTP) v rámci rozpočtu",
        agg["error_rate"] <= BUDGETS["error_rate"],
        f"{agg['error_rate']:.2%} <= {BUDGETS['error_rate']:.2%}"
        + (f" | príklad: {with_errors[0].get('js_errors') or with_errors[0].get('http_errors')}" if with_errors else ""),
    )
    check(
        "Miera zlyhaní v rámci rozpočtu",
        agg["failure_rate"] <= BUDGETS["failure_rate"],
        f"{agg['failure_rate']:.2%}",
    )
    check("Každý používateľ videl karty serverov", all(e.get("cards", 0) > 0 for e in ok_entries),
          f"min kariet: {min([e.get('cards', 0) for e in ok_entries], default=0)}")

    for metric, budget_key in (
        ("ttfb_ms", "p95_ttfb_ms"),
        ("fcp_ms", "p95_fcp_ms"),
        ("dcl_ms", "p95_dcl_ms"),
        ("lcp_ms", "p95_lcp_ms"),
        ("grid_ms", "p95_grid_ms"),
        ("cls", "p95_cls"),
    ):
        summary = agg.get(metric)
        if not summary:
            check(f"p95 {metric} zmerané", False, "chýbajú dáta")
            continue
        limit = BUDGETS[budget_key]
        check(f"p95 {metric} <= {limit}", summary["p95"] <= limit, f"nameraných {summary['p95']}")

    if agg.get("cls"):
        check(f"max CLS <= {BUDGETS['max_cls']}", agg["cls"]["max"] <= BUDGETS["max_cls"], f"{agg['cls']['max']}")

    # degradácia medzi prvou a poslednou vlnou
    if WAVES > 1:
        first = report["waves"][0]["grid_ms"]
        last = report["waves"][-1]["grid_ms"]
        if first and last and first["p50"] > 0:
            ratio = last["p50"] / first["p50"]
            check(
                f"Bez degradácie medzi vlnami (p50 pomer <= {BUDGETS['degradation_ratio']})",
                ratio <= BUDGETS["degradation_ratio"],
                f"{first['p50']}ms -> {last['p50']}ms (x{ratio:.2f})",
            )

    report["checks"] = [{"label": l, "ok": ok, "detail": d} for l, ok, d in results]
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\n{passed}/{len(results)} kontrol OK — report: {REPORT}")
    sys.exit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    asyncio.run(main())
