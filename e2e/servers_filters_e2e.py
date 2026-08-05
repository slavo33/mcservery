"""E2E: vyhľadávanie a filtre serverov (verzia, platforma Java/Bedrock, loader/software, minihry).

Overuje, že:
  - kliknutie na filter zapíše správny parameter do URL (?version=, ?platform=, ?software=, ?minigame=, ?q=)
  - zobrazené karty serverov zodpovedajú aktívnym filtrom (podľa data-* atribútov kariet)
  - výsledky sú podmnožinou nefiltrovaného zoznamu a nič relevantné nechýba
  - kombinácia filtrov funguje ako AND
  - priame otvorenie URL s parametrami predvyplní filtre (deep link) a neplatná hodnota sa ignoruje
  - zrušenie filtra odstráni parameter z URL a vráti pôvodný počet výsledkov
"""

import asyncio
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.async_api import async_playwright

BASE_URL = "http://localhost:8080"
SERVERS_URL = f"{BASE_URL}/servers"
SCREENSHOTS = Path(__file__).parent / "screenshots"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

failures: list[str] = []
checks = 0


def check(cond: bool, msg: str) -> None:
    global checks
    checks += 1
    if not cond:
        failures.append(msg)
        print(f"  FAIL: {msg}")


async def cards(page):
    """Vráti dáta všetkých zobrazených kariet serverov."""
    return await page.eval_on_selector_all(
        "[data-server-card]",
        """els => els.map(e => ({
            name: e.dataset.serverName || "",
            ip: e.dataset.serverIp || "",
            version: e.dataset.serverVersion || "",
            software: e.dataset.serverSoftware || "",
            platforms: (e.dataset.serverPlatforms || "").split(",").filter(Boolean),
            minigames: (e.dataset.serverMinigames || "").split(",").filter(Boolean),
        }))""",
    )


def qs(page) -> dict:
    return {k: v[0] for k, v in parse_qs(urlparse(page.url).query).items()}


async def wait_settled(page) -> None:
    await page.wait_for_timeout(400)


async def click_filter(page, group: str, value: str) -> None:
    await page.click(f"[data-filter-group='{group}'] [data-filter-value='{value}']")
    await wait_settled(page)


