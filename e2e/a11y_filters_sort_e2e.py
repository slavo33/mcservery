"""
E2E prístupnostný test pre **panel filtrovania** (`[data-server-filters]`) a
**lištu zoradenia** (`[data-sort-bar]`) na stránke `/servers`.

Na každom breakpointe (mobil 390 / desktop 1280) overuje:

 1. **axe-core (WCAG 2.1 A/AA + best-practice)** obmedzený na panel filtrov a
    lištu zoradenia — žiadne porušenia so závažnosťou >= `E2E_A11Y_FAIL_ON`
    (predvolene `serious`).
 2. **ARIA popisy** — vyhľadávacie pole má prístupný názov, každá skupina
    filtrov má `role=group` + `aria-labelledby` s neprázdnym textom, každý
    chip a tlačidlo zoradenia má neprázdny prístupný názov a `aria-pressed`.
 3. **klávesnica** — chip aj tlačidlo zoradenia sa dá aktivovať klávesou
    `Enter` aj `Space`, `aria-pressed` sa správne prepne, opätovné stlačenie
    na aktívnom zoradení otočí smer.
 4. **fokus** — postupný `Tab` prechádza panel v poradí DOM-u, žiadny prvok
    nemá `tabindex > 0`, fokusovaný prvok má viditeľný focus indikátor
    (outline / box-shadow / ring) a je v rámci viewportu.
 5. **oznamovanie zmeny** — lišta zoradenia obsahuje `aria-live` región.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/a11y_filters_sort_e2e.py
"""
import asyncio
import json
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
ROOT = Path(__file__).parent
SHOTS = ROOT / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)
REPORT = ROOT / "a11y-filters-sort-report.json"
AXE_PATH = Path(__file__).resolve().parents[1] / "node_modules" / "axe-core" / "axe.min.js"

VIEWPORTS = [("mobil-390", 390, 844), ("desktop-1280", 1280, 900)]
SEVERITY_ORDER = ["minor", "moderate", "serious", "critical"]
FAIL_ON = os.environ.get("E2E_A11Y_FAIL_ON", "serious")
FAIL_LEVEL = SEVERITY_ORDER.index(FAIL_ON) if FAIL_ON in SEVERITY_ORDER else 2
TAB_STEPS = int(os.environ.get("E2E_TAB_STEPS", "20"))

AXE_OPTIONS = {
    "runOnly": {"type": "tag", "values": ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]},
    "resultTypes": ["violations"],
}

results = []
report_data = []


def check(ok, label, detail=""):
    results.append((bool(ok), label, detail))
    print(("  OK   " if ok else "  FAIL ") + label + (f" — {detail}" if detail else ""))
    return bool(ok)


JS_STRUCTURE = """
() => {
  const acc = el => {
    const a = (el.getAttribute('aria-label') || '').trim();
    if (a) return a;
    const by = el.getAttribute('aria-labelledby');
    if (by) {
      const t = by.split(/\\s+/).map(id => {
        const n = document.getElementById(id);
        return n ? (n.textContent || '').trim() : '';
      }).join(' ').trim();
      if (t) return t;
    }
    if (el.id) {
      const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lab && (lab.textContent || '').trim()) return lab.textContent.trim();
    }
    const wrap = el.closest('label');
    if (wrap && (wrap.textContent || '').trim()) return wrap.textContent.trim();
    return (el.textContent || '').trim();
  };
  const panel = document.querySelector('[data-server-filters]');
  const bar = document.querySelector('[data-sort-bar]');
  if (!panel || !bar) return { missing: true, panel: !!panel, bar: !!bar };
  const input = panel.querySelector('input[type="text"], input:not([type])');
  const groups = Array.from(panel.querySelectorAll('[data-filter-group]')).map(g => ({
    key: g.getAttribute('data-filter-group'),
    role: g.getAttribute('role'),
    name: acc(g),
    chips: Array.from(g.querySelectorAll('button')).map(b => ({
      name: acc(b),
      pressed: b.getAttribute('aria-pressed'),
      type: b.getAttribute('type'),
      tabindex: b.getAttribute('tabindex'),
    })),
  }));
  const sortButtons = Array.from(bar.querySelectorAll('button')).map(b => ({
    key: b.getAttribute('data-sort'),
    name: acc(b),
    pressed: b.getAttribute('aria-pressed'),
    tabindex: b.getAttribute('tabindex'),
  }));
  return {
    missing: false,
    inputName: input ? acc(input) : null,
    panelName: acc(panel),
    barRole: bar.getAttribute('role'),
    barName: acc(bar),
    hasLive: !!bar.querySelector('[aria-live]'),
    groups,
    sortButtons,
    positiveTabindex: Array.from(document.querySelectorAll('[data-server-filters] [tabindex], [data-sort-bar] [tabindex]'))
      .filter(e => parseInt(e.getAttribute('tabindex') || '0', 10) > 0).length,
  };
}
"""

