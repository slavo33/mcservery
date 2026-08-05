"""
End-to-end test: sitemap.xml a robots.txt po vytvorení a editácii profilu.

Scenár:
 1. Overí robots.txt — je dostupný, nič neblokuje a odkazuje na správny sitemap.
 2. Vytvorí server cez UI, pregeneruje sitemap a overí, že URL profilu
    (/server/<slug>) je v sitemap.xml aj s <lastmod>.
 3. Zeditovaním profilu zmení verziu, pregeneruje sitemap a overí, že
    <lastmod> danej URL sa posunul (odzrkadľuje poslednú aktualizáciu).
 4. Overí režim rozdelenia: pri nízkom limite URL na súbor vznikne
    sitemap index (<sitemapindex>) a URL profilu sa nájde v niektorom chunku,
    ktorý je z indexu odkazovaný. Nakoniec obnoví štandardnú sitemapu.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/sitemap_robots_e2e.py
"""
import asyncio, json, os, re, subprocess, sys, time
from pathlib import Path
from xml.etree import ElementTree as ET
from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SITE_URL = "https://mcservery.one"
ROOT = Path(__file__).resolve().parents[1]
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

STAMP = str(int(time.time()))
SERVER_NAME = f"E2E Sitemap {STAMP}"
SERVER_IP = f"e2esm{STAMP}.example.com"
VERSION_A = "1.20.4"
VERSION_B = "26.2"

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def regenerate_sitemap(env_extra=None):
    env = {**os.environ, **(env_extra or {})}
    proc = subprocess.run(
        ["bunx", "tsx", "scripts/generate-sitemap.ts"],
        cwd=ROOT, env=env, capture_output=True, text=True, timeout=180,
    )
    print("  sitemap:", (proc.stdout or proc.stderr).strip().splitlines()[-1:])
    return proc.returncode == 0


async def fetch_text(page, path):
    resp = await page.request.get(f"{BASE}{path}")
    return resp.status, await resp.text()


