"""
E2E SEO regresný test pre staff stránky: /staff a dynamické /staff/<slug>.

Pre každú stránku overuje:
 1. práve jeden neprázdny <h1> (bez šablónových hodnôt),
 2. všetky <img> v <main> majú neprázdny a popisný alt text,
 3. <title> (≤ 70 znakov, unikátny) a meta description (50–160 znakov),
 4. jeden self-referencing canonical na produkčnú doménu, og:url == canonical,
 5. OG/Twitter tagy: og:title/description/type/url/image(+alt), twitter:card,
    twitter:title/description/image; hodnoty sedia s <title>/description,
 6. JSON-LD: parsovateľný JSON, JobPosting s povinnými poľami
    (title, description, datePosted, validThrough, hiringOrganization,
    jobLocationType/applicantLocationRequirements) a BreadcrumbList
    s korektne číslovanými položkami.

Spustenie (dev server na http://localhost:8080):
    python3 e2e/staff_pages_seo_e2e.py
    E2E_BASE_URL=https://mcservery.one python3 e2e/staff_pages_seo_e2e.py
"""
import asyncio
import json
import os
import sys
from urllib.parse import urlparse

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
SITE_HOST = "mcservery.one"
PLACEHOLDER = {"lovable app", "lovable generated project", "vite + react + ts", ""}

results = []


def check(label, ok, extra=""):
    results.append((label, bool(ok), extra))
    print(("PASS " if ok else "FAIL ") + label + ((" :: " + str(extra)) if extra else ""))


def norm(path):
    path = (path or "/").split("?")[0].split("#")[0]
    return path[:-1] if len(path) > 1 and path.endswith("/") else path


async def collect(page, path):
    await page.goto(BASE + path, wait_until="domcontentloaded", timeout=30000)
    try:
        await page.wait_for_selector("link[rel=canonical]", timeout=8000)
    except Exception:
        pass
    await page.wait_for_timeout(900)
    return await page.evaluate(
        """() => {
            const meta = (sel) => Array.from(document.querySelectorAll(sel))
                .map(m => (m.getAttribute('content') || '').trim());
            const scope = document.querySelector('main') || document.body;
            return {
                path: location.pathname,
                title: document.title,
                desc: meta('meta[name="description"]'),
                h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
                imgs: Array.from(scope.querySelectorAll('img')).map(i => ({
                    alt: (i.getAttribute('alt') || '').trim(),
                    src: i.currentSrc || i.src,
                    hidden: i.getAttribute('aria-hidden') === 'true',
                })),
                canonicals: Array.from(document.querySelectorAll('link[rel=canonical]')).map(l => l.href),
                ogTitle: meta('meta[property="og:title"]'),
                ogDesc: meta('meta[property="og:description"]'),
                ogType: meta('meta[property="og:type"]'),
                ogUrl: meta('meta[property="og:url"]'),
                ogImage: meta('meta[property="og:image"]'),
                ogImageAlt: meta('meta[property="og:image:alt"]'),
                ogSite: meta('meta[property="og:site_name"]'),
                twCard: meta('meta[name="twitter:card"]'),
                twTitle: meta('meta[name="twitter:title"]'),
                twDesc: meta('meta[name="twitter:description"]'),
                twImage: meta('meta[name="twitter:image"]'),
                robots: meta('meta[name="robots"]'),
                jsonld: Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
                    .map(s => s.textContent),
            };
        }"""
    )


def validate_head(label, path, d, expect_job=False):
    title = d["title"].strip()
    check(f"{label} má neprázdny <title>", title.lower() not in PLACEHOLDER, title[:70])
    check(f"{label} <title> ≤ 70 znakov", len(title) <= 70, len(title))

    desc = d["desc"][0] if d["desc"] else ""
    check(f"{label} má práve jednu meta description", len(d["desc"]) == 1, d["desc"])
    check(f"{label} description má 50–160 znakov", 50 <= len(desc) <= 160, len(desc))

    check(f"{label} má práve jeden <h1>", len(d["h1"]) == 1, d["h1"])
    if d["h1"]:
        check(f"{label} <h1> nie je prázdny", len(d["h1"][0]) >= 3, d["h1"][0][:60])

    visible = [i for i in d["imgs"] if not i["hidden"]]
    missing = [i["src"][-60:] for i in visible if len(i["alt"]) < 5]
    check(f"{label} všetky obrázky majú popisný alt", not missing, missing[:3])

    canon = d["canonicals"]
    check(f"{label} má práve jeden canonical", len(canon) == 1, canon)
    canon_url = canon[0] if canon else ""
    if canon_url:
        cp = urlparse(canon_url)
        check(f"{label} canonical je https na produkčnej doméne",
              cp.scheme == "https" and cp.netloc.endswith(SITE_HOST), canon_url)
        check(f"{label} canonical je self-referencing", norm(cp.path) == norm(path),
              f"{cp.path} != {path}")

    for name, key in [("og:title", "ogTitle"), ("og:description", "ogDesc"), ("og:type", "ogType"),
                      ("og:url", "ogUrl"), ("og:image", "ogImage"), ("og:image:alt", "ogImageAlt"),
                      ("og:site_name", "ogSite"), ("twitter:card", "twCard"),
                      ("twitter:title", "twTitle"), ("twitter:description", "twDesc"),
                      ("twitter:image", "twImage")]:
        vals = d[key]
        check(f"{label} {name} existuje práve raz a nie je prázdny",
              len(vals) == 1 and bool(vals[0]), vals)

    one = lambda k: d[k][0] if d[k] else ""
    check(f"{label} og:title == <title>", one("ogTitle") == title)
    check(f"{label} og:description == meta description", one("ogDesc") == desc)
    check(f"{label} twitter:card je summary_large_image",
          one("twCard") == "summary_large_image", one("twCard"))
    check(f"{label} twitter:title == og:title", one("twTitle") == one("ogTitle"))
    check(f"{label} twitter:description == og:description", one("twDesc") == one("ogDesc"))
    check(f"{label} twitter:image == og:image", one("twImage") == one("ogImage"))
    og_img = urlparse(one("ogImage"))
    check(f"{label} og:image je absolútna https URL",
          og_img.scheme == "https" and bool(og_img.netloc), one("ogImage")[:80])
    check(f"{label} og:url == canonical", one("ogUrl").rstrip("/") == canon_url.rstrip("/"),
          f"{one('ogUrl')} vs {canon_url}")
    if expect_job:
        check(f"{label} og:type je article", one("ogType") == "article", one("ogType"))
    check(f"{label} nie je noindex", "noindex" not in " ".join(d["robots"]).lower(), d["robots"])


