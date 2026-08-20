"""E2E: vyhľadávanie, filtre a stránkovanie na mobilnom breakpointe (390x844).

Overuje, že:
  - vyhľadávanie a filtre v hlavičke zoznamu aktualizujú výsledky aj URL (?q=, ?version=, ...)
  - výsledky sa okamžite prekreslia a zodpovedajú aktívnym filtrom
  - stránkovanie funguje (?page=), zobrazí max 12 kariet na stranu, bez duplicít medzi stranami
  - prepínanie strán mení aktívny chip a stav prev/next tlačidiel
  - zmena filtra resetuje stránku na 1
  - deep link ?page=N funguje a neplatná strana sa oreže
  - dotykové ciele stránkovania majú aspoň 44x44 px a nič nepreteká cez šírku obrazovky
"""

import asyncio
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.async_api import async_playwright

import sys as _sys
from pathlib import Path as _Path
_sys.path.insert(0, str(_Path(__file__).parent))
from filters_drawer import open_filters_if_needed  # noqa: E402

BASE_URL = "http://localhost:8080"
SERVERS_URL = f"{BASE_URL}/servers"
SCREENSHOTS = Path(__file__).parent / "screenshots"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

MOBILE = {"width": 390, "height": 844}
PER_PAGE = 12

failures: list[str] = []
checks = 0


def check(cond: bool, msg: str) -> None:
    global checks
    checks += 1
    if not cond:
        failures.append(msg)
        print(f"  FAIL: {msg}")


def qs(page) -> dict:
    return {k: v[0] for k, v in parse_qs(urlparse(page.url).query).items()}


async def settle(page) -> None:
    await page.wait_for_timeout(400)


EXTRACT_JS = """els => els.map(e => ({
    name: e.dataset.serverName || "",
    ip: e.dataset.serverIp || "",
    version: e.dataset.serverVersion || "",
}))"""


async def _collect_scrolled(page, extract_js):
    """Virtualizovaná mriežka renderuje len viditeľné riadky – preskrolujeme ju."""
    seen = {}
    height = await page.evaluate("() => window.innerHeight")
    pos, guard = 0, 0
    while guard < 40:
        for c in await page.eval_on_selector_all("[data-server-card]", extract_js):
            seen[c["ip"]] = c
        limit = await page.evaluate("() => document.documentElement.scrollHeight")
        if pos >= limit:
            break
        pos += int(height * 0.7)
        await page.evaluate(f"window.scrollTo(0, {pos})")
        await page.wait_for_timeout(250)
        guard += 1
    await page.evaluate("window.scrollTo(0, 0)")
    await page.wait_for_timeout(250)
    return list(seen.values())


async def cards(page):
    return await _collect_scrolled(page, EXTRACT_JS)


async def grid_meta(page) -> dict:
    return await page.evaluate(
        """() => {
            const g = document.querySelector('[data-results-count]');
            if (!g) return null;
            return {
                total: Number(g.dataset.resultsCount || 0),
                page: Number(g.dataset.page || 1),
                pageCount: Number(g.dataset.pageCount || 1),
            };
        }"""
    )


