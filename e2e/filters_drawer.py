"""Pomocník: na mobile sú filtre v drawer-i, na desktope priamo v paneli."""


async def open_filters_if_needed(page, timeout: int = 5000) -> bool:
    """Ak je viditeľný spúšťač mobilného drawera, otvorí ho. Vráti True ak otvoril."""
    trigger = page.locator("[data-filter-drawer-trigger]")
    try:
        if await trigger.count() == 0 or not await trigger.first.is_visible():
            return False
        if await page.locator("[data-filter-drawer]").count() > 0:
            return False
        await trigger.first.click()
        await page.wait_for_selector("[data-filter-drawer]", timeout=timeout)
        await page.wait_for_timeout(350)
        return True
    except Exception:
        return False


async def apply_filters_if_drawer(page) -> bool:
    """Ak je drawer otvorený, potvrdí filtre tlačidlom Použiť."""
    apply_btn = page.locator("[data-filter-apply]")
    try:
        if await apply_btn.count() == 0 or not await apply_btn.first.is_visible():
            return False
        await apply_btn.first.click()
        await page.wait_for_timeout(500)
        return True
    except Exception:
        return False
