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
