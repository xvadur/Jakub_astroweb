# Jakub health monitoring

Lightweight GET-only checks for Adam's future global dashboard.

## Run

```bash
node ops/monitoring/jakub-health-check.mjs
```

Default targets:

- `https://staging.jakubolsa.sk/api/health`
- `https://jakubolsa.sk/api/health`
- `https://openclaw.jakubolsa.sk/healthz`

The script prints JSON records shaped for dashboard ingestion:

```json
[
  {
    "service": "jakub-web-staging",
    "url": "https://staging.jakubolsa.sk/api/health",
    "ok": true,
    "status": 200,
    "latency_ms": 123,
    "checked_at": "2026-06-17T16:30:00.000Z"
  }
]
```

It exits with:

- `0` when all services are healthy,
- `1` when at least one check fails,
- `2` when the checker config is invalid.

## Optional local OpenClaw check

```bash
JAKUB_HEALTH_INCLUDE_LOCAL_OPENCLAW=1 node ops/monitoring/jakub-health-check.mjs
```

This adds `http://127.0.0.1:18789/healthz`.

## Optional Supabase admin cases check

This is read-only, but it needs Supabase credentials in the shell environment. Do not put these values into the repo or command history with real keys.

```bash
JAKUB_HEALTH_INCLUDE_SUPABASE_ADMIN_CASES=1 \
JAKUB_SUPABASE_URL="https://PROJECT.supabase.co" \
JAKUB_SUPABASE_SERVICE_ROLE_KEY="..." \
node ops/monitoring/jakub-health-check.mjs
```

The check reads open `admin_cases` for tenant `jakub-olsa` and returns `ok: false` when open cases exist. Override tenant slug with `JAKUB_SUPABASE_TENANT_SLUG`.

## Custom targets

Use `JAKUB_HEALTH_TARGETS` with a JSON array. Do not put tokens or secret query strings into these URLs.

```bash
JAKUB_HEALTH_TARGETS='[
  {"service":"jakub-web-staging","url":"https://staging.jakubolsa.sk/api/health"},
  {"service":"openclaw-public","url":"https://openclaw.jakubolsa.sk/healthz"}
]' node ops/monitoring/jakub-health-check.mjs
```

Default checks only make public GET requests. Optional Supabase monitoring performs read-only REST queries and never calls booking, hooks, Telegram, or mutation endpoints.
