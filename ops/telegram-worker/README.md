# Telegram lead endpoint without n8n

This is the simplest production path for lead notifications:

```text
Website form -> Cloudflare Worker -> Telegram Bot API -> Telegram chat/group
```

Why not call Telegram directly from the website?

The Telegram Bot API token would have to be inside browser JavaScript or the form action URL.
That makes it public. Anyone could copy it and send messages as the bot.

The Worker keeps the token secret.

## Deploy

```bash
cd ops/telegram-worker
cp wrangler.toml.example wrangler.toml
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
wrangler deploy
```

Then set the website `.env`:

```bash
PUBLIC_LEAD_ENDPOINT=https://your-worker.your-subdomain.workers.dev
```

Restart the Astro dev server or rebuild the site.

## Multiple clients

For multiple websites, each form sends a `source` value. The Worker can route by source with
`CLIENTS_JSON`:

```bash
wrangler secret put CLIENTS_JSON
```

Example value:

```json
{
  "jakub-olsa-web": {
    "chatId": "123456789",
    "label": "Jakub Olša"
  },
  "dss-demo-web": {
    "chatId": "-1001234567890",
    "label": "DSS demo"
  }
}
```

If `CLIENTS_JSON` is not set, the Worker uses `TELEGRAM_CHAT_ID`.

## Getting Telegram IDs

1. Create a bot through `@BotFather`.
2. Send a message to the bot or add it to a Telegram group.
3. Open:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates"
```

Use the returned `chat.id`.
