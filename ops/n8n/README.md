# n8n automation for Jakub leads

Goal:

1. Website form sends a lead to n8n.
2. n8n stores the lead in a CRM target.
3. n8n sends a Telegram notification.
4. Optional: n8n sends Gmail confirmation or internal email.

## Mac mini status

The Mac mini has enough disk space for this. Docker runtime is available through user-local Docker CLI + Colima:

```text
Docker CLI: 29.5.2
Docker Compose: v5.1.4
Colima: v0.10.2
Lima: 2.1.2
Runtime: Colima with macOS Virtualization.Framework
```

## Run

```bash
cd ops/n8n
cp .env.example .env
openssl rand -hex 32
docker compose up -d
```

n8n UI:

```text
http://127.0.0.1:5678
```

CRM UI through NocoDB:

```text
http://127.0.0.1:8080
```

The Docker stack creates a Postgres database called `jakub_crm` with a `leads` table.
In NocoDB, connect to the local Postgres database and use the `leads` table as the first CRM view.

Local webhook for the Astro site:

```text
http://127.0.0.1:5678/webhook/jakub-lead
```

Add this to the website `.env` while testing locally:

```bash
PUBLIC_LEAD_ENDPOINT=http://127.0.0.1:5678/webhook/jakub-lead
```

Then restart Astro dev server, because `PUBLIC_LEAD_ENDPOINT` is read at dev/build time.

## Public launch

If the website is public, local `127.0.0.1` will not work for visitors. n8n needs a public HTTPS URL:

- Cloudflare Tunnel to the Mac mini
- ngrok for testing
- reverse proxy + domain + port forwarding
- n8n Cloud

When a public URL exists, set both places:

```bash
# Website .env
PUBLIC_LEAD_ENDPOINT=https://n8n.your-domain.sk/webhook/jakub-lead

# ops/n8n/.env
N8N_HOST=n8n.your-domain.sk
N8N_PROTOCOL=https
N8N_EDITOR_BASE_URL=https://n8n.your-domain.sk/
WEBHOOK_URL=https://n8n.your-domain.sk/
N8N_SECURE_COOKIE=true
```

## CRM path

This Docker stack includes a simple CRM base:

```text
Postgres database: jakub_crm
Table: leads
UI: NocoDB on http://127.0.0.1:8080
```

In n8n, add a Postgres credential:

```text
Host: postgres
Port: 5432
Database: jakub_crm
User: n8n
Password: value from POSTGRES_PASSWORD
```

Then add a Postgres node after `Normalize Lead` and insert into `leads`.

Other CRM targets can be swapped in later:

- Google Sheets: easiest CRM-lite table
- Airtable: nicer CRM-lite database
- HighLevel / HubSpot / Pipedrive: real CRM if Jakub already uses one

Recommended first flow:

```text
Webhook -> Normalize lead -> CRM create row/contact -> WhatsApp notification -> Respond to website
```

## Gmail node locally

Gmail node can work locally, but OAuth must match the n8n URL exactly.

For local testing, use:

```text
http://127.0.0.1:5678/rest/oauth2-credential/callback
```

For production, use the public HTTPS n8n URL:

```text
https://n8n.your-domain.sk/rest/oauth2-credential/callback
```

The public HTTPS route is cleaner because it also solves the website webhook.

## Telegram notifications

Telegram is the simplest production notification channel:

```text
Website form -> n8n Webhook -> Telegram Bot API sendMessage -> Respond 200
```

Setup:

1. Create a bot with `@BotFather`.
2. Copy the bot token into `TELEGRAM_BOT_TOKEN`.
3. Send a message to the bot from the target Telegram account or add the bot to a group.
4. Get the chat ID.
5. Put the chat ID into `TELEGRAM_CHAT_ID`.

Quick chat ID check:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates"
```

For a single client, use one chat/group. For multiple clients, route by `source` or by a hidden `clientId` field and map it to the correct Telegram chat ID inside n8n.

## WhatsApp note

There are two WhatsApp modes:

- quick fallback already in the website: opens WhatsApp with a prefilled message and the visitor taps send
- automatic n8n notification: requires WhatsApp Business Cloud API or another provider such as Twilio/360dialog

For WhatsApp Cloud API, store these in `ops/n8n/.env`:

```bash
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
JAKUB_WHATSAPP_TO=421944844489
```

If Cloud API blocks free-form outbound messages, create an approved utility template for internal lead alerts.
