#!/usr/bin/env python3
"""RC2 observe workflow screenshots + text probes (Playwright)."""
from __future__ import annotations

import json
import os
import pathlib
import ssl
import urllib.request

OUT = pathlib.Path(os.environ.get("OUT_DIR", "/tmp/opsedge360-s2-rc2-evidence/screenshots"))
WEB = os.environ.get("WEB_BASE", "https://observability360.asoftechinsightz.com")
API = os.environ.get("API_BASE", "https://api.observability360.asoftechinsightz.com/api/v1")
OUT.mkdir(parents=True, exist_ok=True)

VENDOR_RE = __import__("re").compile(
    r"skywalking|grafana|datadog|new\s*relic|elastic(?:search)?\s*apm|openobserve|splunk|prometheus\s*ui",
    __import__("re").I,
)

PAGES = [
    ("observe-overview", "/observability"),
    ("observe-applications", "/observability/applications"),
    ("observe-infrastructure", "/observability/infrastructure"),
    ("observe-kubernetes", "/observability/kubernetes"),
    ("observe-logs", "/observability/logs"),
    ("observe-metrics", "/observability/metrics"),
    ("observe-traces", "/observability/traces"),
    ("observe-topology", "/observability/topology"),
    ("observe-databases", "/observability/databases"),
    ("digital-twin", "/twin"),
    ("executive-home", "/dashboard"),
]


def token() -> str:
    enter = pathlib.Path("/tmp/opsedge360-s2-rc2-evidence/ede-enter.json")
    if enter.exists():
        return json.loads(enter.read_text())["accessToken"]
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(
        f"{API}/demo/ede/enter",
        data=b"{}",
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, context=ctx, timeout=60) as r:
        data = json.loads(r.read())
    OUT.parent.mkdir(parents=True, exist_ok=True)
    (OUT.parent / "ede-enter.json").write_text(json.dumps(data))
    return data["accessToken"]


def main() -> None:
    from playwright.sync_api import sync_playwright

    tok = token()
    fails = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900}, ignore_https_errors=True)
        context.add_cookies(
            [
                {
                    "name": "oe360_token",
                    "value": tok,
                    "domain": "observability360.asoftechinsightz.com",
                    "path": "/",
                    "httpOnly": False,
                    "secure": True,
                    "sameSite": "Lax",
                }
            ]
        )
        page = context.new_page()
        for name, path in PAGES:
            page.goto(WEB + path, wait_until="networkidle", timeout=90000)
            page.wait_for_timeout(1200)
            dest = OUT / f"{name}.png"
            page.screenshot(path=str(dest), full_page=True)
            body = page.inner_text("body")
            (OUT / f"{name}.txt").write_text(body[:4000], encoding="utf-8")
            if VENDOR_RE.search(body):
                fails.append(f"vendor_in_{name}")
                print(f"FAIL vendor_leak {name}")
            else:
                print(f"CAPTURED {name} -> {dest}")
        browser.close()
    summary = OUT / "capture-summary.txt"
    summary.write_text(
        f"pages={len(PAGES)} fails={len(fails)} fails_list={fails}\n",
        encoding="utf-8",
    )
    print("SCREENSHOTS_DONE", summary.read_text().strip())
    if fails:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
