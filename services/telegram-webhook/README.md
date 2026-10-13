# MeeNaradha Telegram Webhook

Standalone webhook service. Does not expose the MeeNaradha CMS.

## Environment variables
- `TELEGRAM_BOT_TOKEN` — Telegram bot API token
- `TELEGRAM_WEBHOOK_SECRET` — same secret used when registering Telegram webhook

## Routes
- `GET /health` — health check
- `POST /api/telegram` — validates Telegram's `X-Telegram-Bot-Api-Secret-Token` header

## Setup
Configure the two secrets on the dedicated Vercel project in Production, deploy, and register
`https://<public-production-domain>/api/telegram` with Telegram `setWebhook`, supplying
`secret_token` equal to `TELEGRAM_WEBHOOK_SECRET`.

Do not turn off deployment protection on the MeeNaradha CMS project.
This initial isolated handler implements /start and inline menu placeholders only; CMS ingestion
is not yet connected. Keep the old webhook URL until this service is ready.
