"""E2E: GM saves the Replicate balance, sees it on the badge and gets the low-balance banner.
Also checks the Pricing page shows the new generation prices.
Run: python3 e2e/owner-balance-e2e.py
"""
import asyncio, json, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
OUT = Path("/tmp/browser/owner-balance"); OUT.mkdir(parents=True, exist_ok=True)
results = []
def check(name, ok, detail=""):
    results.append(ok); print(("PASS " if ok else "FAIL ") + name + (f" - {detail}" if detail else ""))

async def main():
    m = json.loads(Path(os.path.expanduser("~/.cache/lovable-auth/session.json")).read_text())
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        pg = await (await b.new_context(viewport={"width": 1280, "height": 1800})).new_page()
        await pg.goto(BASE)
        await pg.evaluate("([k,v])=>localStorage.setItem(k,v)", [m["storage_key"], json.dumps(m["session"])])
        await pg.goto(f"{BASE}/history"); await pg.wait_for_timeout(6000)
        await pg.get_by_label("Current Replicate balance in dollars").fill("6,68")
        await pg.get_by_label("Warn me below this many dollars").fill("20")
        await pg.get_by_role("button", name="Save balance").click()
        await pg.wait_for_timeout(4000)
        badge = pg.get_by_test_id("owner-replicate-balance")
        check("balance on GM badge", await badge.count() == 1 and "6,68" in (await badge.inner_text()), await badge.inner_text() if await badge.count() else "")
        banner = pg.get_by_test_id("owner-balance-banner")
        check("low-balance banner shown", await banner.count() == 1)
        await pg.screenshot(path=str(OUT / "history.png"))
        await pg.goto(f"{BASE}/pricing"); await pg.wait_for_timeout(5000)
        prices = await pg.get_by_test_id("generation-prices").inner_text()
        check("pricing shows new prices", all(x in prices for x in ["75", "110", "480", "35", "40"]), prices.replace("\n", " | "))
        await pg.get_by_test_id("generation-prices").screenshot(path=str(OUT / "prices.png"))
        await b.close()
    print(f"{sum(results)}/{len(results)} passed"); sys.exit(0 if all(results) else 1)

asyncio.run(main())