async def main() -> int:
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport=MOBILE, is_mobile=True, has_touch=True)
        page = await context.new_page()

        await page.goto(SERVERS_URL, wait_until="domcontentloaded")
        await page.wait_for_selector("[data-filter-drawer-trigger], [data-filter-group='version']", timeout=15000)
        await settle(page)

        meta = await grid_meta(page)
        check(meta is not None, "chýba grid s data-results-count")
        if not meta:
            await browser.close()
            return 1

        total = meta["total"]
        print(f"Mobil 390x844 — celkovo {total} serverov, {meta['pageCount']} strán")
        check(total > 0, "na /servers nie sú žiadne servery — test sa nedá vykonať")
        if total == 0:
            await browser.close()
            return 1

        expected_pages = max(1, -(-total // PER_PAGE))
        check(meta["pageCount"] == expected_pages, f"pageCount={meta['pageCount']}, čakalo sa {expected_pages}")

        first_page_cards = await cards(page)
        check(
            len(first_page_cards) == min(PER_PAGE, total),
            f"1. strana zobrazuje {len(first_page_cards)} kariet, čakalo sa {min(PER_PAGE, total)}",
        )

        # ---------- 1. Vyhľadávanie aktualizuje výsledky ----------
        needle = (first_page_cards[0]["name"][:4] or first_page_cards[0]["ip"][:4]).strip()
        search_input = page.locator("input[type='text']").first
        await search_input.fill(needle)
        await settle(page)
        check(qs(page).get("q") == needle, f"URL nemá ?q={needle}, ale {qs(page)}")
        res = await cards(page)
        for c in res:
            check(
                needle.lower() in c["name"].lower() or needle.lower() in c["ip"].lower(),
                f"hľadanie '{needle}': karta {c['ip']} nezodpovedá",
            )
        check(len(res) > 0, f"hľadanie '{needle}' nevrátilo nič")
        check("page" not in qs(page), "vyhľadávanie nemá nastavovať parameter page")

        await search_input.fill("")
        await settle(page)
        check("q" not in qs(page), "po vymazaní hľadania zostal parameter q")
        check((await grid_meta(page))["total"] == total, "po vymazaní hľadania sa nevrátil pôvodný počet")

        # ---------- 2. Filter aktualizuje výsledky aj na mobile ----------
        version = first_page_cards[0]["version"]
        if version:
            drawer = await open_filters_if_needed(page)
            await page.click(f"[data-filter-group='version'] [data-filter-value='{version}']")
            if drawer:
                await page.click("[data-filter-apply]")
            await settle(page)
            check(qs(page).get("version") == version, f"URL nemá ?version={version}")
            res = await cards(page)
            for c in res:
                check(c["version"] == version, f"filter verzie: karta {c['ip']} má {c['version']}")
            drawer = await open_filters_if_needed(page)
            await page.click(f"[data-filter-group='version'] [data-filter-value='{version}']")
            if drawer:
                await page.click("[data-filter-apply]")
            await settle(page)
            check("version" not in qs(page), "po zrušení zostal parameter version")

        # ---------- 3. Stránkovanie ----------
        has_pagination = expected_pages > 1
        pagination = page.locator("[data-pagination]")
        check(
            (await pagination.count() > 0) == has_pagination,
            f"stránkovanie {'malo' if has_pagination else 'nemalo'} byť zobrazené",
        )

        if has_pagination:
            check(await page.locator("[data-page-prev]").is_disabled(), "prev nie je zakázané na 1. strane")

            await page.click("[data-page-next]")
            await settle(page)
            check(qs(page).get("page") == "2", f"po next nie je ?page=2, ale {qs(page)}")
            meta2 = await grid_meta(page)
            check(meta2["page"] == 2, f"grid hlási stranu {meta2['page']}, čakala sa 2")
            second = await cards(page)
            check(len(second) > 0, "2. strana je prázdna")
            check(
                len(second) == min(PER_PAGE, total - PER_PAGE),
                f"2. strana má {len(second)} kariet, čakalo sa {min(PER_PAGE, total - PER_PAGE)}",
            )
            first_ips = {c["ip"] for c in first_page_cards}
            check(not (first_ips & {c["ip"] for c in second}), "strany 1 a 2 obsahujú rovnaké servery")

            active = await page.locator("[data-page-btn][aria-current='page']").inner_text()
            check(active.strip() == "2", f"aktívny chip stránkovania je '{active.strip()}', čakalo sa '2'")

            if expected_pages == 2:
                check(await page.locator("[data-page-next]").is_disabled(), "next nie je zakázané na poslednej strane")

            # späť na 1. stranu
            await page.click("[data-page-prev]")
            await settle(page)
            check("page" not in qs(page), f"na 1. strane by parameter page nemal byť: {qs(page)}")
            check({c['ip'] for c in await cards(page)} == first_ips, "návrat na 1. stranu nezobrazil pôvodné servery")

            # filter resetuje stránku
            await page.click("[data-page-next]")
            await settle(page)
            await page.locator("input[type='text']").first.fill(needle)
            await settle(page)
            check("page" not in qs(page), "zmena filtra nezresetovala stránku na 1")
            await page.locator("input[type='text']").first.fill("")
            await settle(page)

            # deep link + orezanie neplatnej strany
            await page.goto(f"{SERVERS_URL}?page=2", wait_until="domcontentloaded")
            await page.wait_for_selector("[data-pagination]", timeout=15000)
            await settle(page)
            check((await grid_meta(page))["page"] == 2, "deep link ?page=2 nezobrazil 2. stranu")

            await page.goto(f"{SERVERS_URL}?page=9999", wait_until="domcontentloaded")
            await page.wait_for_selector("[data-pagination]", timeout=15000)
            await settle(page)
            check(
                (await grid_meta(page))["page"] == expected_pages,
                "neplatná strana v URL sa neorezala na poslednú",
            )

            # dotykové ciele + overflow
            sizes = await page.eval_on_selector_all(
                "[data-pagination] button",
                "els => els.map(e => { const r = e.getBoundingClientRect(); return [r.width, r.height, r.right]; })",
            )
            for w, h, right in sizes:
                check(w >= 44 and h >= 44, f"malý dotykový cieľ stránkovania: {w:.0f}x{h:.0f} px")
                check(right <= MOBILE["width"] + 1, f"tlačidlo stránkovania preteká cez okraj ({right:.0f} px)")

            overflow = await page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
            check(overflow <= 1, f"stránka horizontálne preteká o {overflow} px")

        await page.screenshot(path=str(SCREENSHOTS / "servers_search_pagination_mobile.png"))
        await browser.close()

    print(f"\n{checks - len(failures)}/{checks} kontrol OK")
    if failures:
        print("\nZlyhania:")
        for f in failures:
            print(f" - {f}")
        return 1
    return 0


sys.exit(asyncio.run(main()))
