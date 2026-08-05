"""
E2E test: robots.txt — syntax, odkaz na sitemap a súlad s noindex/canonical.

Overuje, že:
 1. `/robots.txt` vracia HTTP 200 s `Content-Type: text/plain` a nie je prázdny,
 2. syntax je validná — každý `Allow`/`Disallow` patrí do skupiny `User-agent`,
    cesty začínajú `/` (alebo `*`), žiadne neznáme direktívy,
 3. existuje skupina `User-agent: *`, ktorá neblokuje celý web (`Disallow: /`),
 4. je uvedená aspoň jedna `Sitemap:` direktíva s absolútnou https URL, ktorá
    vracia 200 a validný XML `<urlset>`/`<sitemapindex>`,
 5. sitemap odkazovaná z robots.txt používa doménu projektu,
 6. **žiadna URL zo sitemapy nie je blokovaná** robots pravidlami pre `*`,
 7. **žiadna URL zo sitemapy nemá `noindex`** a jej canonical je self-referencing
    (robots pravidlá a kanonikalizácia si neprotirečia),
 8. **každá súkromná cesta** (`/admin`, `/profile`, `/console`, `/auth`,
    `/vip-success`, `/server/:slug/edit`, neexistujúca stránka) je zároveň
    `Disallow` v robots.txt aj `noindex` v `<head>` a **nie je v sitemape**,
 9. `Disallow` cesty zodpovedajú reálnym routám aplikácie (žiadne preklepy).

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/robots_indexability_e2e.py
    E2E_BASE_URL=https://mcservery.one python3 e2e/robots_indexability_e2e.py
"""
import asyncio
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree as ET

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
SITE_HOST = "mcservery.one"
ROOT = Path(__file__).resolve().parents[1]
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
MAX_URLS = int(os.environ.get("E2E_MAX_URLS", "8"))
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")

PRIVATE_PATHS = ["/admin", "/profile", "/console", "/auth", "/vip-success"]
KNOWN_DIRECTIVES = {"user-agent", "allow", "disallow", "sitemap", "crawl-delay", "host"}

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def local(url):
    """Pri lokálnom behu presmeruje URL z produkčnej domény na testovanú inštanciu."""
    p = urlparse(url)
    if urlparse(BASE).netloc == p.netloc:
        return url
    if p.netloc.endswith(SITE_HOST):
        return BASE + (p.path or "/")
    return url


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), b""
    except Exception as e:
        return 0, {}, str(e).encode()


def parse_robots(text):
    """Vráti (skupiny podľa user-agenta, sitemapy, chyby syntaxe)."""
    groups, sitemaps, errors = {}, [], []
    current = []
    expecting_group = True
    for i, raw in enumerate(text.splitlines(), 1):
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        if ":" not in line:
            errors.append(f"riadok {i}: chýba dvojbodka ({raw.strip()!r})")
            continue
        key, value = line.split(":", 1)
        key, value = key.strip().lower(), value.strip()
        if key not in KNOWN_DIRECTIVES:
            errors.append(f"riadok {i}: neznáma direktíva {key!r}")
            continue
        if key == "user-agent":
            if not expecting_group:
                current = []
            expecting_group = True
            current.append(value.lower())
            groups.setdefault(value.lower(), {"allow": [], "disallow": []})
        elif key == "sitemap":
            sitemaps.append(value)
        elif key in ("allow", "disallow"):
            expecting_group = False
            if not current:
                errors.append(f"riadok {i}: {key} mimo skupiny User-agent")
                continue
            if value and not (value.startswith("/") or value.startswith("*")):
                errors.append(f"riadok {i}: cesta musí začínať '/' ({value!r})")
            for agent in current:
                groups[agent][key].append(value)
    return groups, sitemaps, errors


def rule_to_regex(rule):
    esc = re.escape(rule).replace(r"\*", ".*")
    if esc.endswith(r"\$"):
        return re.compile("^" + esc[:-2] + "$")
    return re.compile("^" + esc)


def blocked(path, group):
    """Google-like matching: vyhráva najdlhšie pravidlo, Allow pri zhode dĺžky."""
    best_len, best_allow = -1, True
    for kind in ("allow", "disallow"):
        for rule in group[kind]:
            if not rule:
                continue
            if rule_to_regex(rule).match(path):
                ln = len(rule)
                if ln > best_len or (ln == best_len and kind == "allow"):
                    best_len, best_allow = ln, kind == "allow"
    return best_len >= 0 and not best_allow


def sitemap_paths(xml_bytes, depth=0):
    paths = []
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return paths
    tag = root.tag.split("}")[-1]
    if tag == "sitemapindex" and depth < 2:
        for loc in root.findall("sm:sitemap/sm:loc", NS):
            st, _, body = fetch(loc.text.strip())
            if st == 200:
                paths += sitemap_paths(body, depth + 1)
    else:
        for loc in root.findall("sm:url/sm:loc", NS):
            paths.append(urlparse(loc.text.strip()).path or "/")
    return paths


async def head_state(page, url):
    await page.goto(url, wait_until="domcontentloaded")
    await page.wait_for_timeout(2200)
    return await page.evaluate(
        """() => ({
             robots: Array.from(document.querySelectorAll('meta[name="robots"]'))
               .map(el => (el.getAttribute('content') || '').toLowerCase()),
             canonical: Array.from(document.querySelectorAll('link[rel="canonical"]'))
               .map(el => el.getAttribute('href') || ''),
           })"""
    )


