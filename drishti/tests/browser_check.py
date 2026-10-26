"""Headless browser check at phone (360 px) and desktop (1280 px) widths.

Usage (after `npm run build`):
    python3 tests/browser_check.py

It serves dist/ locally, opens the site in headless Chromium, fails on any
console error or page error, and saves screenshots to docs/images/.
Map tiles and web fonts are replaced with blank stand-ins so the test
does not depend on outside servers.
"""
import base64
import functools
import http.server
import socketserver
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
SHOTS = ROOT / "docs" / "images"
BASE = "/aushadhi-drishti/"
BLANK_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAACAUlEQVR42u3TQQ0AAAjEsNOFBBTgXwlvNNCkCpYs1QNvRQIMAAYAA4ABwABgADAAGAAMAAYAA4ABwABgADAAGAAMAAYAA4ABwABgADAAGAAMAAYAA4ABwABgADAAGAAMAAYAA4ABwABgADAAGAAMAAYAA4ABwABgADAAGAAMAAYAA2AAFTAAGAAMAAYAA4ABwABgADAAGAAMAAYAA4ABwABgADAAGAAMAAYAA4ABwABgADAAGAAMAAYAA4ABwABgADAAGAAMAAYAA4ABwABgADAAGAAMAAYAA4ABwABgADAAGAAMgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAHAAGAADKACBgADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAEwABgADAAGAAOAAcAAYAAwABgADAAGAAOAAcAAYAAwABgADAAGAAOAAcAAYAAwABgADAAGAAOAAcAAYAAwABgADAAGAAOAAcAAYAAwABgADAAGAAOAAcAAYAC4FpPeDOUAnkcZAAAAAElFTkSuQmCC"
)

# Extra steps per page, set by later phases: list of (name, function(page)).
EXTRA_STEPS = []


class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = path.split("?", 1)[0]
        if path.startswith(BASE):
            path = "/" + path[len(BASE):]
        return str(DIST) + path

    def log_message(self, *args):
        pass


def serve():
    httpd = socketserver.TCPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def stub_outside(route):
    url = route.request.url
    if "tile.openstreetmap.org" in url:
        return route.fulfill(status=200, content_type="image/png", body=BLANK_PNG)
    if "fonts.googleapis.com" in url or "fonts.gstatic.com" in url:
        return route.fulfill(status=200, content_type="text/css", body="")
    return route.continue_()


def check(width, height, name, port, browser):
    errors = []
    page = browser.new_page(viewport={"width": width, "height": height})
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.route("**/*", stub_outside)
    page.goto(f"http://127.0.0.1:{port}{BASE}", wait_until="networkidle")
    page.wait_for_function("window.__ad && window.__ad.viewer && window.__ad.viewer.scene", timeout=20000)
    page.wait_for_timeout(2500)
    # No sideways scrolling on the page itself.
    overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    if overflow > 0:
        errors.append(f"page scrolls sideways by {overflow}px")
    page.screenshot(path=str(SHOTS / f"{name}.png"))
    for step_name, step in EXTRA_STEPS:
        try:
            step(page, name)
        except Exception as exc:  # report and keep going
            errors.append(f"{step_name}: {exc}")
    page.close()
    return errors


def main():
    if not (DIST / "index.html").exists():
        sys.exit("dist/ not found. Run `npm run build` first.")
    SHOTS.mkdir(parents=True, exist_ok=True)
    httpd = serve()
    port = httpd.server_address[1]
    failed = False
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
        for width, height, name in [(360, 740, "phone-360"), (1280, 800, "desktop-1280")]:
            errors = check(width, height, name, port, browser)
            status = "OK" if not errors else "FAIL"
            print(f"{name}: {status}")
            for e in errors:
                print(f"  - {e}")
            failed = failed or bool(errors)
        browser.close()
    httpd.shutdown()
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
