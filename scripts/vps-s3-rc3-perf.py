#!/usr/bin/env python3
"""Sprint 3 RC3 performance probes — perf_counter only."""
from __future__ import annotations

import json
import ssl
import statistics
import time
import urllib.request

API = "https://api.observability360.asoftechinsightz.com/api/v1"
OUT = "/tmp/opsedge360-s3-rc3-evidence"
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

# Targets from Sprint 3 master instruction
TARGETS = {
    "twin_enterprise_graph": ("GET", "/twin/graph?view=enterprise&limit=180", 2000),
    "twin_business_services": ("GET", "/twin/business-services", 2000),
    "twin_executive_risk": ("GET", "/twin/executive-risk", 2000),
    "dashboard_executive": ("GET", "/dashboard/executive?role=cio", 2000),
}


def auth_token() -> str:
    with open(f"{OUT}/ede-enter.json", encoding="utf-8") as f:
        return json.load(f)["accessToken"]


def selected_service_id() -> str | None:
    try:
        with open(f"{OUT}/selected-service.json", encoding="utf-8") as f:
            return json.load(f).get("id")
    except Exception:
        return None


def timed(method: str, path: str, token: str, n: int = 7, body: dict | None = None) -> list[float]:
    samples: list[float] = []
    data = None if body is None else json.dumps(body).encode()
    for _ in range(n):
        req = urllib.request.Request(
            API + path,
            data=data,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            method=method,
        )
        t0 = time.perf_counter()
        with urllib.request.urlopen(req, context=CTX, timeout=45) as r:
            _ = r.read()
            assert 200 <= r.status < 300
        samples.append((time.perf_counter() - t0) * 1000)
    return samples


def main() -> None:
    token = auth_token()
    sid = selected_service_id()
    targets = dict(TARGETS)
    if sid:
        targets["twin_service_detail"] = ("GET", f"/twin/business-services/{sid}", 2000)
        targets["twin_blast_radius"] = ("GET", f"/twin/business-services/{sid}/blast-radius?depth=3&direction=downstream", 500)
        targets["twin_service_graph"] = ("GET", f"/twin/graph?view=enterprise&serviceId={sid}&limit=180", 2000)
        targets["twin_ai_explain"] = ("POST", "/twin/ai/explain", 2000)

    rows = []
    all_pass = True
    for name, spec in targets.items():
        method, path, target = spec
        body = None
        if method == "POST" and "ai/explain" in path and sid:
            body = {"serviceId": sid, "prompt": "What is the blast radius?"}
        samples = timed(method, path, token, body=body)
        p50 = statistics.median(samples)
        avg = statistics.mean(samples)
        ok = p50 <= target
        all_pass = all_pass and ok
        status = "PASS" if ok else "FAIL"
        line = f"{status}: {name} p50={p50:.1f}ms avg={avg:.1f}ms target_p50<{target}ms samples={[round(s, 1) for s in samples]}"
        print(line)
        rows.append(line)

    with open(f"{OUT}/perf.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(rows) + "\n")
    if not all_pass:
        raise SystemExit(3)
    print("PERF_ALL_PASS")


if __name__ == "__main__":
    main()