async def main():
    # ---------- 1) dostupnosť a syntax ----------
    status, headers, body = fetch(BASE + "/robots.txt")
    ctype = (headers.get("Content-Type") or headers.get("content-type") or "")
    text = body.decode("utf-8", "replace")
    check("robots.txt vracia HTTP 200", status == 200, str(status))
    check("robots.txt má Content-Type text/plain", ctype.split(";")[0].strip() == "text/plain", ctype)
    check("robots.txt nie je prázdny", len(text.strip()) > 0, f"{len(text)} B")

    groups, sitemaps, errors = parse_robots(text)
    check("robots.txt má validnú syntax", not errors, "; ".join(errors[:5]))
    check("robots.txt obsahuje skupinu User-agent: *", "*" in groups, ", ".join(groups))
    star = groups.get("*", {"allow": [], "disallow": []})
    check("robots.txt neblokuje celý web", "/" not in star["disallow"], str(star["disallow"]))

    # ---------- 2) sitemap direktívy ----------
    check("robots.txt obsahuje Sitemap direktívu", len(sitemaps) > 0, str(sitemaps))
    abs_https = [s for s in sitemaps if urlparse(s).scheme == "https" and urlparse(s).netloc]
    check("všetky Sitemap URL sú absolútne https", len(abs_https) == len(sitemaps),
          "; ".join(s for s in sitemaps if s not in abs_https))
    primary = next((s for s in sitemaps if urlparse(s).netloc.endswith(SITE_HOST)), None)
    check("robots.txt odkazuje na sitemap na doméne projektu", bool(primary), str(sitemaps))

    all_paths = set()
    local_run = not urlparse(BASE).netloc.endswith(SITE_HOST)
    for sm in sitemaps:
        target = local(sm)
        if local_run and target == sm:
            # externé (nie na doméne projektu) sitemapy sa pri lokálnom behu nesťahujú
            continue
        st, hh, bb = fetch(target)
        ct = (hh.get("Content-Type") or hh.get("content-type") or "")
        check(f"sitemap {urlparse(sm).netloc} vracia 200", st == 200, str(st))
        check(f"sitemap {urlparse(sm).netloc} je XML", "xml" in ct.lower(), ct)
        ps = sitemap_paths(bb) if st == 200 else []
        check(f"sitemap {urlparse(sm).netloc} obsahuje URL", len(ps) > 0, f"{len(ps)} URL")
        all_paths |= set(ps)

    # lokálna sitemapa dev servera (ak sa líši od produkčnej domény)
    st, hh, bb = fetch(BASE + "/sitemap.xml")
    check("/sitemap.xml je dostupná na tejto inštancii", st == 200, str(st))
    all_paths |= set(sitemap_paths(bb) if st == 200 else [])

    # ---------- 3) robots vs sitemap ----------
    blocked_in_sitemap = sorted(p for p in all_paths if blocked(p, star))
    check("žiadna URL zo sitemapy nie je blokovaná v robots.txt",
          not blocked_in_sitemap, "; ".join(blocked_in_sitemap[:5]))

    private_in_sitemap = sorted(
        p for p in all_paths
        if any(p == pp or p.startswith(pp + "/") for pp in PRIVATE_PATHS) or p.endswith("/edit")
    )
    check("sitemap neobsahuje súkromné ani editačné cesty",
          not private_in_sitemap, "; ".join(private_in_sitemap[:5]))

    # ---------- 4) robots pravidlá vs reálne routy ----------
    app = (ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
    routes = re.findall(r'<Route\s+path="([^"]+)"', app)
    route_roots = {r.split("/:")[0].rstrip("/") or "/" for r in routes}
    unknown = [d for d in star["disallow"]
               if d and "*" not in d and d != "/404" and d.rstrip("/") not in route_roots]
    check("Disallow cesty zodpovedajú existujúcim routám", not unknown, "; ".join(unknown))

    for p in PRIVATE_PATHS:
        check(f"robots.txt blokuje {p}", blocked(p, star))
    check("robots.txt blokuje editačné cesty", blocked("/server/test/edit", star))

    # ---------- 5) noindex a canonical v prehliadači ----------
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # súkromné cesty: Disallow + (noindex alebo presmerovanie preč z cesty)
        for p in PRIVATE_PATHS + ["/server/neexistujuci-server-e2e/edit", "/tato-stranka-neexistuje-e2e"]:
            state = await head_state(page, BASE + p)
            has_noindex = any("noindex" in c for c in state["robots"])
            redirected = urlparse(page.url).path.rstrip("/") != p.rstrip("/")
            check(f"[{p}] stránka je noindex alebo presmeruje preč",
                  has_noindex or redirected, f"robots={state['robots']} url={page.url}")

        # indexovateľné URL zo sitemapy: bez noindex, self-referencing canonical
        public = sorted(all_paths)[:MAX_URLS]
        check("zo sitemapy sa testuje aspoň jedna verejná URL", len(public) > 0, f"{len(public)}")
        for p in public:
            state = await head_state(page, BASE + p)
            noindex = [c for c in state["robots"] if "noindex" in c]
            check(f"[{p}] indexovateľná URL nemá noindex", not noindex, str(noindex))
            can = state["canonical"]
            check(f"[{p}] má práve jeden canonical", len(can) == 1, str(can))
            if len(can) == 1:
                cp = urlparse(can[0])
                check(f"[{p}] canonical je self-referencing https URL",
                      cp.scheme == "https" and cp.path.rstrip("/") == p.rstrip("/"), can[0])
                check(f"[{p}] canonical cieľ nie je blokovaný v robots.txt",
                      not blocked(cp.path or "/", star), can[0])

        await browser.close()

    ok = sum(1 for _, o, _ in results if o)
    print(f"\n{ok}/{len(results)} kontrol OK")
    sys.exit(0 if ok == len(results) else 1)


asyncio.run(main())
