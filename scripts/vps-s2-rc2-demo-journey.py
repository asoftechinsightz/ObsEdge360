#!/usr/bin/env python3
"""RC2 customer demo journey probe (API)."""
from __future__ import annotations

import json
import time
import urllib.request
import ssl
from pathlib import Path

API = "https://api.observability360.asoftechinsightz.com/api/v1"
OUT = Path("/tmp/opsedge360-s2-rc2-evidence")
OUT.mkdir(parents=True, exist_ok=True)
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def token() -> str:
    return json.loads((OUT / "ede-enter.json").read_text())["accessToken"]


def get(path: str, tok: str):
    req = urllib.request.Request(API + path, headers={"Authorization": f"Bearer {tok}"})
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, context=CTX, timeout=30) as r:
        body = json.loads(r.read())
        return r.status, body, (time.perf_counter() - t0) * 1000


def main() -> None:
    tok = token()
    steps = []
    st, ov, ms = get("/observe/overview", tok)
    steps.append(("overview", st, round(ms, 1), ov.get("brand")))
    st, apps, ms = get("/observe/applications", tok)
    steps.append(("applications", st, round(ms, 1), len(apps.get("items") or [])))
    st, logs, ms = get("/observe/logs?severity=ERROR&limit=20", tok)
    steps.append(("logs_error", st, round(ms, 1), len(logs.get("items") or [])))
    st, tr, ms = get("/observe/traces?limit=10", tok)
    steps.append(("traces", st, round(ms, 1), len(tr.get("items") or [])))
    st, topo, ms = get("/observe/topology", tok)
    steps.append(("topology", st, round(ms, 1), len(topo.get("nodes") or [])))

    req = urllib.request.Request(
        API + "/observe/ai/explain",
        data=json.dumps({"name": "UPI Payments Fabric", "kind": "application"}).encode(),
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
        method="POST",
    )
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, context=CTX, timeout=30) as r:
        ai = json.loads(r.read())
        ms = (time.perf_counter() - t0) * 1000
    steps.append(("ai_explain", r.status, round(ms, 1), len(ai.get("evidence") or [])))

    payload = {"steps": steps, "ai_brand": ai.get("brand"), "twin": ai.get("twinHref")}
    (OUT / "demo-journey.json").write_text(json.dumps(payload, indent=2))
    print(json.dumps(payload, indent=2))
    assert all(200 <= s[1] < 300 for s in steps)
    assert ai.get("brand") == "OpsEdge360" and len(ai.get("evidence") or []) >= 1
    print("DEMO_JOURNEY_PASS")


if __name__ == "__main__":
    main()
