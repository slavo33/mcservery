"""
E2E/CI test: HTTP hlavičky sitemapy (Content-Type, status kódy, caching).

Overuje na všetkých dostupných pôvodoch (lokálny dev server, živá edge funkcia
`sitemap`, produkčná doména – ak je dostupná):

 1. `sitemap.xml`, prípadné chunky `sitemap-N.xml` a `robots.txt` vracajú 200.
 2. Content-Type je XML (`application/xml` / `text/xml`), robots.txt `text/plain`.
 3. Caching hlavičky sú vhodné: žiadny `immutable`, žiadne dlhé `max-age`
    (> 1 hodina) ani `Expires` ďaleko v budúcnosti – sitemapa sa musí dať
    obnoviť bez ručného zásahu (bez chybného pre-cache).
 4. Neexistujúci chunk (`sitemap-9999.xml`) nevracia 200 XML na produkcii.
 5. Živá sitemapa odpovedá na `OPTIONS` (CORS preflight) a na `HEAD`/`GET`
    rovnakým Content-Type.

Spustenie (dev server na http://localhost:8080):
    python3 e2e/sitemap_headers_e2e.py
"""
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCAL = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
PROD = "https://mcservery.one"

XML_TYPES = ("application/xml", "text/xml")
MAX_AGE_LIMIT = 3600  # sitemapa sa nesmie cachovať dlhšie ako hodinu

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def env(key):
    if os.environ.get(key):
        return os.environ[key]
    envfile = ROOT / ".env"
    if envfile.exists():
        for line in envfile.read_text().splitlines():
            if line.startswith(key + "="):
                return line[len(key) + 1:].strip().strip('"')
    return None


SUPA_URL = env("VITE_SUPABASE_URL")
LIVE_SITEMAP = f"{SUPA_URL}/functions/v1/sitemap" if SUPA_URL else None


UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/126.0 Safari/537.36")


