# Cloudflare Access + OpenClaw hook runbook

Dátum: 7. jún 2026

Účel: zamknúť Jakubov interný dashboard a pripraviť bezpečnú cestu zo staging Workera do lokálneho Docker OpenClaw runtime.

## Stav

- Staging dashboard je zatiaľ verejný iba s demo dátami.
- `/api/dashboard/leads` je pripravené na Supabase CRM read mód, ale `DASHBOARD_DATA_MODE` ostáva `demo`.
- Worker má ochrannú poistku: ak sa `DASHBOARD_DATA_MODE=crm`, endpoint vráti CRM dáta iba pri Cloudflare Access emaili z allowlistu.
- Allowlist vo Worker vars:

```text
yksvadur.ja@gmail.com
olsa@bosen.sk
```

- Wrangler OAuth login funguje pre Workers deploye, ale nestačil na vytvorenie Cloudflare Access app cez REST API. Na Access setup treba Cloudflare dashboard alebo API token s príslušnými Zero Trust/Access právami.

## 1. Cloudflare Access pre dashboard

Cloudflare Zero Trust:

```text
https://one.dash.cloudflare.com/
```

Postup:

1. Zero Trust -> Access -> Applications.
2. Add an application.
3. Self-hosted.
4. Name:

```text
Jakub staging dashboard
```

5. Application domain:

```text
staging.jakubolsa.sk
```

6. Path:

```text
/dashboard/*
```

7. Pridaj druhú Access app alebo druhé pravidlo pre API:

```text
staging.jakubolsa.sk/api/dashboard/*
```

8. Policy:

```text
Action: Allow
Include: Emails
Emails:
- yksvadur.ja@gmail.com
- olsa@bosen.sk
```

9. Identity provider:
   - ideálne Google,
   - fallback Cloudflare One-Time PIN email.

## 2. Test Accessu

Bez loginu má byť:

```bash
curl -I https://staging.jakubolsa.sk/dashboard/leady/
curl -I https://staging.jakubolsa.sk/api/dashboard/leads
```

Očakávanie:

- Cloudflare Access redirect alebo 403/401,
- nie reálne JSON CRM dáta.

Po loginu v browseri:

```text
https://staging.jakubolsa.sk/dashboard/leady/
```

Dashboard sa má otvoriť.

## 3. Prepnúť staging dashboard na CRM

Až po Access teste:

1. Prepnúť staging Worker env:

```text
DASHBOARD_DATA_MODE=crm
```

2. Deploynúť staging.
3. Overiť:

```bash
curl https://staging.jakubolsa.sk/api/dashboard/leads
```

Bez Access loginu nemá vrátiť CRM data.

V browseri po Access loginu má dashboard čítať reálne Supabase leady.

Poznámka: Aktuálne `wrangler.toml` drží bezpečný default `DASHBOARD_DATA_MODE=demo`. Kým nie je Access hotový, neprepínať ho na `crm`.

## 4. OpenClaw hook cez Cloudflare Tunnel

Lokálny OpenClaw Docker hook:

```text
http://127.0.0.1:18789/hooks/agent
```

Worker nesmie používať `localhost`, potrebuje verejnú HTTPS adresu.

Odporúčaný názov tunnelu:

```text
jakub-openclaw-hook
```

Odporúčaný hostname:

```text
openclaw.staging.jakubolsa.sk
```

Minimálny cieľ:

```text
https://openclaw.staging.jakubolsa.sk/hooks/agent
  -> http://127.0.0.1:18789/hooks/agent
```

Wrangler vie tunely listovať a vytvárať:

```bash
npx wrangler tunnel list --config wrangler.toml
npx wrangler tunnel create jakub-openclaw-hook --config wrangler.toml
```

Stabilný named tunnel potrebuje aj route/hostname konfiguráciu v Cloudflare dashboarde alebo cez `cloudflared` config. Ak sa použije iba `wrangler tunnel quick-start`, URL bude dočasná a nie je vhodná ako permanentný Worker secret.

## 5. Worker secrets pre OpenClaw handoff

Po stabilnom HTTPS hooku nastaviť iba na staging Worker:

```bash
npx wrangler secret put OPENCLAW_HOOK_URL --name=jakubastroweb-staging --config wrangler.toml
npx wrangler secret put OPENCLAW_HOOK_TOKEN --name=jakubastroweb-staging --config wrangler.toml
```

Ak je hook za Cloudflare Access service tokenom:

```bash
npx wrangler secret put OPENCLAW_CF_ACCESS_CLIENT_ID --name=jakubastroweb-staging --config wrangler.toml
npx wrangler secret put OPENCLAW_CF_ACCESS_CLIENT_SECRET --name=jakubastroweb-staging --config wrangler.toml
```

Tokeny nikdy nezapisovať do repozitára.

## 6. OpenClaw E2E acceptance

Staging booking má po dokončení spraviť:

1. Google Calendar event.
2. Supabase contact/lead/appointment/note.
3. Telegram notifikáciu.
4. OpenClaw handoff na `/hooks/agent`.
5. OpenClaw vytvorí audit/follow-up alebo aspoň admin case.

Ak OpenClaw hook zlyhá, booking nesmie zlyhať. OpenClaw je post-booking side effect.
