"""Overí, že živá sitemapa (edge funkcia `sitemap`) reflektuje úpravu profilu okamžite.

Kroky:
1. Načíta živú sitemapu a statickú public/sitemap.xml – rovnaká množina URL.
2. Porovná <lastmod> so skutočným updated_at v databáze (žiadny čas buildu).
3. Ak je k dispozícii servisná session, upraví profil a overí, že sa lastmod
   v živej sitemape zmení do 60 sekúnd.
"""

import os
import re
import sys
import time
import urllib.request
import json
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
ROOT = Path(__file__).resolve().parent.parent
results = []


def check(label, ok, extra=""):
    results.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + label + ((f" :: {extra}") if extra else ""))


def env(key):
    if os.environ.get(key):
        return os.environ[key]
    envfile = ROOT / ".env"
    if envfile.exists():
        for line in envfile.read_text().splitlines():
            if line.startswith(key + "="):
                return line[len(key) + 1:].strip().strip('"')
    return None


def get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8")


SUPA_URL = env("VITE_SUPABASE_URL")
SUPA_KEY = env("VITE_SUPABASE_PUBLISHABLE_KEY")
LIVE_SITEMAP = f"{SUPA_URL}/functions/v1/sitemap"


def parse(xml):
    root = ET.fromstring(xml)
    out = {}
    for u in root.findall("sm:url", NS):
        loc = u.findtext("sm:loc", default="", namespaces=NS)
        out[loc] = u.findtext("sm:lastmod", default=None, namespaces=NS)
    return out


def main():
    live_xml = get(LIVE_SITEMAP)
    live = parse(live_xml)
    check("živá sitemapa je dobre formované XML s URL", len(live) > 0, len(live))

    # robots.txt musí na živú sitemapu odkazovať
    robots = (ROOT / "public" / "robots.txt").read_text()
    check("robots.txt odkazuje na živú sitemapu", "/functions/v1/sitemap" in robots)
    check("robots.txt stále odkazuje na statickú sitemapu",
          "https://mcservery.one/sitemap.xml" in robots)

    # Rovnaká množina URL ako statická sitemapa
    static_file = ROOT / "public" / "sitemap.xml"
    if static_file.exists() and "<sitemapindex" not in static_file.read_text():
        static = parse(static_file.read_text())
        check("živá a statická sitemapa majú rovnakú množinu URL",
              set(static) == set(live),
              sorted(set(static) ^ set(live))[:5])

    # lastmod musí sedieť s updated_at v databáze
    headers = {"apikey": SUPA_KEY, "Authorization": f"Bearer {SUPA_KEY}"}
    servers = json.loads(get(
        f"{SUPA_URL}/rest/v1/servers?select=slug,updated_at&slug=not.is.null&limit=1000", headers))
    mismatched = []
    for s in servers:
        loc = f"https://mcservery.one/server/{s['slug']}"
        if loc not in live:
            continue
        expected = s["updated_at"][:19]
        actual = (live[loc] or "")[:19]
        if expected != actual:
            mismatched.append((s["slug"], expected, actual))
    check("lastmod každého profilu zodpovedá updated_at v databáze",
          not mismatched, mismatched[:3])

    for lm in live.values():
        if lm and not re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$", lm):
            check("lastmod je v ISO 8601", False, lm)
            break
    else:
        check("všetky lastmod hodnoty sú v ISO 8601", True)

    # Reálna zmena profilu sa musí prejaviť do 60 s
    token = os.environ.get("E2E_SUPABASE_ACCESS_TOKEN")
    if not token:
        print("SKIP  test úpravy profilu (chýba E2E_SUPABASE_ACCESS_TOKEN)")
    else:
        target = servers[0]["slug"]
        before = live[f"https://mcservery.one/server/{target}"]
        req = urllib.request.Request(
            f"{SUPA_URL}/rest/v1/servers?slug=eq.{target}",
            data=b'{"updated_at":null}', method="PATCH",
            headers={**headers, "Authorization": f"Bearer {token}",
                     "Content-Type": "application/json", "Prefer": "return=minimal"})
        urllib.request.urlopen(req, timeout=30)
        changed = False
        for _ in range(12):
            time.sleep(5)
            now = parse(get(LIVE_SITEMAP)).get(f"https://mcservery.one/server/{target}")
            if now != before:
                changed = True
                break
        check("lastmod sa po úprave profilu obnoví do 60 s", changed)

    print(f"\n{sum(results)}/{len(results)} kontrol OK")
    sys.exit(0 if all(results) else 1)


main()
