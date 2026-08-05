# E2E testy

`version_26_2_e2e.py` — end-to-end scenár (Playwright, Chromium headless):

1. **Vytvorenie servera** cez `/add-server` s verziou **26.2** (overí aj, že Bedrock nie je ponúknutý).
2. **Profil servera** — odznak `v26.2` a SEO title s verziou.
3. **Filtre** na `/servers` — chip `26.2` server zobrazí, iná verzia ho skryje.

Spustenie (dev server na `http://localhost:8080`):

```bash
python3 e2e/version_26_2_e2e.py
```

Prihlásenie sa obnoví zo Supabase session v premenných prostredia. Screenshoty sa ukladajú do `e2e/screenshots/`.
Testovacie servery majú názov `E2E NextGen <timestamp>` a IP `e2e<timestamp>.example.com` — po behu ich treba odstrániť z databázy.

`version_badge_edit_e2e.py` — overuje `VersionBadge` po **editácii verzie**:

1. Vytvorí server s `26.2`, skontroluje odznak na karte v zozname aj na profile (screenshoty odznaku, mobilné zobrazenie bez zalomenia).
2. Zmení verziu cez editáciu na `1.20.4`.
3. Overí, že profil aj karta zobrazujú `v1.20.4`, starý `v26.2` zmizol a SEO title obsahuje novú verziu.

```bash
python3 e2e/version_badge_edit_e2e.py
```

Testovacie servery majú názov `E2E Badge <timestamp>` — po behu ich treba odstrániť z databázy.

`version_badge_mobile_e2e.py` — vytvorí server s verziou **26.2**, otvorí jeho profil a overí odznak verzie:

1. Desktop (1280 px): odznak existuje, text `v26.2`, `white-space: nowrap`.
2. Mobil (375 px): odznak sa zmestí do viewportu, ostáva na jednom riadku, má kontrastné pozadie.
3. Screenshoty: `mobile_e2e_badge_desktop.png`, `mobile_e2e_badge_375.png`, `mobile_e2e_profile_375.png`.

```bash
python3 e2e/version_badge_mobile_e2e.py
```

Testovacie servery majú názov `E2E Mobile <timestamp>` a IP `e2emob<timestamp>.example.com` — po behu ich treba odstrániť z databázy.

`version_jsonld_consistency_e2e.py` — overuje **konzistenciu odznaku verzie a JSON-LD** (`softwareVersion`) priamo v DOM:

1. Vytvorí server s `26.2`; na profile porovná text `VersionBadge` s `softwareVersion` v `script[type="application/ld+json"]` (musí byť presná zhoda `v26.2`) a overí, že v DOM je práve jeden blok `SoftwareApplication`.
2. Zmení verziu na `1.20.4` v editácii (`/server/:slug/edit`) — JSON-LD, `<title>` aj `meta[name=description]` sa musia aktualizovať **okamžite, bez reloadu**.
3. Po tvrdom reloade profilu znova porovná odznak s JSON-LD a overí, že stará verzia sa nikde nenachádza.

```bash
python3 e2e/version_jsonld_consistency_e2e.py
```

Testovacie servery majú názov `E2E JsonLd <timestamp>` a IP `e2eld<timestamp>.example.com` — po behu ich treba odstrániť z databázy.

`sitemap_robots_e2e.py` — overuje **indexovateľnosť profilov cez sitemap.xml a robots.txt**:

1. `robots.txt` je dostupný, neblokuje crawlerov a obsahuje presne jednu `Sitemap:` direktívu na `https://mcservery.one/sitemap.xml`.
2. Po vytvorení profilu a pregenerovaní sitemapy je URL `/server/<slug>` v `sitemap.xml` aj s `<lastmod>` v ISO 8601; admin/edit routy tam nie sú.
3. Po editácii profilu sa `<lastmod>` danej URL posunie a výpis `/servers` zdedí najnovší dátum.
4. Pri nízkom limite (`SITEMAP_URLS_PER_FILE`) sa `sitemap.xml` stane `<sitemapindex>`, URL profilu sa nájde v odkazovanom chunku a `lastmod` zostane zachovaný; na záver sa obnoví štandardná sitemapa.

```bash
python3 e2e/sitemap_robots_e2e.py
```

