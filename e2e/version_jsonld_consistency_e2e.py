"""
End-to-end test: konzistencia VersionBadge ↔ JSON-LD (`softwareVersion`) po editácii verzie.

Scenár:
 1. Vytvorí server s verziou 26.2.
 2. Na profile prečíta priamo z DOM odznak verzie aj `application/ld+json`
    a overí, že `softwareVersion` sa presne zhoduje s textom odznaku (`v26.2`).
 3. Zmení verziu cez editáciu na 1.20.4a overí, že JSON-LD v DOM sa
    aktualizuje okamžite (bez reloadu) — vrátane <title> a meta description.
 4. Po tvrdom reloade profilu znova overí zhodu odznaku a JSON-LD
    a že stará verzia sa v hlavičke ani v JSON-LD nikde nenachádza.
 5. Overí, že v DOM je práve jeden JSON-LD blok typu SoftwareApplication.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/version_jsonld_consistency_e2e.py
"""
import asyncio, json, os, re, sys, time
from pathlib import Path
from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

STAMP = str(int(time.time()))
SERVER_NAME = f"E2E JsonLd {STAMP}"
SERVER_IP = f"e2eld{STAMP}.example.com"
VERSION_A = "26.2"
VERSION_B = "1.20.4"

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


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


async def read_json_ld(page):
    """Vráti zoznam JSON-LD objektov nájdených v DOM (parsované)."""
    raw = await page.eval_on_selector_all(
        'script[type="application/ld+json"]', "els => els.map(e => e.textContent)"
    )
    out = []
    for txt in raw:
        try:
            data = json.loads(txt or "")
        except Exception:
            continue
        out.extend(data if isinstance(data, list) else [data])
    return out


async def software_application(page):
    for obj in await read_json_ld(page):
        if obj.get("@type") == "SoftwareApplication":
            return obj
    return None


async def badge_text(page):
    """Text odznaku verzie priamo z DOM profilu."""
    badge = page.locator('[aria-label^="Filtrovať servery podľa verzie"]').first
    if await badge.count() == 0:
        badge = page.locator('[aria-label^="Verzia v"]').first
    if await badge.count() == 0:
        return None
    txt = (await badge.inner_text()).strip()
    m = re.search(r"v\d+(?:\.\d+){1,3}", txt)
    return m.group(0) if m else txt


async def open_detail(page):
    await page.goto(f"{BASE}/servers", wait_until="domcontentloaded")
    await page.get_by_text(SERVER_NAME, exact=False).first.wait_for(timeout=30000)
    await page.get_by_text(SERVER_NAME, exact=False).first.click()
    await page.wait_for_timeout(2500)
    return page.url


async def assert_consistent(page, expected, phase):
    badge = await badge_text(page)
    app = await software_application(page)
    sw = (app or {}).get("softwareVersion")
    check(f"[{phase}] odznak zobrazuje v{expected}", badge == f"v{expected}", badge)
    check(f"[{phase}] JSON-LD softwareVersion = v{expected}", sw == f"v{expected}", sw)
    check(f"[{phase}] odznak == JSON-LD softwareVersion", badge is not None and badge == sw,
          f"{badge} vs {sw}")
    return app


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        await restore_session(context, page)

        # ---- 1) Vytvorenie servera s 26.2 ----
        await page.goto(f"{BASE}/add-server", wait_until="domcontentloaded")
        text_inputs = page.locator("form input[type=text]")
        await text_inputs.nth(0).fill(SERVER_NAME)
        await text_inputs.nth(1).fill(SERVER_IP)
        await page.locator("form textarea").first.fill(
            "E2E test konzistencie odznaku verzie a JSON-LD."
        )
        await page.locator("form select").first.select_option(VERSION_A)
        await page.get_by_role("button", name="Java").first.click()
        await page.locator("form button[type=submit]").first.click()
        await page.wait_for_url(lambda u: "/add-server" not in u, timeout=20000)
        check("server s 26.2 bol vytvorený", "/add-server" not in page.url, page.url)

        # ---- 2) Konzistencia pred editáciou ----
        detail_url = await open_detail(page)
        app = await assert_consistent(page, VERSION_A, "pred editáciou")
        check("JSON-LD má typ SoftwareApplication", bool(app))
        apps = [o for o in await read_json_ld(page) if o.get("@type") == "SoftwareApplication"]
        check("v DOM je práve jeden SoftwareApplication blok", len(apps) == 1, len(apps))
        check("title obsahuje verziu", f"v{VERSION_A}" in await page.title(), await page.title())
        await page.screenshot(path=str(SHOTS / "jsonld_before_edit.png"))

        # ---- 3) Editácia na 1.20.4 ----
        edit_url = detail_url.replace("/server/", "/edit-server/")
        await page.goto(edit_url, wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)
        select = page.locator("form select").first
        await select.select_option(VERSION_B)
        await page.locator("form button[type=submit]").first.click()
        await page.wait_for_timeout(3000)

        # okamžitá aktualizácia hlavičky ešte pred reloadom profilu
        imm_app = await software_application(page)
        imm_sw = (imm_app or {}).get("softwareVersion")
        check("JSON-LD sa po uložení aktualizoval okamžite (bez reloadu)",
              imm_sw == f"v{VERSION_B}", imm_sw)
        title_now = await page.title()
        desc_now = await page.eval_on_selector(
            'meta[name="description"]', "el => el.getAttribute('content')"
        ) if await page.locator('meta[name="description"]').count() else ""
        check("title po uložení obsahuje novú verziu", f"v{VERSION_B}" in title_now, title_now)
        check("meta description po uložení obsahuje novú verziu",
              f"v{VERSION_B}" in (desc_now or ""), desc_now)
        check("stará verzia zmizla z title", f"v{VERSION_A}" not in title_now, title_now)

        # ---- 4) Po tvrdom reloade profilu ----
        await page.goto(detail_url, wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        await assert_consistent(page, VERSION_B, "po reloade")
        blob = json.dumps(await read_json_ld(page), ensure_ascii=False)
        check("stará verzia sa v JSON-LD už nenachádza", f"v{VERSION_A}" not in blob)
        await page.screenshot(path=str(SHOTS / "jsonld_after_edit.png"))

        print("\nDETAIL URL:", detail_url)
        print("IP:", SERVER_IP)
        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} krokov OK")
    sys.exit(1 if failed else 0)


asyncio.run(main())
