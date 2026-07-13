#!/usr/bin/env python3
"""Sprint 2 RC2 performance probes — use perf_counter (not bash %3N)."""
from __future__ import annotations

import json
import ssl
import statistics
import time
import urllib.request

API = "https://api.observability360.asoftechinsightz.com/api/v1"
OUT = "/tmp/opsedge360-s2-rc2-evidence"
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

TARGETS = {
    "observe_overview": ("GET", "/observe/overview", 300),
    "observe_logs": ("GET", "/observe/logs?limit=50", 2000),
    "observe_metrics": ("GET", "/observe/metrics?limit=50", 300),
    "observe_traces": ("GET", "/observe/traces?limit=20", 300),
    "observe_topology": ("GET", "/observe/topology", 300),
    "search": ("GET", "/search?q=observability", 2000),
    "dashboard": ("GET", "/dashboard/executive?role=cio", 2000),
}


def auth_token() -> str:
    with open(f"{OUT}/ede-enter.json", encoding="utf-8") as f:
        return json.load(f)["accessToken"]


def timed(method: str, path: str, token: str, n: int = 7) -> list[float]:
    samples: list[float] = []
    for _ in range(n):
        req = urllib.request.Request(
            API + path,
            headers={"Authorization": f"Bearer {token}"},
            method=method,
        )
        t0 = time.perf_counter()
        with urllib.request.urlopen(req, context=CTX, timeout=30) as r:
            _ = r.read()
            assert 200 <= r.status < 300
        samples.append((time.perf_counter() - t0) * 1000)
    return samples


def main() -> None:
    token = auth_token()
    rows = []
    all_pass = True
    for name, (method, path, target) in TARGETS.items():
        samples = timed(method, path, token)
        p50 = statistics.median(samples)
        avg = statistics.mean(samples)
        ok = p50 <= target
        all_pass = all_pass and ok
        status = "PASS" if ok else "FAIL"
        line = f"{status}: {name} p50={p50:.1f}ms avg={avg:.1f}ms target_p50<{target}ms samples={[round(s,1) for s in samples]}"
        print(line)
        rows.append(line)
    with open(f"{OUT}/perf.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(rows) + "\n")
    if not all_pass:
        raise SystemExit(3)
    print("PERF_ALL_PASS")


if __name__ == "__main__":
    main()
