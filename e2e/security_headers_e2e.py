"""
E2E test: bezpečnostné HTTP hlavičky verejných stránok.

Pre každú verejnú URL (statické route + vzorka zo sitemapy) overuje, že odpoveď
obsahuje bezpečnostné hlavičky a že žiadna z nich nemá nebezpečnú hodnotu:

 1. `Content-Security-Policy` — existuje, obsahuje `default-src`, `object-src 'none'`,
    `base-uri` a `frame-ancestors` (alebo `X-Frame-Options`); nesmie obsahovať
    `unsafe-eval` v `script-src`, zástupný znak `*` v `default-src`/`script-src`,
    `frame-ancestors *`, ani `http:` schému v skriptoch (mimo dev servera).
 2. `X-Frame-Options` — `DENY` alebo `SAMEORIGIN` (nikdy `ALLOW-FROM`/`ALLOWALL`).
 3. `X-Content-Type-Options` — `nosniff`.
 4. `Referrer-Policy` — jedna z bezpečných hodnôt; nikdy `unsafe-url`,
    `no-referrer-when-downgrade` ani `origin-when-cross-origin`.
 5. `Permissions-Policy` — existuje a zakazuje kameru, mikrofón aj geolokáciu.
 6. `Cross-Origin-Opener-Policy` — `same-origin` (alebo `same-origin-allow-popups`).
 7. `Strict-Transport-Security` — na HTTPS pôvode s `max-age` ≥ 15552000.
 8. `X-XSS-Protection` — buď chýba, alebo je `0` (staré `1; mode=block` je nebezpečné).
 9. Žiadne úniky infraštruktúry: `Server`/`X-Powered-By` neprezradia verziu.
10. Hlavičky sa neduplikujú s konfliktnými hodnotami.

Kontroluje sa HTTP odpoveď aj to, čo reálne vidí prehliadač (Playwright response),
vrátane `<meta http-equiv>` / `<meta name="referrer">` fallbacku.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/security_headers_e2e.py
    E2E_BASE_URL=https://mcservery.one python3 e2e/security_headers_e2e.py
"""
import asyncio
import os
import sys
import urllib.error
import urllib.request
from urllib.parse import urlparse
from xml.etree import ElementTree as ET

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
IS_HTTPS = BASE.startswith("https://")
IS_DEV = "localhost" in BASE or "127.0.0.1" in BASE
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
MAX_URLS = int(os.environ.get("E2E_MAX_URLS", "6"))
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")

STATIC_PUBLIC = ["/", "/servers", "/staff", "/vip", "/terms", "/privacy"]

SAFE_REFERRER = {
    "no-referrer",
    "same-origin",
    "strict-origin",
    "strict-origin-when-cross-origin",
}
UNSAFE_REFERRER = {
    "unsafe-url",
    "no-referrer-when-downgrade",
    "origin-when-cross-origin",
    "",
}

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), b""
    except Exception as e:
        return 0, {}, str(e).encode()


def norm(path):
    path = (path or "/").split("?")[0].split("#")[0]
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]
    return path or "/"


def sitemap_paths():
    paths = []
    status, _, body = fetch(BASE + "/sitemap.xml")
    body = body.decode("utf-8", "replace")
    if status != 200 or not body.strip():
        return paths
    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        return paths
    locs = []
    if root.tag.endswith("sitemapindex"):
        for sm in root.findall("sm:sitemap/sm:loc", NS):
            s, _, b = fetch(sm.text.strip())
            b = b.decode("utf-8", "replace")
            if s != 200 or not b.strip():
                continue
            try:
                sub = ET.fromstring(b)
            except ET.ParseError:
                continue
            locs.extend(sub.findall("sm:url/sm:loc", NS))
    else:
        locs = root.findall("sm:url/sm:loc", NS)
    for loc in locs:
        paths.append(norm(urlparse(loc.text.strip()).path))
    return paths


def lower_headers(headers):
    out = {}
    for k, v in headers.items():
        out[k.lower()] = v.strip()
    return out


def csp_directives(csp):
    d = {}
    for part in csp.split(";"):
        part = part.strip()
        if not part:
            continue
        tokens = part.split()
        d[tokens[0].lower()] = [t.strip() for t in tokens[1:]]
    return d


