# MeeNarada Chat-to-Publish — Foundation
This branch adds **secure inbound webhook ingestion only**. It does not publish content, invoke AI, download attachments, or send replies. Those capabilities require further implementation and testing.

## Secrets (Vercel server-side environment variables)
- `NEXT_PUBLIC_SUPABASE_URL` (existing)
- `SUPABASE_SERVICE_ROLE_KEY` (server only; never expose to browser)
- `TELEGRAM_WEBHOOK_SECRET` (random secret; Telegram webhook secret_token)
- `WHATSAPP_VERIFY_TOKEN` (random verification token)
- `META_APP_SECRET` (Meta app secret for X-Hub-Signature-256)

## Webhook URLs
- `https://<your-deployment>/api/chat-publish/telegram`
- `https://<your-deployment>/api/chat-publish/whatsapp`

## Onboarding
Only senders pre-registered in `chat_publish_senders` with `enabled=true` are accepted. Unknown senders are ignored. Inbound events are idempotently stored in `chat_publish_submissions`. WhatsApp delivery/status callbacks are ignored. Keep endpoints publicly reachable for provider callbacks, but verify signatures/secrets.

## Planned follow-on
Media download into private Supabase Storage; grouping Telegram albums and WhatsApp media; AI-assisted drafting; editor review UI with immutable audit trail; publishing to existing `news_articles` and `image_galleries` only after editor approval; sender notifications, retries and monitoring.

## Security
Do not commit provider secrets. Do not add any public RLS read policy for the queue. Service-role use is limited to verified webhooks. This branch intentionally cannot publish anything.