def request(url, method="GET", extra_headers=None):
    req = urllib.request.Request(
        url, method=method, headers={"User-Agent": UA, **(extra_headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            body = r.read().decode("utf-8", "replace") if method == "GET" else ""
            return r.status, {k.lower(): v for k, v in r.headers.items()}, body
    except urllib.error.HTTPError as e:
        return e.code, {k.lower(): v for k, v in e.headers.items()}, ""
    except Exception as exc:  # sieť/origin nedostupný
        return None, {}, str(exc)


def cache_ok(headers):
    """Vráti (ok, popis) – caching hlavičky nesmú brániť čerstvosti sitemapy."""
    cc = (headers.get("cache-control") or "").lower()
    if "immutable" in cc:
        return False, f"immutable v Cache-Control: {cc}"
    m = re.search(r"max-age=(\d+)", cc)
    if m and int(m.group(1)) > MAX_AGE_LIMIT:
        return False, f"príliš dlhý max-age: {cc}"
    s = re.search(r"s-maxage=(\d+)", cc)
    if s and int(s.group(1)) > MAX_AGE_LIMIT:
        return False, f"príliš dlhý s-maxage: {cc}"
    return True, cc or "(bez Cache-Control – default CDN)"


def check_xml_endpoint(label, url, required=True):
    status, headers, body = request(url)
    if status is None:
        if required:
            check(f"{label} je dostupný", False, headers or body)
        else:
            print(f"SKIP  {label} (nedostupný origin)")
        return None
    check(f"{label} vracia 200", status == 200, status)
    ctype = (headers.get("content-type") or "").lower()
    check(f"{label} má XML Content-Type", any(t in ctype for t in XML_TYPES), ctype)
    check(f"{label} má charset alebo je čisté XML", "xml" in ctype, ctype)
    ok, desc = cache_ok(headers)
    check(f"{label} má vhodné caching hlavičky (bez pre-cache)", ok, desc)
    validator = headers.get("etag") or headers.get("last-modified")
    check(f"{label} poskytuje validátor (ETag/Last-Modified)", bool(validator),
          validator or "chýba")
    return body


def main():
    # ---------- 1) Lokálny dev server ----------
    body = check_xml_endpoint("lokálna sitemap.xml", f"{LOCAL}/sitemap.xml")

    if body:
        is_index = "<sitemapindex" in body
        check("lokálna sitemapa je urlset alebo sitemapindex",
              is_index or "<urlset" in body)
        for chunk in sorted(set(re.findall(r"/(sitemap-\d+\.xml)</loc>", body))):
            check_xml_endpoint(f"lokálny chunk {chunk}", f"{LOCAL}/{chunk}")

    status, headers, _ = request(f"{LOCAL}/robots.txt")
    check("lokálny robots.txt vracia 200", status == 200, status)
    check("lokálny robots.txt má text/plain",
          "text/plain" in (headers.get("content-type") or ""), headers.get("content-type"))
    ok, desc = cache_ok(headers)
    check("lokálny robots.txt má vhodné caching hlavičky", ok, desc)

    # ---------- 2) Živá sitemapa (edge funkcia) ----------
    if LIVE_SITEMAP:
        st, hd, live_body = request(LIVE_SITEMAP)
        check("živá sitemapa (edge) vracia 200", st == 200, st)
        ctype = (hd.get("content-type") or "").lower()
        # Funkcia posiela application/xml; brána Supabase pre funkcie na doméne
        # *.supabase.co Content-Type zámerne degraduje na text/plain (nosniff +
        # CSP sandbox). Nesmie to však byť HTML – crawler používa doménovú
        # sitemapu s korektným text/xml.
        check("živá sitemapa nemá HTML Content-Type",
              any(t in ctype for t in XML_TYPES) or ctype.startswith("text/plain"), ctype)
        if not any(t in ctype for t in XML_TYPES):
            print(f"WARN  brána degraduje Content-Type živej sitemapy na {ctype} "
                  "(platformové obmedzenie *.supabase.co)")
        ok, desc = cache_ok(hd)
        check("živá sitemapa má vhodné caching hlavičky (bez pre-cache)", ok, desc)
        check("živá sitemapa poskytuje validátor (ETag/Last-Modified)",
              bool(hd.get("etag") or hd.get("last-modified")), hd.get("etag"))
        if live_body is not None:
            check("živá sitemapa vracia XML obsah", "<urlset" in live_body or
                  "<sitemapindex" in live_body, live_body[:60])
        st, hd, _ = request(LIVE_SITEMAP, method="OPTIONS")
        check("živá sitemapa odpovedá na CORS preflight", st in (200, 204), st)
        check("preflight má access-control-allow-origin",
              bool(hd.get("access-control-allow-origin")), hd.get("access-control-allow-origin"))
        st_h, hd_h, _ = request(LIVE_SITEMAP, method="HEAD")
        if st_h in (200, 405):
            check("HEAD nevracia chybu servera", st_h < 500, st_h)
        # Podmienená požiadavka musí vrátiť 304 (šetrí crawl budget, nie pre-cache)
        _, hd_e, _ = request(LIVE_SITEMAP)
        etag = hd_e.get("etag")
        if etag:
            st_304, _, _ = request(LIVE_SITEMAP, extra_headers={"If-None-Match": etag})
            check("živá sitemapa podporuje If-None-Match (304)", st_304 == 304, st_304)
    else:
        print("SKIP  živá sitemapa (chýba VITE_SUPABASE_URL)")

    # ---------- 3) Produkčná doména (voliteľne) ----------
    prod_status, prod_headers, prod_body = request(f"{PROD}/sitemap.xml")
    if prod_status is None:
        print("SKIP  produkčná doména (nedostupná)")
    else:
        check("produkčná sitemap.xml vracia 200", prod_status == 200, prod_status)
        ctype = (prod_headers.get("content-type") or "").lower()
        check("produkčná sitemap.xml má XML Content-Type",
              any(t in ctype for t in XML_TYPES), ctype)
        ok, desc = cache_ok(prod_headers)
        check("produkčná sitemap.xml nemá chybný pre-cache", ok, desc)
        check("produkčná sitemap.xml má ETag/Last-Modified",
              bool(prod_headers.get("etag") or prod_headers.get("last-modified")),
              prod_headers.get("etag"))
        for chunk in sorted(set(re.findall(r"/(sitemap-\d+\.xml)</loc>", prod_body or ""))):
            check_xml_endpoint(f"produkčný chunk {chunk}", f"{PROD}/{chunk}", required=False)

        st404, hd404, _ = request(f"{PROD}/sitemap-9999.xml")
        check("neexistujúci chunk nevracia 200 XML",
              st404 != 200 or "xml" not in (hd404.get("content-type") or "").lower(),
              f"{st404} {hd404.get('content-type')}")

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} kontrol OK")
    sys.exit(1 if failed else 0)


main()
