#!/usr/bin/env python3
import json, time, urllib.request, ssl, urllib.error

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
API = "https://api.observability360.asoftechinsightz.com/api/v1"
WEB = "https://observability360.asoftechinsightz.com"

req = urllib.request.Request(
    API + "/demo/ede/enter",
    data=b"{}",
    headers={"Content-Type": "application/json"},
    method="POST",
)
tok = json.load(urllib.request.urlopen(req, context=ctx)).get("accessToken", "")
auth = {"Authorization": "Bearer " + tok}


def timed(path, n=5):
    samples = []
    code = None
    for _ in range(n):
        t0 = time.perf_counter()
        r = urllib.request.Request(API + path, headers={**auth, "Accept": "application/json"})
        with urllib.request.urlopen(r, context=ctx) as resp:
            resp.read()
            code = resp.status
        samples.append((time.perf_counter() - t0) * 1000)
    samples.sort()
    return code, samples[0], samples[len(samples) // 2], samples[-1], sum(samples) / len(samples)


for path in [
    "/dashboard/executive?role=cio",
    "/search?q=payment",
    "/twin/graph?limit=80",
    "/health",
    "/ready",
]:
    code, mn, med, mx, avg = timed(path)
    print(f"{path} http={code} min_ms={mn:.1f} p50_ms={med:.1f} max_ms={mx:.1f} avg_ms={avg:.1f}")

for path in ["/", "/login"]:
    samples = []
    code = None
    for _ in range(3):
        t0 = time.perf_counter()
        r = urllib.request.Request(WEB + path)
        with urllib.request.urlopen(r, context=ctx) as resp:
            resp.read()
            code = resp.status
        samples.append((time.perf_counter() - t0) * 1000)
    print(f"web{path} http={code} avg_ms={sum(samples)/len(samples):.1f}")

for path, expect in [("/dashboard/executive?role=cio", 401), ("/search?q=x", 401)]:
    try:
        urllib.request.urlopen(urllib.request.Request(API + path), context=ctx)
        print(path, "noauth UNEXPECTED_200")
    except urllib.error.HTTPError as e:
        print(path, "noauth", e.code, "PASS" if e.code == expect else "FAIL")
