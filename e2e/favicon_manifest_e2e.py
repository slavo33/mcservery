"""E2E: favicon + web manifest sa načítajú bez 404 a manifest má očakávané polia.

Overuje:
  - <link rel="icon">, apple-touch-icon a rel="manifest" sú v HTML
  - všetky ikony a manifest vracajú HTTP 200 so správnym Content-Type
  - manifest je validný JSON a obsahuje name, short_name, icons (192 + 512)
  - ikony uvedené v manifeste existujú (200) a dajú sa dekódovať
"""

import asyncio
import json
import sys
from pathlib import Path
from urllib.parse import urljoin

from playwright.async_api import async_playwright

BASE_URL = "http://localhost:8080"
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


async def main() -> int:
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        await page.goto(BASE_URL, wait_until="domcontentloaded")

        # --- HTML link tags ---
        icon_hrefs = await page.eval_on_selector_all(
            "link[rel~='icon']", "els => els.map(e => e.getAttribute('href'))"
        )
        apple = await page.eval_on_selector_all(
            "link[rel='apple-touch-icon']", "els => els.map(e => e.getAttribute('href'))"
        )
        manifest_href = await page.eval_on_selector_all(
            "link[rel='manifest']", "els => els.map(e => e.getAttribute('href'))"
        )
        theme = await page.eval_on_selector_all(
            "meta[name='theme-color']", "els => els.map(e => e.getAttribute('content'))"
        )

        check(len(icon_hrefs) > 0, "chýba <link rel='icon'>")
        check(len(apple) > 0, "chýba <link rel='apple-touch-icon'>")
        check(len(manifest_href) == 1, f"očakával sa práve 1 rel=manifest, je {len(manifest_href)}")
        check(len(theme) > 0, "chýba <meta name='theme-color'>")

        req = context.request

        # --- ikony z HTML ---
        for href in [h for h in icon_hrefs + apple if h]:
            url = urljoin(BASE_URL, href)
            resp = await req.get(url)
            check(resp.status == 200, f"ikona {href} vrátila {resp.status}")
            ctype = (resp.headers.get("content-type") or "").lower()
            check(
                "image" in ctype or "icon" in ctype,
                f"ikona {href} má neočakávaný Content-Type: {ctype}",
            )
            body = await resp.body()
            check(len(body) > 100, f"ikona {href} je podozrivo malá ({len(body)} B)")

        # --- manifest ---
        if manifest_href:
            murl = urljoin(BASE_URL, manifest_href[0])
            mresp = await req.get(murl)
            check(mresp.status == 200, f"manifest vrátil {mresp.status}")
            ctype = (mresp.headers.get("content-type") or "").lower()
            check(
                "json" in ctype or "manifest" in ctype,
                f"manifest má neočakávaný Content-Type: {ctype}",
            )
            try:
                data = json.loads(await mresp.text())
            except Exception as exc:  # noqa: BLE001
                data = None
                check(False, f"manifest nie je validný JSON: {exc}")

            if isinstance(data, dict):
                for field in ("name", "short_name", "icons", "start_url", "display"):
                    check(bool(data.get(field)), f"manifest: chýba pole '{field}'")
                check(
                    len(str(data.get("short_name", ""))) <= 12,
                    "manifest: short_name by mal mať max 12 znakov",
                )
                icons = data.get("icons") or []
                sizes = {i.get("sizes") for i in icons}
                check("192x192" in sizes, "manifest: chýba ikona 192x192")
                check("512x512" in sizes, "manifest: chýba ikona 512x512")
                for icon in icons:
                    src = icon.get("src")
                    check(bool(src), "manifest: ikona bez 'src'")
                    if not src:
                        continue
                    iresp = await req.get(urljoin(BASE_URL, src))
                    check(iresp.status == 200, f"manifest ikona {src} vrátila {iresp.status}")
                    check(
                        "image" in (iresp.headers.get("content-type") or "").lower(),
                        f"manifest ikona {src} nie je obrázok",
                    )
                    decoded = await page.evaluate(
                        """async (src) => {
                            try {
                                const img = new Image();
                                img.src = src;
                                await img.decode();
                                return img.naturalWidth > 0;
                            } catch (e) { return false; }
                        }""",
                        urljoin(BASE_URL, src),
                    )
                    check(decoded, f"manifest ikona {src} sa nedá dekódovať v prehliadači")

        # --- implicitný /favicon.ico request prehliadača ---
        fresp = await req.get(f"{BASE_URL}/favicon.ico")
        check(fresp.status == 200, f"/favicon.ico vrátil {fresp.status}")

        await page.screenshot(path=str(SCREENSHOTS / "favicon_manifest.png"))
        await browser.close()

    print(f"\n{checks - len(failures)}/{checks} kontrol OK")
    if failures:
        print("\nZlyhania:")
        for f in failures:
            print(f" - {f}")
        return 1
    return 0


sys.exit(asyncio.run(main()))