Testovacie servery majú názov `E2E Sitemap <timestamp>` a IP `e2esm<timestamp>.example.com` — po behu ich treba odstrániť z databázy.

`sitemap_format_e2e.py` — validuje **formát generovanej sitemapy** (nepotrebuje prihlásenie ani testovacie dáta):

1. `sitemap.xml` je dobre formované XML s XML deklaráciou a koreňom `<urlset>` v namespace `sitemaps.org/0.9`.
2. Profily (`/server/…`, `/staff/…`) a výpisové stránky majú `<lastmod>` v ISO 8601; statické stránky bez autoritatívneho dátumu ho podľa politiky nemajú.
3. `<changefreq>` má povolenú hodnotu, `<priority>` je v rozsahu 0.0–1.0, `<loc>` sú absolútne na `https://mcservery.one` a bez duplicít.
4. V sitemape nie sú súkromné/noindex routy (`/admin`, `/profile`, `/console`, `/auth`, `/vip-success`, `…/edit`).
5. V režime sitemap indexu platia rovnaké kontroly aj pre každý chunk `sitemap-N.xml`, index má `lastmod` a súčet URL v chunkoch sedí s jednosúborovou sitemapou; na záver sa obnoví štandardný režim.

```bash
python3 e2e/sitemap_format_e2e.py
```


- `sitemap_indexability_e2e.py` — overí, že každá URL zo sitemap.xml vracia HTTP 200 (žiadne 404/500), nemá `meta robots noindex`, nie je soft-404 a má self-referencing canonical. Statický náprotivok beží v hlavnom CI jobe: `src/integration/__tests__/sitemapIndexability.test.ts`.

- `sitemap_freshness_e2e.py` — overí živú sitemapu z edge funkcie `sitemap` (regeneruje sa pri každom požiadavku): rovnaká množina URL ako statická sitemapa, `lastmod` presne zodpovedá `updated_at` profilu a po úprave profilu sa obnoví do 60 sekúnd.

- `sitemap_profile_update_e2e.py` — overí, že **sitemap sa aktualizuje sama po vytvorení a editácii profilu** (bez ručnej regenerácie): po vytvorení servera cez UI pribudne do živej sitemapy správne `<loc>` (`https://mcservery.one/server/<slug>`) s `<lastmod>` zodpovedajúcim `updated_at`, po editácii sa `lastmod` posunie dopredu, `loc` ostáva rovnaké a v sitemape nie sú duplicity.

```bash
python3 e2e/sitemap_profile_update_e2e.py
```

Testovacie servery majú názov `E2E Sitemap <timestamp>` a IP `sitemap<timestamp>.example.com` — po behu ich treba odstrániť z databázy.

- `sitemap_headers_e2e.py` — overí **HTTP hlavičky sitemapy** lokálne aj na produkcii: `sitemap.xml`, chunky `sitemap-N.xml` a `robots.txt` vracajú 200 so správnym Content-Type (`text/xml`/`application/xml`, resp. `text/plain`), majú ETag/Last-Modified, žiadny `immutable` ani `max-age` nad 1 hodinu (bez chybného pre-cache), živá edge sitemapa podporuje CORS preflight a `If-None-Match` → 304 a neexistujúci chunk nevracia 200 XML.

```bash
python3 e2e/sitemap_headers_e2e.py
```

Poznámka: brána Supabase na doméne `*.supabase.co` degraduje Content-Type odpovede edge funkcie na `text/plain` (nosniff + CSP sandbox) — je to platformové obmedzenie, crawler používa doménovú `https://mcservery.one/sitemap.xml` s korektným `text/xml`. Test to hlási ako WARN.

- `profile_images_e2e.py` — prejde domovskú stránku, `/staff` a prvých 5 profilov serverov a overí, že **každý obrázok a GIF vráti 200** (žiadne 404/403/5xx ani zlyhané requesty), má `content-type: image/*`, reálne sa v prehliadači dekóduje a zobrazí (`complete`, `naturalWidth > 0`, nenulová veľkosť v layoute), nemá prázdny `src` a má `alt` atribút. Kontroluje aj CSS background obrázky a lazy-loaded obsah (stránka sa preroluje). Screenshoty ukladá do `e2e/screenshots/images_*.png`.

