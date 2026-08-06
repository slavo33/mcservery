"""
E2E test dostupnosti pre **formulár vytvárania servera** (`/add-server`) a
**stránku detailu servera** (`/server/:slug`).

Na každom breakpointe (mobil 390 / desktop 1280) overuje:

 1. **axe-core (WCAG 2.1 A/AA + best-practice)** — žiadne porušenia so
    závažnosťou >= `E2E_A11Y_FAIL_ON` (predvolene `serious`), vrátane
    `color-contrast`, `label`, `button-name`, `link-name`, `image-alt`,
    `aria-*`, `heading-order`, `duplicate-id-aria`.
 2. **prístupné názvy** — každý viditeľný `input`/`select`/`textarea` má
    `<label for>`, `aria-label` alebo `aria-labelledby`; každé tlačidlo a
    odkaz (vrátane ikonových) má neprázdny prístupný názov.
 3. **kontrast** — zvlášť vypísané všetky `color-contrast` uzly s pomerom.
 4. **poradie fokusu** — postupný `Tab` prechádza prvky v poradí, v akom sú
    v DOM-e (žiadne skoky späť), nič nemá `tabindex > 0`, fokusovaný prvok
    je viditeľný v rámci stránky a má viditeľný focus indikátor
    (outline / box-shadow / ring).
 5. **chybové hlášky formulára** — po neúspešnom odoslaní je chyba oznámená
    prístupne (`role=alert`, `aria-live` alebo `aria-invalid`).

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/a11y_forms_detail_e2e.py
    E2E_A11Y_FAIL_ON=critical python3 e2e/a11y_forms_detail_e2e.py
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
REPORT = ROOT / "a11y-forms-report.json"
AXE_PATH = Path(__file__).resolve().parents[1] / "node_modules" / "axe-core" / "axe.min.js"

VIEWPORTS = [("mobil-390", 390, 844), ("desktop-1280", 1280, 900)]
SEVERITY_ORDER = ["minor", "moderate", "serious", "critical"]
FAIL_ON = os.environ.get("E2E_A11Y_FAIL_ON", "serious")
FAIL_LEVEL = SEVERITY_ORDER.index(FAIL_ON) if FAIL_ON in SEVERITY_ORDER else 2
TAB_STEPS = int(os.environ.get("E2E_TAB_STEPS", "25"))

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


JS_NAMES = """
() => {
  const visible = el => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const name = el => {
    const aria = (el.getAttribute('aria-label') || '').trim();
    if (aria) return aria;
    const by = el.getAttribute('aria-labelledby');
    if (by) {
      const txt = by.split(/\\s+/).map(id => {
        const t = document.getElementById(id);
        return t ? (t.textContent || '').trim() : '';
      }).join(' ').trim();
      if (txt) return txt;
    }
    if (el.id) {
      const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lab && (lab.textContent || '').trim()) return lab.textContent.trim();
    }
    const wrap = el.closest('label');
    if (wrap && (wrap.textContent || '').trim()) return wrap.textContent.trim();
    const title = (el.getAttribute('title') || '').trim();
    if (title) return title;
    const alt = Array.from(el.querySelectorAll('img[alt]'))
      .map(i => i.getAttribute('alt').trim()).filter(Boolean).join(' ');
    if (alt) return alt;
    return (el.textContent || '').trim();
  };
  const desc = el => el.tagName.toLowerCase()
    + (el.id ? '#' + el.id : '')
    + (el.getAttribute('name') ? '[name=' + el.getAttribute('name') + ']' : '')
    + (el.getAttribute('type') ? '[type=' + el.getAttribute('type') + ']' : '');

  const fields = Array.from(document.querySelectorAll('main input, main select, main textarea'))
    .filter(el => visible(el) && el.type !== 'hidden'
                  && el.getAttribute('aria-hidden') !== 'true'
                  && el.tabIndex !== -1)
    .map(el => ({ el: desc(el), name: name(el) }));
  const controls = Array.from(document.querySelectorAll('main button, main a[href], main [role="button"]'))
    .filter(visible)
    .map(el => ({ el: desc(el), name: name(el) }));
  const positiveTab = Array.from(document.querySelectorAll('[tabindex]'))
    .filter(el => Number(el.getAttribute('tabindex')) > 0)
    .map(desc);
  return {
    unnamedFields: fields.filter(f => !f.name).map(f => f.el),
    fieldCount: fields.length,
    unnamedControls: controls.filter(c => !c.name).map(c => c.el),
    controlCount: controls.length,
    positiveTab,
  };
}
"""

JS_FOCUS = """
() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  const all = Array.from(document.querySelectorAll('*'));
  return {
    index: all.indexOf(el),
    tag: el.tagName.toLowerCase(),
    inMain: !!el.closest('main'),
    text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
    width: r.width, height: r.height,
    top: r.top, bottom: r.bottom,
    outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0,
    shadow: s.boxShadow !== 'none',
  };
}
"""


async def run_axe(page):
    await page.add_script_tag(path=str(AXE_PATH))
    return await page.evaluate(
        "opts => axe.run(document, opts).then(r => ({violations: r.violations}))",
        AXE_OPTIONS,
    )


async def audit_axe(page, label, path, vp):
    try:
        report = await run_axe(page)
    except Exception as exc:  # noqa: BLE001
        return check(False, f"{label} axe-core beh", str(exc)[:160])

    viols = report.get("violations", [])
    blocking = [v for v in viols
                if SEVERITY_ORDER.index(v.get("impact") or "minor") >= FAIL_LEVEL]

    contrast_nodes = []
    for v in viols:
        nodes = v.get("nodes", [])
        report_data.append({
            "url": path, "viewport": vp, "rule": v.get("id"),
            "impact": v.get("impact"), "help": v.get("help"),
            "helpUrl": v.get("helpUrl"), "count": len(nodes),
            "targets": [", ".join(map(str, n.get("target", []))) for n in nodes[:5]],
        })
        marker = "✖" if v in blocking else "•"
        print(f"    {marker} [{v.get('impact')}] {v.get('id')}: {v.get('help')} ({len(nodes)}×)")
        for n in nodes[:3]:
            print(f"        → {', '.join(map(str, n.get('target', [])))}")
        if v.get("id") == "color-contrast":
            for n in nodes:
                summary = (n.get("failureSummary") or "").replace("\n", " ")
                contrast_nodes.append(f"{', '.join(map(str, n.get('target', [])))}: {summary[:120]}")

    check(not contrast_nodes, f"{label} kontrast textu (color-contrast)",
          " | ".join(contrast_nodes[:3]))

    if blocking:
        shot = SHOTS / f"a11y_form_{vp}_{path.strip('/').replace('/', '_') or 'home'}.png"
        try:
            await page.screenshot(path=str(shot))
        except Exception:  # noqa: BLE001
            pass

    return check(not blocking, f"{label} axe-core bez závažných porušení",
                 ", ".join(f"{v['id']}({v['impact']})" for v in blocking) if blocking
                 else (f"{len(viols)} drobných upozornení" if viols else "0 porušení"))


async def audit_names(page, label):
    data = await page.evaluate(JS_NAMES)
    check(data["fieldCount"] == 0 or not data["unnamedFields"],
          f"{label} všetky polia majú prístupný názov (label/aria-label)",
          f"{len(data['unnamedFields'])}/{data['fieldCount']} bez názvu: "
          + ", ".join(data["unnamedFields"][:5]))
    check(not data["unnamedControls"],
          f"{label} všetky tlačidlá/odkazy majú prístupný názov",
          f"{len(data['unnamedControls'])}/{data['controlCount']} bez názvu: "
          + ", ".join(data["unnamedControls"][:5]))
    check(not data["positiveTab"],
          f"{label} žiadny prvok nemá tabindex > 0", ", ".join(data["positiveTab"][:5]))
    return data


async def audit_focus_order(page, label):
    await page.evaluate("() => { window.scrollTo(0, 0); document.body.focus(); }")
    await page.keyboard.press("Tab")
    seq, backwards, invisible, no_indicator = [], [], [], []
    prev_index = -1
    for _ in range(TAB_STEPS):
        info = await page.evaluate(JS_FOCUS)
        if info is None:
            break
        seq.append(info)
        if info["index"] < prev_index:
            backwards.append(f"{info['tag']}:{info['text']}")
        prev_index = info["index"]
        if info["width"] < 1 or info["height"] < 1:
            invisible.append(f"{info['tag']}:{info['text']}")
        if not (info["outline"] or info["shadow"]):
            no_indicator.append(f"{info['tag']}:{info['text']}")
        await page.keyboard.press("Tab")

    check(len(seq) >= 5, f"{label} klávesnicou sa dá prejsť aspoň 5 prvkov", f"{len(seq)} prvkov")
    check(not backwards, f"{label} poradie fokusu kopíruje poradie v DOM-e",
          ", ".join(backwards[:5]))
    check(not invisible, f"{label} žiadny fokusovaný prvok nie je nulovej veľkosti",
          ", ".join(invisible[:5]))
    check(not no_indicator, f"{label} každý fokusovaný prvok má viditeľný focus indikátor",
          ", ".join(no_indicator[:5]))
    reached_main = any(s["inMain"] for s in seq)
    check(reached_main, f"{label} fokus sa dostane do hlavného obsahu (<main>)")


async def audit_form_errors(page, label):
    """Odoslanie prázdneho formulára musí oznámiť chybu prístupne."""
    submit = page.locator("main button[type=submit]").first
    if await submit.count() == 0:
        return
    try:
        await submit.click(timeout=3000, force=True)
    except Exception:  # noqa: BLE001
        pass
    await page.wait_for_timeout(1200)
    announced = await page.evaluate(
        """() => {
             const live = document.querySelectorAll(
               '[role="alert"], [role="status"], [aria-live="polite"], [aria-live="assertive"]');
             const invalid = document.querySelectorAll('[aria-invalid="true"]');
             const native = Array.from(document.querySelectorAll('input, textarea, select'))
               .some(el => el.willValidate && !el.checkValidity());
             return { live: live.length, invalid: invalid.length, native };
           }"""
    )
    check(announced["live"] > 0 or announced["invalid"] > 0 or announced["native"],
          f"{label} chyba formulára je oznámená prístupne (role=alert / aria-invalid / validácia)",
          json.dumps(announced))


async def find_server_path(page):
    await page.goto(f"{BASE}/servers", wait_until="domcontentloaded")
    await page.wait_for_timeout(2500)
    hrefs = await page.eval_on_selector_all(
        'a[href^="/server/"]',
        "els => Array.from(new Set(els.map(e => e.getAttribute('href'))))",
    )
    hrefs = [h for h in hrefs if h and h.count("/") == 2 and not h.endswith("/edit")]
    return hrefs[0] if hrefs else None


async def main():
    if not AXE_PATH.exists():
        print(f"CHYBA: axe-core sa nenašiel na {AXE_PATH} (spusti `bun add -d axe-core`)")
        return 1

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        probe = await context.new_page()
        detail_path = await find_server_path(probe)
        await probe.close()
        check(detail_path is not None, "našiel sa profil servera na audit", str(detail_path))
        if detail_path is None:
            await browser.close()
            return 1

        targets = [("/add-server", "formulár vytvárania servera"),
                   (detail_path, "detail servera")]

        for vp, w, h in VIEWPORTS:
            ctx = await browser.new_context(viewport={"width": w, "height": h})
            page = await ctx.new_page()
            for path, human in targets:
                label = f"[{human} @{vp}]"
                print(f"\n{label} {path}")
                resp = await page.goto(f"{BASE}{path}", wait_until="domcontentloaded")
                await page.wait_for_timeout(2500)
                if resp is not None and resp.status >= 400:
                    check(False, f"{label} HTTP status", str(resp.status))
                    continue
                await audit_axe(page, label, path, vp)
                await audit_names(page, label)
                await audit_focus_order(page, label)
                if path == "/add-server":
                    await audit_form_errors(page, label)
            await ctx.close()
        await browser.close()

    REPORT.write_text(json.dumps(report_data, indent=2, ensure_ascii=False), encoding="utf-8")
    passed = sum(1 for ok, _, _ in results if ok)
    print(f"\nVýsledok: {passed}/{len(results)} kontrol prešlo")
    print(f"Report: {REPORT}")
    if passed != len(results):
        print("\nZlyhané kontroly:")
        for ok, lab, det in results:
            if not ok:
                print(f"  - {lab}: {det}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