def urlset_entries(xml_text):
    root = ET.fromstring(xml_text)
    out = {}
    for url in root.findall("sm:url", NS):
        loc = url.findtext("sm:loc", default="", namespaces=NS)
        out[loc] = url.findtext("sm:lastmod", default=None, namespaces=NS)
    return out


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


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        await restore_session(context, page)

        # ---- 1) robots.txt ----
        status, robots = await fetch_text(page, "/robots.txt")
        check("robots.txt je dostupný (200)", status == 200, status)
        sitemaps = re.findall(r"(?im)^\s*Sitemap:\s*(\S+)\s*$", robots)
        check("robots.txt obsahuje Sitemap direktívu", len(sitemaps) == 1, sitemaps)
        check("Sitemap direktíva ukazuje na správnu URL",
              sitemaps[:1] == [f"{SITE_URL}/sitemap.xml"], sitemaps)
        check("robots.txt neblokuje crawlerov",
              not re.search(r"(?im)^\s*Disallow:\s*/\s*$", robots))

        # ---- 2) vytvorenie profilu ----
        await page.goto(f"{BASE}/add-server", wait_until="domcontentloaded")
        text_inputs = page.locator("form input[type=text]")
        await text_inputs.nth(0).fill(SERVER_NAME)
        await text_inputs.nth(1).fill(SERVER_IP)
        await page.locator("form textarea").first.fill(
            "E2E test prítomnosti profilu v sitemap.xml."
        )
        await page.locator("form select").first.select_option(VERSION_A)
        await page.get_by_role("button", name="Java").first.click()
        await page.locator("form button[type=submit]").first.click()
        await page.wait_for_url(lambda u: "/add-server" not in u, timeout=20000)

        await page.goto(f"{BASE}/servers", wait_until="domcontentloaded")
        await page.get_by_text(SERVER_NAME, exact=False).first.wait_for(timeout=30000)
        await page.get_by_text(SERVER_NAME, exact=False).first.click()
        await page.wait_for_timeout(2500)
        detail_url = page.url
        slug = detail_url.rstrip("/").split("/server/")[-1]
        check("profil bol vytvorený a má slug", bool(slug), slug)
        loc = f"{SITE_URL}/server/{slug}"

        check("sitemap sa pregeneroval po vytvorení", regenerate_sitemap())
        status, xml = await fetch_text(page, "/sitemap.xml")
        check("sitemap.xml je dostupný (200)", status == 200, status)
        entries = urlset_entries(xml)
        check("URL nového profilu je v sitemap.xml", loc in entries, loc)
        lastmod_a = entries.get(loc)
        check("URL profilu má <lastmod>", bool(lastmod_a), lastmod_a)
        check("<lastmod> je vo formáte ISO 8601",
              bool(lastmod_a and re.match(r"^\d{4}-\d{2}-\d{2}T[\d:]{8}\+00:00$", lastmod_a)),
              lastmod_a)
        check("statická stránka /servers je v sitemape",
              f"{SITE_URL}/servers" in entries)
        check("neindexovateľné routy nie sú v sitemape",
              not any("/admin" in u or "/edit" in u or "/profile" in u for u in entries))

        # ---- 3) editácia profilu → nový lastmod ----
        await asyncio.sleep(1.5)
        await page.goto(detail_url.rstrip("/") + "/edit", wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        await page.locator("form select").first.select_option(VERSION_B)
        await page.locator("form button[type=submit]").first.click()
        await page.wait_for_timeout(3000)

        check("sitemap sa pregeneroval po editácii", regenerate_sitemap())
        status, xml2 = await fetch_text(page, "/sitemap.xml")
        entries2 = urlset_entries(xml2)
        lastmod_b = entries2.get(loc)
        check("URL profilu zostala v sitemape aj po editácii", loc in entries2)
        check("<lastmod> sa po editácii aktualizoval",
              bool(lastmod_a and lastmod_b) and lastmod_b > lastmod_a,
              f"{lastmod_a} -> {lastmod_b}")
        check("/servers dedí najnovší lastmod profilu",
              entries2.get(f"{SITE_URL}/servers") == lastmod_b,
              entries2.get(f"{SITE_URL}/servers"))

        # ---- 4) sitemap index pri prekročení limitu ----
        check("sitemap sa pregeneroval s nízkym limitom",
              regenerate_sitemap({"SITEMAP_URLS_PER_FILE": "5"}))
        status, idx = await fetch_text(page, "/sitemap.xml")
        check("sitemap.xml je sitemap index", "<sitemapindex" in idx, idx[:80])
        root = ET.fromstring(idx)
        chunk_locs = [s.findtext("sm:loc", default="", namespaces=NS)
                      for s in root.findall("sm:sitemap", NS)]
        check("index odkazuje na viac chunkov", len(chunk_locs) > 1, len(chunk_locs))
        check("chunky majú správnu absolútnu URL",
              all(re.match(rf"^{SITE_URL}/sitemap-\d+\.xml$", c) for c in chunk_locs),
              chunk_locs[:3])

        found_in = None
        for c in chunk_locs:
            st, cx = await fetch_text(page, c.replace(SITE_URL, ""))
            if st != 200:
                continue
            ent = urlset_entries(cx)
            if loc in ent:
                found_in = (c, ent[loc])
                break
        check("URL profilu je v niektorom chunku indexu", found_in is not None, found_in)
        check("lastmod zostal zachovaný aj v chunku",
              bool(found_in) and found_in[1] == lastmod_b, found_in)

        # obnovenie štandardnej sitemapy
        check("obnovenie štandardnej sitemapy", regenerate_sitemap())
        status, final_xml = await fetch_text(page, "/sitemap.xml")
        check("sitemap.xml je opäť jeden urlset", "<urlset" in final_xml, final_xml[:60])
        check("URL profilu je stále prítomná", loc in urlset_entries(final_xml))

        await page.goto(detail_url, wait_until="domcontentloaded")
        await page.screenshot(path=str(SHOTS / "sitemap_profile.png"))
        print("\nDETAIL URL:", detail_url, "\nIP:", SERVER_IP)
        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} krokov OK")
    sys.exit(1 if failed else 0)


asyncio.run(main())