```bash
python3 e2e/profile_images_e2e.py          # dev server na :8080
E2E_BASE_URL=https://mcservery.one E2E_MAX_PROFILES=10 python3 e2e/profile_images_e2e.py
```

- `profile_responsive_visual_e2e.py` — vizuálny/regresný test profilovej stránky na troch breakpointoch (**mobil 375, tablet 768, desktop 1440**): žiadny horizontálny pretok ani prvok mimo viewportu, sticky hlavička 64 px na plnú šírku, hamburger pod 1024 px vs. plná navigácia na desktope, dotykové ciele ≥ 32 px, **červeno-čierny dizajn** (tmavé pozadie hlavičky aj pätičky + akcent v `--primary` hsl(0 72% 51%)), viditeľné odkazy v pätičke a `h1` profilu. Screenshoty hlavičky, pätičky a celej stránky sa porovnávajú s baseline v `e2e/baselines/` (tolerancia 1 % pixelov).

```bash
python3 e2e/profile_responsive_visual_e2e.py
UPDATE_BASELINES=1 python3 e2e/profile_responsive_visual_e2e.py   # po zámernej zmene dizajnu
```

- `sitemap_redirects_e2e.py` — pre URL zo `sitemap.xml` (aj cez sitemap index) sleduje **reťaz presmerovaní bez nasledovania**: každý hop musí byť trvalý (301/308) s hlavičkou `Location`, max 3 hopy, **žiadny cyklus**, finálny status 200 (nikdy 404/410/5xx). Následne otvorí každú URL v prehliadači a overí, že sa nezobrazí 404 obrazovka, stránka má obsah, URL neskončila na nečakanom mieste (`/auth`, `/404`, domov), `canonical` sedí s cestou, stránka nie je `noindex` a nevznikli JS chyby. Testuje aj varianty s koncovým lomkom.

```bash
python3 e2e/sitemap_redirects_e2e.py
E2E_BASE_URL=https://mcservery.one E2E_MAX_URLS=30 python3 e2e/sitemap_redirects_e2e.py
```

- `canonical_indexability_e2e.py` — pre každú indexovateľnú URL (statické verejné route + URL zo sitemapy) overí, že HTML obsahuje **práve jeden** `<link rel="canonical">`, že je to absolútna `https://mcservery.one` URL a že je **self-referencing** (cesta canonicalu = cesta stránky, ignoruje sa koncové `/`). Zároveň kontroluje, že `<meta name="robots">` ani `googlebot` neobsahujú `noindex`/`none`. Neverejné route (`/admin`, `/auth`, `/profile`) musia byť naopak `noindex` alebo presmerované preč a nesmú byť v sitemape.

```bash
python3 e2e/canonical_indexability_e2e.py
E2E_BASE_URL=https://mcservery.one E2E_MAX_URLS=30 python3 e2e/canonical_indexability_e2e.py
```

- `soft_404_e2e.py` — odhaľuje **soft-404**: HTTP 200 sa neberie ako úspech. Reálne URL zo sitemapy musia zodpovedať šablóne plnohodnotnej stránky (`h1`, >200 znakov textu, unikátny `<title>`, žiadny „not found“ marker, bez `noindex`). Neexistujúce URL (`/server/…`, `/staff/…`, `/user/<uuid>`, náhodná cesta) musia zobraziť „not found“ šablónu, mať `noindex`, nepresmerovať sa potichu na domov a nemať obsah bežnej stránky.

```bash
python3 e2e/soft_404_e2e.py
E2E_BASE_URL=https://mcservery.one E2E_MAX_URLS=20 python3 e2e/soft_404_e2e.py
```

- `og_meta_e2e.py` — overuje **social meta tagy** na verejných stránkach: `og:title/description/type/url/site_name/image` a `twitter:card/title/description/image` existujú práve raz, sedia s `<title>` a `meta[name=description]`, `og:url` je self-referencing https na `mcservery.one`, dodržané dĺžky (title ≤ 70, description 50–200). `og:image` aj `twitter:image` musia byť absolútne https URL, vracať **HTTP 200** s `Content-Type: image/*` (žiadne 404) a reálne sa dekódovať v prehliadači.

```bash
python3 e2e/og_meta_e2e.py
E2E_BASE_URL=https://mcservery.one E2E_MAX_URLS=20 python3 e2e/og_meta_e2e.py
```
