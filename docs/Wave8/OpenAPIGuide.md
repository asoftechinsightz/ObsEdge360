# Wave 8 — OpenAPI Guide

## Live documentation

- Swagger UI: `/api/docs`
- OpenAPI JSON: `/api/docs-json` and `/api/v1/openapi.json`
- Version: `1.0.0-rc1`

## Freeze for packages

```bash
bash scripts/export-openapi-rc.sh docs/Wave8/openapi.rc1.json
```

Included automatically in `scripts/package-rc.sh` when the API is reachable.

## Coverage

NestJS generates the document from controllers (`@ApiTags`, `@ApiOperation`). Wave 8 tags include `release-candidate`, `enterprise-certification`, and `deployment-security`.