JOB_REQUIRED = ["title", "description", "datePosted", "validThrough", "hiringOrganization"]


def validate_jsonld(label, blocks, expect_job=False):
    check(f"{label} má JSON-LD", bool(blocks), f"blokov: {len(blocks)}")
    nodes = []
    for i, raw in enumerate(blocks):
        try:
            data = json.loads(raw)
        except Exception as exc:
            check(f"{label} JSON-LD #{i + 1} je platný JSON", False, str(exc)[:90])
            continue
        check(f"{label} JSON-LD #{i + 1} je platný JSON", True)
        items = data.get("@graph", data) if isinstance(data, dict) else data
        items = items if isinstance(items, list) else [items]
        nodes += [n for n in items if isinstance(n, dict)]

    for n in nodes:
        check(f"{label} JSON-LD uzol má @context/@type",
              bool(n.get("@context")) and bool(n.get("@type")), n.get("@type"))
        check(f"{label} JSON-LD uzol nemá prázdne hodnoty",
              all(v not in (None, "", [], {}) for v in n.values()), n.get("@type"))

    types = [n.get("@type") for n in nodes]
    if expect_job:
        job = next((n for n in nodes if n.get("@type") == "JobPosting"), None)
        check(f"{label} JSON-LD obsahuje JobPosting", job is not None, types)
        if job:
            for field in JOB_REQUIRED:
                check(f"{label} JobPosting má '{field}'", bool(job.get(field)))
            check(f"{label} JobPosting má lokalitu",
                  bool(job.get("jobLocation") or job.get("applicantLocationRequirements")))
            check(f"{label} JobPosting jobLocationType je TELECOMMUTE alebo prázdny",
                  job.get("jobLocationType") in (None, "TELECOMMUTE"), job.get("jobLocationType"))
            check(f"{label} JobPosting validThrough > datePosted",
                  str(job.get("validThrough", "")) > str(job.get("datePosted", "")),
                  f"{job.get('datePosted')} → {job.get('validThrough')}")
            hiring = job.get("hiringOrganization") or {}
            check(f"{label} hiringOrganization má name", bool(hiring.get("name")), hiring)

    crumbs = next((n for n in nodes if n.get("@type") == "BreadcrumbList"), None)
    check(f"{label} JSON-LD obsahuje BreadcrumbList", crumbs is not None, types)
    if crumbs:
        items = crumbs.get("itemListElement") or []
        check(f"{label} BreadcrumbList má položky", len(items) >= 2, len(items))
        check(f"{label} BreadcrumbList má správne pozície",
              [it.get("position") for it in items] == list(range(1, len(items) + 1)))
        check(f"{label} BreadcrumbList položky majú názov a URL",
              all(it.get("name") and str(it.get("item", "")).startswith("https://") for it in items))
    return nodes


async def first_staff_slug(page):
    await page.goto(BASE + "/staff", wait_until="domcontentloaded", timeout=30000)
    await page.wait_for_timeout(1500)
    return await page.evaluate(
        """() => {
            const a = Array.from(document.querySelectorAll('a[href^="/staff/"]'))
                .map(x => x.getAttribute('href'))
                .find(h => h && h !== '/staff/' && h.split('/').length === 3);
            return a || null;
        }"""
    )


async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800}, locale="sk-SK")
        page = await ctx.new_page()

        titles = {}
        d = await collect(page, "/staff")
        check("/staff sa načíta", True)
        validate_head("/staff", "/staff", d)
        validate_jsonld("/staff", d["jsonld"])
        titles["/staff"] = d["title"]

        slug_path = await first_staff_slug(page)
        check("na /staff existuje odkaz na detail inzerátu", bool(slug_path), slug_path)
        if slug_path:
            d2 = await collect(page, slug_path)
            validate_head(f"[{slug_path}]", slug_path, d2, expect_job=True)
            validate_jsonld(f"[{slug_path}]", d2["jsonld"], expect_job=True)
            titles[slug_path] = d2["title"]
            check("staff stránky majú unikátne tituly",
                  len(set(titles.values())) == len(titles), list(titles.values()))

        # Neexistujúci inzerát musí byť noindex (soft-404 ochrana).
        d3 = await collect(page, "/staff/tento-inzerat-neexistuje-e2e")
        check("neexistujúci inzerát je noindex",
              "noindex" in " ".join(d3["robots"]).lower(), d3["robots"])

        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n=== {len(results) - len(failed)}/{len(results)} OK ===")
    for label, _, extra in failed:
        print("FAIL:", label, extra)
    return 1 if failed else 0


sys.exit(asyncio.run(run()))
