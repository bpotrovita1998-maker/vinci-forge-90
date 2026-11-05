"""End-to-end test: pricing page, plan purchase in Stripe test mode, billing page, credit pack.

Run: python3 e2e/pricing_checkout_e2e.py  (needs a minted session at ~/.cache/lovable-auth/session.json
or LOVABLE_BROWSER_SUPABASE_* env vars, and the app on http://localhost:8080).
"""
import asyncio
import json
import os
import re
from pathlib import Path

from playwright.async_api import async_playwright, expect

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
SHOTS = Path("/tmp/browser/pricing-e2e")
SHOTS.mkdir(parents=True, exist_ok=True)
BUY_PLAN = os.environ.get("E2E_BUY_PLAN", "1") == "1"
BUY_PACK = os.environ.get("E2E_BUY_PACK", "1") == "1"


def load_session():
    if os.environ.get("LOVABLE_BROWSER_AUTH_STATUS") == "injected":
        return os.environ["LOVABLE_BROWSER_SUPABASE_STORAGE_KEY"], os.environ["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"]
    with open(os.path.expanduser("~/.cache/lovable-auth/session.json")) as f:
        minted = json.load(f)
    return minted["storage_key"], json.dumps(minted["session"])


async def pay_with_test_card(page):
    """Fills Stripe Checkout with the 4242 test card and submits."""
    await page.wait_for_url(re.compile(r"checkout\.stripe\.com"), timeout=30000)
    await page.locator("#cardNumber").wait_for(timeout=30000)
    await page.fill("#cardNumber", "4242 4242 4242 4242")
    await page.fill("#cardExpiry", "12 / 34")
    await page.fill("#cardCvc", "123")
    if await page.locator("#billingName").count():
        await page.fill("#billingName", "E2E Tester")
    if await page.locator("#billingPostalCode").count() and await page.locator("#billingPostalCode").is_visible():
        await page.fill("#billingPostalCode", "010101")
    await page.screenshot(path=str(SHOTS / "checkout_filled.png"))
    await page.locator("button[type=submit], .SubmitButton").first.click()
    await page.wait_for_url(re.compile(r"localhost:8080/pricing"), timeout=90000)


async def credits(page) -> int:
    text = await page.get_by_test_id("credit-balance").inner_text()
    return int(re.sub(r"\D", "", text) or "0")


async def main():
    storage_key, session_json = load_session()
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await (await browser.new_context(viewport={"width": 1280, "height": 1800})).new_page()
        await page.goto(BASE)
        await page.evaluate("([k, v]) => window.localStorage.setItem(k, v)", [storage_key, session_json])

        # 1. Pricing page shows the real plans, packs and prices; no PRO offer
        await page.goto(f"{BASE}/pricing")
        await expect(page.get_by_test_id("plan-creator")).to_contain_text("24,99")
        await expect(page.get_by_test_id("plan-studio")).to_contain_text("69,99")
        await expect(page.get_by_test_id("plan-business")).to_contain_text("199,00")
        await expect(page.get_by_test_id("plan-creator")).to_contain_text("50 GB")
        await expect(page.get_by_test_id("pack-50")).to_contain_text("5.300 credits")
        await expect(page.get_by_test_id("generation-prices")).to_contain_text("165 credits")
        assert await page.get_by_text("VinciAI PRO").count() == 0, "old PRO offer still shown"
        await page.screenshot(path=str(SHOTS / "1_pricing.png"))
        print("PASS pricing page content")

        # 2. Buy Creator in test mode
        before = await credits(page)
        current = await page.get_by_test_id("current-plan-name").inner_text()
        if BUY_PLAN and current == "Free":
            await page.get_by_role("button", name="Choose Creator").click()
            await pay_with_test_card(page)
            await expect(page.get_by_test_id("current-plan-name")).to_have_text("Creator", timeout=60000)
            await page.wait_for_timeout(3000)
            after = await credits(page)
            assert after - before == 1500, f"expected +1500 credits, got {after - before}"
            await page.screenshot(path=str(SHOTS / "2_after_plan.png"))
            print("PASS bought Creator: plan detected, +1.500 credits")
        else:
            print(f"SKIP plan purchase (current plan: {current})")

        # 3. Manage subscription opens the Stripe billing page
        await page.goto(f"{BASE}/pricing")
        await page.get_by_role("button", name="Manage subscription").click()
        await page.wait_for_url(re.compile(r"billing\.stripe\.com"), timeout=30000)
        await page.screenshot(path=str(SHOTS / "3_portal.png"))
        print("PASS billing page opened")

        # 4. Buy a €10 credit pack
        if BUY_PACK:
            await page.goto(f"{BASE}/pricing")
            await page.wait_for_timeout(2000)
            before = await credits(page)
            await page.get_by_test_id("pack-10").get_by_role("button", name="Buy credits").click()
            await pay_with_test_card(page)
            await page.wait_for_timeout(6000)
            after = await credits(page)
            assert after - before == 1000, f"expected +1000 credits, got {after - before}"
            await page.screenshot(path=str(SHOTS / "4_after_pack.png"))
            print("PASS bought €10 pack: +1.000 credits")

        await browser.close()


asyncio.run(main())
