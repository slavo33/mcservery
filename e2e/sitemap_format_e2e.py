"""
End-to-end krok: validácia formátu generovanej sitemapy.

Overuje, že sitemap.xml (a v režime indexu aj chunky sitemap-N.xml):
 1. je dobre formované XML v správnom namespace sitemaps.org/0.9,
 2. má pri KAŽDEJ <url> vyplnený <lastmod> v ISO 8601 (žiadny chýbajúci dátum),
 3. používa povolené hodnoty <changefreq> a <priority> v rozsahu 0.0–1.0,
 4. má absolútne <loc> na https://mcservery.one bez duplicít,
 5. neobsahuje súkromné/noindex routy blokované v robots.txt,
 6. v režime sitemap indexu má rovnaké garancie aj každý chunk
    a súčet URL v chunkoch sedí s jednosúborovou sitemapou.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 e2e/sitemap_format_e2e.py
"""
import os
import re
import subprocess
import sys
import urllib.request
from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree as ET

BASE = "http://localhost:8080"
SITE_URL = "https://mcservery.one"
ROOT = Path(__file__).resolve().parents[1]
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
NS_URI = "http://www.sitemaps.org/schemas/sitemap/0.9"
CHANGEFREQ = {"always", "hourly", "daily", "weekly", "monthly", "yearly", "never"}
# Routy, ktoré sú noindex / zakázané v robots.txt — v sitemape nesmú byť.
FORBIDDEN = ("/admin", "/profile", "/console", "/auth", "/vip-success", "/edit")

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def regenerate(env_extra=None):
    env = {**os.environ, **(env_extra or {})}
    proc = subprocess.run(
        ["bunx", "tsx", "scripts/generate-sitemap.ts"],
        cwd=ROOT, env=env, capture_output=True, text=True, timeout=180,
    )
    print("  sitemap:", (proc.stdout or proc.stderr).strip().splitlines()[-1:])
    return proc.returncode == 0


def fetch(path):
    req = urllib.request.Request(f"{BASE}{path}", headers={"User-Agent": "e2e-sitemap"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, r.read().decode("utf-8")


def is_iso8601(value):
    if not value:
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return bool(re.match(r"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z))?$", value))


def validate_urlset(xml_text, label):
    """Zvaliduje jeden <urlset> a vráti zoznam <loc> hodnôt."""
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        check(f"{label}: dobre formované XML", False, e)
        return []
    check(f"{label}: dobre formované XML", True)
    check(f"{label}: koreň je urlset v správnom namespace", root.tag == f"{{{NS_URI}}}urlset", root.tag)

    urls = root.findall("sm:url", NS)
    check(f"{label}: obsahuje aspoň jednu URL", len(urls) > 0, len(urls))

    locs, missing_lastmod, bad_lastmod, bad_freq, bad_prio, bad_loc = [], [], [], [], [], []
    for u in urls:
        loc = (u.findtext("sm:loc", default="", namespaces=NS) or "").strip()
        lastmod = (u.findtext("sm:lastmod", default="", namespaces=NS) or "").strip()
        freq = (u.findtext("sm:changefreq", default="", namespaces=NS) or "").strip()
        prio = (u.findtext("sm:priority", default="", namespaces=NS) or "").strip()
        locs.append(loc)
        if not loc.startswith(f"{SITE_URL}/"):
            bad_loc.append(loc)
        if not lastmod:
            missing_lastmod.append(loc)
        elif not is_iso8601(lastmod):
            bad_lastmod.append((loc, lastmod))
        if freq and freq not in CHANGEFREQ:
            bad_freq.append((loc, freq))
        if prio:
            try:
                if not 0.0 <= float(prio) <= 1.0:
                    bad_prio.append((loc, prio))
            except ValueError:
                bad_prio.append((loc, prio))

    check(f"{label}: každá URL má <lastmod>", not missing_lastmod, missing_lastmod[:5])
    check(f"{label}: <lastmod> je v ISO 8601", not bad_lastmod, bad_lastmod[:5])
    check(f"{label}: <changefreq> má povolenú hodnotu", not bad_freq, bad_freq[:5])
    check(f"{label}: <priority> je v rozsahu 0.0–1.0", not bad_prio, bad_prio[:5])
    check(f"{label}: <loc> sú absolútne na {SITE_URL}", not bad_loc, bad_loc[:5])
    check(f"{label}: žiadne duplicitné <loc>", len(locs) == len(set(locs)),
          [l for l in set(locs) if locs.count(l) > 1][:5])
    forbidden = [l for l in locs if any(l.rstrip("/").endswith(f) or f"{f}/" in l for f in FORBIDDEN)]
    check(f"{label}: neobsahuje súkromné/noindex routy", not forbidden, forbidden[:5])
    return locs


def main():
    check("pregenerovanie sitemapy", regenerate())

    status, xml = fetch("/sitemap.xml")
    check("sitemap.xml vracia HTTP 200", status == 200, status)
    check("sitemap.xml má XML deklaráciu", xml.lstrip().startswith('<?xml version="1.0" encoding="UTF-8"?>'),
          xml.lstrip()[:40])
    single_locs = validate_urlset(xml, "sitemap.xml")

    # Režim sitemap indexu — rovnaké garancie musia platiť aj pre chunky.
    check("pregenerovanie v režime indexu", regenerate({"SITEMAP_URLS_PER_FILE": "10"}))
    status, idx = fetch("/sitemap.xml")
    check("index vracia HTTP 200", status == 200, status)
    try:
        root = ET.fromstring(idx)
        parsed = True
    except ET.ParseError as e:
        parsed = False
        check("index: dobre formované XML", False, e)
    if parsed:
        check("index: dobre formované XML", True)
        check("index: koreň je sitemapindex", root.tag == f"{{{NS_URI}}}sitemapindex", root.tag)
        chunks = root.findall("sm:sitemap", NS)
        chunk_locs = [(c.findtext("sm:loc", default="", namespaces=NS) or "").strip() for c in chunks]
        chunk_mods = [(c.findtext("sm:lastmod", default="", namespaces=NS) or "").strip() for c in chunks]
        check("index: viac ako jeden chunk", len(chunk_locs) > 1, len(chunk_locs))
        check("index: chunky majú platnú absolútnu URL",
              all(re.match(rf"^{SITE_URL}/sitemap-\d+\.xml$", c) for c in chunk_locs), chunk_locs[:3])
        check("index: každý chunk má <lastmod> v ISO 8601",
              all(is_iso8601(m) for m in chunk_mods), chunk_mods[:3])

        total = []
        for c in chunk_locs:
            st, cx = fetch(c.replace(SITE_URL, ""))
            check(f"chunk {c.rsplit('/', 1)[-1]} vracia HTTP 200", st == 200, st)
            total += validate_urlset(cx, c.rsplit("/", 1)[-1])
        check("súčet URL v chunkoch zodpovedá jednosúborovej sitemape",
              sorted(total) == sorted(single_locs), (len(total), len(single_locs)))

    # obnovenie štandardného režimu
    check("obnovenie štandardnej sitemapy", regenerate())
    status, final_xml = fetch("/sitemap.xml")
    check("sitemap.xml je opäť jeden urlset", "<urlset" in final_xml, final_xml[:60])
    check("po obnovení sedí počet URL", sorted(validate_urlset(final_xml, "sitemap.xml (obnovená)")) == sorted(single_locs))

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} krokov OK")
    sys.exit(1 if failed else 0)


main()