async def main() -> int:
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        await page.goto(SERVERS_URL, wait_until="domcontentloaded")
        await page.wait_for_selector("[data-filter-group='version']", timeout=15000)
        await wait_settled(page)

        base = await cards(page)
        print(f"Nefiltrovaný zoznam: {len(base)} serverov")
        check(len(base) > 0, "na /servers nie sú žiadne servery — filtre sa nedajú overiť")
        if not base:
            await browser.close()
            return 1

        by_ip = {c["ip"]: c for c in base}

        # ---------- 1. Filter podľa verzie ----------
        version = base[0]["version"]
        if version:
            await click_filter(page, "version", version)
            params = qs(page)
            check(params.get("version") == version, f"URL nemá ?version={version}, ale {params}")
            res = await cards(page)
            check(len(res) > 0, f"filter verzie {version} nevrátil žiadny výsledok")
            for c in res:
                check(c["version"] == version, f"verzia: karta {c['ip']} má {c['version']}, čakalo sa {version}")
            expected = {c["ip"] for c in base if c["version"] == version}
            check(
                {c["ip"] for c in res} == expected,
                f"verzia {version}: výsledky sa nezhodujú s očakávanou množinou",
            )
            # zrušenie filtra
            await click_filter(page, "version", version)
            check("version" not in qs(page), "po zrušení filtra zostal parameter 'version' v URL")
            check(len(await cards(page)) == len(base), "po zrušení filtra verzie sa nevrátil pôvodný počet")

        # ---------- 2. Filter podľa platformy (Java / Bedrock) ----------
        for platform in ("Java", "Bedrock"):
            await click_filter(page, "platform", platform)
            params = qs(page)
            check(params.get("platform") == platform, f"URL nemá ?platform={platform}, ale {params}")
            res = await cards(page)
            expected = {c["ip"] for c in base if platform.lower() in [p.lower() for p in c["platforms"]]}
            check(
                {c["ip"] for c in res} == expected,
                f"platforma {platform}: {len(res)} výsledkov, očakávalo sa {len(expected)}",
            )
            for c in res:
                check(
                    platform.lower() in [p.lower() for p in c["platforms"]],
                    f"platforma: karta {c['ip']} nemá {platform} ({c['platforms']})",
                )
            await click_filter(page, "platform", platform)
            check("platform" not in qs(page), f"po zrušení zostal parameter 'platform' v URL ({platform})")

        # ---------- 3. Filter podľa loaderu (software) ----------
        software = base[0]["software"]
        if software:
            await click_filter(page, "software", software)
            params = qs(page)
            check(params.get("software") == software, f"URL nemá ?software={software}, ale {params}")
            res = await cards(page)
            expected = {c["ip"] for c in base if c["software"] == software}
            check({c["ip"] for c in res} == expected, f"loader {software}: výsledky sa nezhodujú")
            for c in res:
                check(c["software"] == software, f"loader: karta {c['ip']} má {c['software']}")
            await click_filter(page, "software", software)
            check("software" not in qs(page), "po zrušení zostal parameter 'software' v URL")

        # ---------- 4. Filter podľa minihry ----------
        minigame = next((m for c in base for m in c["minigames"]), None)
        if minigame:
            await click_filter(page, "minigame", minigame)
            params = qs(page)
            check(params.get("minigame") == minigame, f"URL nemá ?minigame={minigame}, ale {params}")
            res = await cards(page)
            expected = {c["ip"] for c in base if minigame in c["minigames"]}
            check({c["ip"] for c in res} == expected, f"minihra {minigame}: výsledky sa nezhodujú")
            for c in res:
                check(minigame in c["minigames"], f"minihra: karta {c['ip']} nemá {minigame}")
            await click_filter(page, "minigame", minigame)
            check("minigame" not in qs(page), "po zrušení zostal parameter 'minigame' v URL")
        else:
            print("  (žiadny server nemá minihry — kontrola minihier preskočená)")

        # ---------- 5. Vyhľadávanie podľa názvu ----------
        needle = base[0]["name"][:4].strip() or base[0]["ip"][:4]
        search_input = page.locator("input[type='text']").first
        await search_input.fill(needle)
        await wait_settled(page)
        check(qs(page).get("q") == needle, f"URL nemá ?q={needle}, ale {qs(page)}")
        res = await cards(page)
        expected = {
            c["ip"] for c in base
            if needle.lower() in c["name"].lower() or needle.lower() in c["ip"].lower()
        }
        check({c["ip"] for c in res} == expected, f"vyhľadávanie '{needle}': výsledky sa nezhodujú")
        await search_input.fill("")
        await wait_settled(page)
        check("q" not in qs(page), "po vymazaní hľadania zostal parameter 'q' v URL")

        # ---------- 6. Kombinácia filtrov (AND) ----------
        combo = base[0]
        if combo["version"] and combo["software"]:
            await page.goto(
                f"{SERVERS_URL}?version={combo['version']}&software={combo['software']}",
                wait_until="domcontentloaded",
            )
            await page.wait_for_selector("[data-filter-group='version']", timeout=15000)
            await wait_settled(page)
            res = await cards(page)
            expected = {
                c["ip"] for c in base
                if c["version"] == combo["version"] and c["software"] == combo["software"]
            }
            check(
                {c["ip"] for c in res} == expected,
                "kombinácia verzia+loader nefunguje ako AND",
            )
            check(combo["ip"] in {c["ip"] for c in res}, "kombinácia filtrov vylúčila zdrojový server")
            # deep link musí predvyplniť aktívne chipy
            active = await page.eval_on_selector_all(
                "[data-filter-group='version'] .filter-chip.active",
                "els => els.map(e => e.textContent.trim())",
            )
            check(
                combo["version"] in active,
                f"deep link nepredvyplnil chip verzie ({active})",
            )

        # ---------- 7. Neplatná hodnota v URL ----------
        await page.goto(f"{SERVERS_URL}?version=9.9.9-neexistuje", wait_until="domcontentloaded")
        await page.wait_for_selector("[data-filter-group='version']", timeout=15000)
        await wait_settled(page)
        res = await cards(page)
        check(
            len(res) == len(base),
            f"neplatná verzia v URL sa mala ignorovať, zobrazilo sa {len(res)}/{len(base)}",
        )

        await page.screenshot(path=str(SCREENSHOTS / "servers_filters.png"))
        await browser.close()

    print(f"\n{checks - len(failures)}/{checks} kontrol OK")
    if failures:
        print("\nZlyhania:")
        for f in failures:
            print(f" - {f}")
        return 1
    return 0


sys.exit(asyncio.run(main()))