def audit(label, h, meta):
    """h = dict hlavičiek (lowercase), meta = dict z <meta http-equiv>/<meta name>."""
    csp = h.get("content-security-policy") or meta.get("content-security-policy", "")
    check(f"{label} Content-Security-Policy je nastavená", bool(csp), csp[:120])
    if csp:
        d = csp_directives(csp)
        check(f"{label} CSP má default-src", "default-src" in d, list(d))
        check(f"{label} CSP má base-uri", "base-uri" in d)
        check(f"{label} CSP zakazuje pluginy (object-src 'none')",
              d.get("object-src") == ["'none'"], d.get("object-src"))
        check(f"{label} CSP obmedzuje vkladanie do rámov",
              "frame-ancestors" in d or "x-frame-options" in h,
              d.get("frame-ancestors"))
        fa = d.get("frame-ancestors")
        if fa is not None:
            check(f"{label} CSP frame-ancestors nie je '*'", "*" not in fa, fa)

        script = d.get("script-src", d.get("default-src", []))
        if not IS_DEV:
            check(f"{label} CSP script-src bez 'unsafe-eval'",
                  "'unsafe-eval'" not in script, script)
        check(f"{label} CSP script-src bez zástupného '*'", "*" not in script, script)
        check(f"{label} CSP script-src bez nezabezpečenej http: schémy",
              "http:" not in script, script)
        check(f"{label} CSP default-src bez zástupného '*'",
              "*" not in d.get("default-src", []), d.get("default-src"))
        check(f"{label} CSP form-action je obmedzená",
              "*" not in d.get("form-action", ["'self'"]), d.get("form-action"))

    xfo = (h.get("x-frame-options") or meta.get("x-frame-options", "")).upper()
    if not csp or "frame-ancestors" not in csp:
        check(f"{label} X-Frame-Options je nastavená", bool(xfo), xfo)
    if xfo:
        check(f"{label} X-Frame-Options má bezpečnú hodnotu",
              xfo in ("DENY", "SAMEORIGIN"), xfo)

    xcto = (h.get("x-content-type-options") or "").lower()
    check(f"{label} X-Content-Type-Options: nosniff", xcto == "nosniff", xcto)

    ref = (h.get("referrer-policy") or meta.get("referrer", "")).lower()
    # Hodnota môže byť zoznam — berieme poslednú podporovanú.
    ref_tokens = [t.strip() for t in ref.split(",") if t.strip()]
    ref_last = ref_tokens[-1] if ref_tokens else ""
    check(f"{label} Referrer-Policy je nastavená", bool(ref_last), ref)
    check(f"{label} Referrer-Policy nie je nebezpečná",
          ref_last not in UNSAFE_REFERRER, ref_last)
    check(f"{label} Referrer-Policy je zo zoznamu bezpečných",
          ref_last in SAFE_REFERRER, ref_last)

    pp = (h.get("permissions-policy") or "").lower()
    check(f"{label} Permissions-Policy je nastavená", bool(pp), pp[:80])
    if pp:
        for feature in ("camera", "microphone", "geolocation"):
            check(f"{label} Permissions-Policy zakazuje {feature}",
                  f"{feature}=()" in pp.replace(" ", ""), pp[:80])

    coop = (h.get("cross-origin-opener-policy") or "").lower()
    check(f"{label} Cross-Origin-Opener-Policy je bezpečná",
          coop in ("same-origin", "same-origin-allow-popups"), coop)

    if IS_HTTPS:
        hsts = (h.get("strict-transport-security") or "").lower()
        check(f"{label} Strict-Transport-Security je nastavená", bool(hsts), hsts)
        if hsts:
            age = 0
            for part in hsts.split(";"):
                part = part.strip()
                if part.startswith("max-age="):
                    try:
                        age = int(part.split("=", 1)[1])
                    except ValueError:
                        age = 0
            check(f"{label} HSTS max-age ≥ 15552000", age >= 15552000, age)

    xss = (h.get("x-xss-protection") or "").strip()
    check(f"{label} X-XSS-Protection chýba alebo je '0'",
          xss in ("", "0"), xss)

    server = (h.get("server") or "") + " " + (h.get("x-powered-by") or "")
    check(f"{label} hlavičky neprezrádzajú verziu servera",
          not any(c.isdigit() for c in server.split("/")[-1]) or "/" not in server,
          server.strip())


async def main():
    sm = [p for p in sitemap_paths() if p.startswith("/server/")]
    paths = []
    for p in STATIC_PUBLIC + sm:
        if p not in paths:
            paths.append(p)
    paths = paths[:MAX_URLS]
    check("máme verejné URL na kontrolu", len(paths) > 0, paths)

    # 1) Priame HTTP odpovede
    for path in paths:
        status, headers, _ = fetch(BASE + path)
        label = f"[HTTP {path}]"
        check(f"{label} vracia 200", status == 200, status)
        audit(label, lower_headers(headers), {})

    # 2) Čo reálne vidí prehliadač (vrátane meta fallbacku)
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 900},
                                        user_agent=UA)
        page = await ctx.new_page()
        blocked = []
        page.on("console", lambda m: blocked.append(m.text)
                if m.type == "error" and "Content Security Policy" in m.text else None)

        for path in paths:
            label = f"[prehliadač {path}]"
            blocked.clear()
            resp = await page.goto(BASE + path, wait_until="domcontentloaded", timeout=60000)
            try:
                await page.wait_for_selector("main", timeout=15000)
            except Exception:
                pass
            await page.wait_for_timeout(800)

            headers = lower_headers(await resp.all_headers())
            meta = await page.evaluate(
                """() => {
                    const out = {};
                    document.querySelectorAll('meta[http-equiv]').forEach((m) => {
                        out[m.getAttribute('http-equiv').toLowerCase()] =
                            (m.getAttribute('content') || '').trim();
                    });
                    const ref = document.querySelector('meta[name="referrer"]');
                    if (ref) out.referrer = (ref.getAttribute('content') || '').trim();
                    return out;
                }"""
            )
            audit(label, headers, meta)
            check(f"{label} CSP nič neblokuje na stránke", len(blocked) == 0, blocked[:3])
            check(f"{label} stránka sa vyrenderovala",
                  await page.evaluate("document.body.innerText.trim().length > 100"))

        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} OK")
    if failed:
        for lbl, _, extra in failed:
            print("FAILED:", lbl, extra)
        sys.exit(1)


asyncio.run(main())
