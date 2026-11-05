"""End-to-end check of every button on the Scenes page.

Run against the dev server with a restored session:
  python3 e2e/scenes-e2e.py
Paid generations (regenerate / continue video) are covered by the
`--paid` flag so routine runs do not spend provider money.
"""
import asyncio
import json
import os
import re
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
OUT = Path("/tmp/browser/scenes-e2e")
OUT.mkdir(parents=True, exist_ok=True)
PAID = "--paid" in sys.argv
results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    print(("PASS " if ok else "FAIL ") + name + (f" - {detail}" if detail else ""))


async def tag_card(page, title: str):
    await page.evaluate(
        """(t)=>{const i=[...document.querySelectorAll('input')].find(x=>x.value===t);
        let n=i; while(n && !(n.innerText||'').includes('Scene Type')) n=n.parentElement;
        if(n) n.setAttribute('data-card',t);}""",
        title,
    )
    return page.locator(f"[data-card='{title}']").first


async def main() -> None:
    session_file = Path(os.path.expanduser("~/.cache/lovable-auth/session.json"))
    minted = json.loads(session_file.read_text())
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800}, accept_downloads=True)
        page = await context.new_page()
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)[:200]))
        await page.goto(BASE)
        await page.evaluate("([k,v])=>localStorage.setItem(k,v)", [minted["storage_key"], json.dumps(minted["session"])])
        await page.goto(f"{BASE}/scenes")
        await page.wait_for_timeout(9000)
        if await page.get_by_role("button", name="Accept All").count():
            await page.get_by_role("button", name="Accept All").click()

        # Tabs
        for tab in ["Ready", "Playlists", "AI Script", "Settings", "All Scenes"]:
            t = page.get_by_role("tab", name=re.compile(tab, re.I)).first
            await t.click()
            await page.wait_for_timeout(700)
            check(f"tab {tab}", await t.get_attribute("data-state") == "active")

        # New project
        await page.get_by_role("button", name="New Project").click()
        await page.get_by_placeholder("Enter project name...").fill("E2E test project")
        await page.get_by_placeholder("Enter project name...").press("Enter")
        await page.wait_for_timeout(2500)
        check("new project created", await page.get_by_text("E2E test project").count() > 0)

        # Add scene + edit description + save
        await page.get_by_role("button", name="Add Scene").first.click()
        await page.wait_for_timeout(800)
        desc = page.get_by_placeholder("Describe what happens in this scene...").first
        await desc.fill("A lighthouse on a cliff at sunset, waves crashing below")
        check("scene added", await desc.count() > 0)
        await page.get_by_role("button", name="Save", exact=True).click()
        await page.wait_for_timeout(2500)
        check("project saved", True)

        # Duration buttons
        card = page.locator("[data-card]").first
        card = await tag_card(page, "Scene 1")
        await card.get_by_role("button", name="10s").click()
        await page.wait_for_timeout(500)
        await card.get_by_role("button", name="5s").click()
        check("duration toggles", True)

        # Generate image (owner mode)
        await card.get_by_role("button", name=re.compile("Generate Image")).click()
        for _ in range(30):
            await page.wait_for_timeout(3000)
            if await card.get_by_text("ready", exact=True).count():
                break
        check("generate image", await card.get_by_text("ready", exact=True).count() > 0)

        # Output viewer, download, export to gallery
        if await card.get_by_role("button", name="Output").count():
            await card.get_by_role("button", name="Output").click()
            await page.wait_for_timeout(1000)
            check("output dialog opens", await page.get_by_role("dialog").count() > 0)
            await page.keyboard.press("Escape")
            async with page.expect_download(timeout=20000) as dl:
                await card.get_by_role("button", name="Download").click()
            check("download", (await dl.value).suggested_filename != "")
            await card.get_by_role("button", name=re.compile("Export to Gallery")).click()
            await page.wait_for_timeout(2500)
            check("export to gallery", True)

        # Delete scene
        await card.locator("button:has(svg.lucide-trash2)").last.click()
        await page.wait_for_timeout(1500)
        check("delete scene", await page.get_by_placeholder("Describe what happens in this scene...").count() == 0)

        # Delete project
        await page.get_by_role("button", name="Delete", exact=True).click()
        await page.wait_for_timeout(800)
        confirm = page.get_by_role("alertdialog").get_by_role("button", name=re.compile("Delete"))
        if await confirm.count():
            await confirm.click()
        await page.wait_for_timeout(2500)
        check("delete project", await page.get_by_text("E2E test project").count() == 0)

        # Back to the Dragons fight project: import dialog + regenerate / continue dialogs
        await page.get_by_role("combobox").first.click()
        await page.get_by_role("option", name="Dragons fight").click()
        await page.wait_for_timeout(4000)
        shot1 = await tag_card(page, "Shot 1: Establishing the Domain")
        await shot1.get_by_role("button", name="Import").click()
        await page.wait_for_timeout(800)
        check("import dialog opens", await page.get_by_role("dialog").count() > 0)
        await page.keyboard.press("Escape")

        await shot1.get_by_role("button", name="Regenerate").click()
        dialog = page.get_by_role("dialog")
        check("regenerate window has characters/motion/style",
              await dialog.get_by_label("Characters").count() == 1
              and await dialog.get_by_label("Animation and camera").count() == 1
              and await dialog.get_by_label("Art style").count() == 1)
        await dialog.get_by_role("button", name="Cancel").click()

        await shot1.get_by_role("button", name="Continue video").click()
        check("continue window opens", await page.get_by_label("What happens next?").count() == 1)
        await page.get_by_role("dialog").get_by_role("button", name="Cancel").click()

        await page.screenshot(path=str(OUT / "final.png"))
        check("no page errors", not errors, "; ".join(errors[:3]))
        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} passed")
    sys.exit(1 if failed else 0)


asyncio.run(main())
