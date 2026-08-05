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
