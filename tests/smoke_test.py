"""End-to-end smoke test for The Hot Take.

Serves the repository with the same security headers as netlify.toml, opens the
page in headless Chromium and checks the main flow. Exits non-zero on failure.

Setup:
    pip install -r tests/requirements.txt
    playwright install chromium
Run from the repository root:
    python3 tests/smoke_test.py

Optional: set CHROMIUM_PATH to use a specific Chromium executable.
"""
import http.server
import os
import re
import socketserver
import sys
import tempfile
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

HEADER_NAMES = (
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "X-Frame-Options",
)

failures = []


def check(ok, label):
    print(("PASS  " if ok else "FAIL  ") + label)
    if not ok:
        failures.append(label)


def load_headers():
    with open(os.path.join(ROOT, "netlify.toml"), encoding="utf-8") as f:
        toml = f.read()
    found = dict(re.findall(r'^\s*([A-Za-z-]+) = "(.*)"$', toml, re.M))
    missing = [h for h in HEADER_NAMES if h not in found]
    if missing:
        print("FAIL  netlify.toml is missing headers: " + ", ".join(missing))
        sys.exit(1)
    return {h: found[h] for h in HEADER_NAMES}


HEADERS = load_headers()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        for name, value in HEADERS.items():
            self.send_header(name, value)
        super().end_headers()

    def log_message(self, *args):
        pass


def main():
    server = socketserver.TCPServer(("127.0.0.1", 0), Handler)
    origin = "http://127.0.0.1:%d" % server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()

    requests_seen = []
    console_problems = []
    vtt = (
        "WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\n"
        "I am not sure what this site is about.\n\n2\n00:00:05.000 --> 00:00:08.000\n"
        "I cannot find the price anywhere, is it expensive?\n"
    )

    with tempfile.TemporaryDirectory() as tmp, sync_playwright() as p:
        vtt_path = os.path.join(tmp, "sample.vtt")
        with open(vtt_path, "w", encoding="utf-8") as f:
            f.write(vtt)

        launch_args = {"args": ["--no-sandbox"]}
        if os.environ.get("CHROMIUM_PATH"):
            launch_args["executable_path"] = os.environ["CHROMIUM_PATH"]
        browser = p.chromium.launch(**launch_args)
        context = browser.new_context(accept_downloads=True, viewport={"width": 420, "height": 900})
        page = context.new_page()
        page.on("request", lambda r: requests_seen.append(r.url))
        page.on("console", lambda m: console_problems.append(m.text) if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: console_problems.append(str(e)))

        page.goto(origin + "/index.html", wait_until="load")
        page.wait_for_timeout(600)

        check(page.title() == "The Hot Take", "page title is The Hot Take")
        check(page.inner_text("#elapsed") == "5:00", "clock starts at 5:00")

        fonts = page.evaluate(
            "Promise.all([...document.fonts].map(f => f.load().then(() => f.status).catch(() => 'error')))"
        )
        check(len(fonts) >= 8 and all(s == "loaded" for s in fonts), "all self-hosted fonts load")

        page.click("#primary")
        page.wait_for_timeout(1300)
        check(page.inner_text("#elapsed") in ("4:59", "4:58"), "clock counts down after Start")
        check(page.inner_text("#status").strip().upper() == "RUNNING", "status shows RUNNING")

        page.click("#next")
        page.wait_for_timeout(200)
        for _ in range(6):
            page.click("#next2")
            page.wait_for_timeout(100)
        check(page.is_visible("#recap-open"), "Top-3 button appears after the last check")

        page.click("#recap-open")
        check(page.is_visible("#top3"), "Top-3 summary opens")

        page.fill("#site-name", "Example.com")
        page.fill("#f1-issue", "Price is hard to find")
        page.fill("#f1-impact", "A visitor cannot judge cost")
        page.fill("#f1-rec", "Show a price range")
        page.locator('input[name="f1-sev"][value="5"]').evaluate("e => e.click()")

        page.locator("#q-include").evaluate("e => { if (!e.checked) e.click(); }")
        page.set_input_files("#q-file", vtt_path)
        page.wait_for_timeout(300)
        page.click("#q-find")
        page.wait_for_timeout(300)
        check(page.locator("#q-list .q-item").count() >= 1, "quote finder returns a match from a .vtt file")

        with page.expect_download(timeout=5000) as dl:
            page.click("#export")
        download = dl.value
        with open(download.path(), encoding="utf-8") as f:
            report = f.read()
        check(download.suggested_filename.startswith("hot-take-review-") and download.suggested_filename.endswith(".md"),
              "report downloads as hot-take-review-DATE.md")
        check("Example.com" in report and "Price is hard to find" in report, "report contains the site name and finding")
        check("Critical" in report, "report shows the severity label")
        check("Expert review, not user data" in report, "report states it is an early expert impression")

        page.reload(wait_until="load")
        check(page.input_value("#site-name") == "Example.com", "draft survives a reload")

        browser.close()

    external = [u for u in requests_seen if not u.startswith(origin) and not u.startswith("data:")]
    check(not external, "page makes no requests to other sites" + (": " + ", ".join(external) if external else ""))
    check(not console_problems, "no console errors or warnings" + (": " + " | ".join(console_problems) if console_problems else ""))

    server.shutdown()
    if failures:
        print("\n%d check(s) failed." % len(failures))
        sys.exit(1)
    print("\nAll checks passed.")


if __name__ == "__main__":
    main()