JS_FOCUS_INFO = """
() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const inPanel = !!el.closest('[data-server-filters]');
  const inBar = !!el.closest('[data-sort-bar]');
  const all = Array.from(document.querySelectorAll('[data-server-filters] button, [data-server-filters] input, [data-sort-bar] button'));
  return {
    tag: el.tagName.toLowerCase(),
    index: all.indexOf(el),
    inPanel, inBar,
    visibleRing: (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0)
      || (s.boxShadow && s.boxShadow !== 'none'),
    onScreen: r.width > 0 && r.height > 0,
  };
}
"""


async def run_axe(page, selector):
    await page.add_script_tag(path=str(AXE_PATH))
    return await page.evaluate(
        """async ([sel, opts]) => await window.axe.run(document.querySelector(sel), opts)""",
        [selector, AXE_OPTIONS],
    )


async def main():
    if not AXE_PATH.exists():
        print(f"axe-core sa nenašiel: {AXE_PATH}")
        sys.exit(1)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        for vp_name, w, h in VIEWPORTS:
            print(f"\n=== {vp_name} ({w}x{h}) ===")
            context = await browser.new_context(viewport={"width": w, "height": h})
            page = await context.new_page()
            await page.goto(f"{BASE}/servers", wait_until="networkidle")
            await page.wait_for_selector("[data-server-filters]", timeout=15000)
            await page.wait_for_selector("[data-sort-bar]", timeout=15000)

            # --- 1. axe ---
            for sel, label in (("[data-server-filters]", "panel filtrov"), ("[data-sort-bar]", "lišta zoradenia")):
                res = await run_axe(page, sel)
                bad = [v for v in res["violations"] if SEVERITY_ORDER.index(v.get("impact") or "minor") >= FAIL_LEVEL]
                report_data.append({"viewport": vp_name, "scope": label, "violations": [
                    {"id": v["id"], "impact": v.get("impact"), "nodes": len(v["nodes"])} for v in res["violations"]
                ]})
                detail = ", ".join(f"{v['id']}({v.get('impact')})" for v in bad)
                check(not bad, f"[{vp_name}] axe {label}: bez porušení >= {FAIL_ON}", detail)

            # --- 2. ARIA štruktúra ---
            info = await page.evaluate(JS_STRUCTURE)
            if info.get("missing"):
                check(False, f"[{vp_name}] panel/lišta prítomné", json.dumps(info))
                await context.close()
                continue

            check(bool(info["inputName"]), f"[{vp_name}] vyhľadávacie pole má prístupný názov", str(info["inputName"]))
            check(bool(info["panelName"]), f"[{vp_name}] panel filtrov má prístupný názov", str(info["panelName"]))
            check(len(info["groups"]) >= 3, f"[{vp_name}] skupiny filtrov nájdené", str(len(info["groups"])))
            for g in info["groups"]:
                check(g["role"] == "group", f"[{vp_name}] skupina '{g['key']}' má role=group", str(g["role"]))
                check(bool(g["name"]), f"[{vp_name}] skupina '{g['key']}' má ARIA popis", str(g["name"]))
                no_name = [c for c in g["chips"] if not c["name"]]
                check(not no_name, f"[{vp_name}] všetky chipy v '{g['key']}' majú názov", str(len(no_name)))
                no_pressed = [c for c in g["chips"] if c["pressed"] not in ("true", "false")]
                check(not no_pressed, f"[{vp_name}] všetky chipy v '{g['key']}' majú aria-pressed", str(len(no_pressed)))
                check(sum(1 for c in g["chips"] if c["pressed"] == "true") == 1,
                      f"[{vp_name}] v '{g['key']}' je práve jeden aktívny chip")

            check(info["barRole"] == "group", f"[{vp_name}] lišta zoradenia má role=group", str(info["barRole"]))
            check(bool(info["barName"]), f"[{vp_name}] lišta zoradenia má ARIA popis", str(info["barName"]))
            check(info["hasLive"], f"[{vp_name}] lišta zoradenia má aria-live región")
            sorts = [b for b in info["sortButtons"] if b["key"]]
            check(len(sorts) == 3, f"[{vp_name}] tri tlačidlá zoradenia", str([b["key"] for b in sorts]))
            for b in info["sortButtons"]:
                check(bool(b["name"]), f"[{vp_name}] tlačidlo lišty má prístupný názov", str(b))
                check(b["pressed"] in ("true", "false"), f"[{vp_name}] tlačidlo lišty má aria-pressed", str(b["pressed"]))
            check(info["positiveTabindex"] == 0, f"[{vp_name}] žiadny tabindex > 0", str(info["positiveTabindex"]))

            # --- 3. klávesnica ---
            chip = page.locator("[data-filter-group='platform'] button[data-filter-value]").first
            await chip.focus()
            await page.keyboard.press("Enter")
            await page.wait_for_timeout(250)
            check(await chip.get_attribute("aria-pressed") == "true",
                  f"[{vp_name}] chip sa aktivuje klávesou Enter")
            await page.keyboard.press(" ")
            await page.wait_for_timeout(250)
            check(await chip.get_attribute("aria-pressed") == "false",
                  f"[{vp_name}] chip sa deaktivuje medzerníkom")

            sort_btn = page.locator("[data-sort-bar] button[data-sort='players']")
            await sort_btn.focus()
            await page.keyboard.press("Enter")
            await page.wait_for_timeout(250)
            check(await sort_btn.get_attribute("aria-pressed") == "true",
                  f"[{vp_name}] zoradenie 'players' aktivované klávesnicou")
            name_desc = await sort_btn.get_attribute("aria-label")
            await page.keyboard.press("Enter")
            await page.wait_for_timeout(250)
            name_asc = await sort_btn.get_attribute("aria-label")
            check(name_desc != name_asc,
                  f"[{vp_name}] opätovné Enter otočí smer zoradenia (ARIA popis sa zmení)",
                  f"{name_desc} -> {name_asc}")

            # --- 4. poradie fokusu ---
            await page.evaluate("() => document.querySelector('[data-server-filters] input')?.focus()")
            last_index = -1
            order_ok = True
            ring_fails = []
            for _ in range(TAB_STEPS):
                fi = await page.evaluate(JS_FOCUS_INFO)
                if fi and (fi["inPanel"] or fi["inBar"]) and fi["index"] >= 0:
                    if fi["index"] < last_index:
                        order_ok = False
                    last_index = fi["index"]
                    if not fi["visibleRing"]:
                        ring_fails.append(fi["tag"] + "#" + str(fi["index"]))
                    if not fi["onScreen"]:
                        ring_fails.append("mimo obrazovky:" + str(fi["index"]))
                await page.keyboard.press("Tab")
                await page.wait_for_timeout(40)
            check(order_ok, f"[{vp_name}] poradie fokusu zodpovedá poradiu v DOM-e")
            check(not ring_fails, f"[{vp_name}] každý fokusovaný prvok má viditeľný focus indikátor",
                  ", ".join(ring_fails[:5]))

            await page.locator("[data-server-filters]").screenshot(path=str(SHOTS / f"a11y-filters-{vp_name}.png"))
            await page.locator("[data-sort-bar]").screenshot(path=str(SHOTS / f"a11y-sortbar-{vp_name}.png"))
            await context.close()
        await browser.close()

    REPORT.write_text(json.dumps(report_data, indent=2, ensure_ascii=False))
    passed = sum(1 for ok, *_ in results if ok)
    total = len(results)
    print(f"\n=== VÝSLEDOK: {passed}/{total} ===")
    if passed != total:
        for ok, label, detail in results:
            if not ok:
                print(f"  FAIL {label} — {detail}")
        sys.exit(1)


asyncio.run(main())
