# Marketing Website — Deployment Guide

**App:** `apps/marketing`  
**Public host:** `https://www.asoftechinsightz.com`  
**Port (container):** `3010`

## Prerequisites

- Node 20+  
- Docker (optional)  
- DNS A/AAAA for `www.asoftechinsightz.com` (and apex redirect if required)

## Local

```bash
cd apps/marketing
npm install
npm run build
npm start
```

## Docker

From monorepo root:

```bash
docker build -t asoftech-marketing:2.0 -f apps/marketing/Dockerfile .
docker run --rm -p 3010:3010 -e NEXT_PUBLIC_GTM_ID=GTM-XXXX asoftech-marketing:2.0
```

> Note: The Dockerfile copies only `apps/marketing`. If workspace linking is required later, switch to a monorepo-context build.

## Nginx sketch

```nginx
server {
  listen 443 ssl http2;
  server_name www.asoftechinsightz.com asoftechinsightz.com;
  # ssl_certificate … (suite cert)

  location / {
    proxy_pass http://127.0.0.1:3010;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## Analytics

Set `NEXT_PUBLIC_GTM_ID` at build or runtime (client-readable). Lead forms also emit `dataLayer` events (`demo_request`) and a `azi-lead` CustomEvent.

## Health

`GET /` should return HTTP 200. There is no authenticated API dependency for the marketing site.

## Rollback

Redeploy previous image tag; DNS unchanged. No database.
