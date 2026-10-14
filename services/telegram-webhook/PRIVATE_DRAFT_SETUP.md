# Telegram private news intake — Phase 2B

This feature is intentionally **not** auto-publishing or writing to `news_articles`. It stores raw editor submissions in a locked-down intake queue.

## Before merging / deploying

1. Review and apply `supabase/migrations/20261014_telegram_news_intake.sql` to Mee Narada's existing Supabase project using the migration workflow.
2. Add these environment variables **only to the Telegram webhook Vercel project** (Production):
   - `SUPABASE_URL` — existing Mee Narada Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` — server-only credential; never put in frontend or screenshots.
   - `TELEGRAM_ALLOWED_USER_IDS` — comma-separated numeric Telegram user IDs of authorized editors. Do not use usernames or chat IDs.
3. Deploy, then send a reply to the bot's **Create News** prompt from an allowlisted editor account.
4. Verify a single `telegram_news_intake` row is created, `status=draft`, with no public publication. Repeat the exact Telegram update to check idempotency only in controlled testing.
5. Test a non-allowlisted user: they must not be able to create a draft.

## Safety constraints

- Telegram webhook secret remains mandatory.
- The private intake table has RLS enabled and no anon/authenticated grants or policies.
- Service role is used only on the webhook server; it bypasses RLS and must remain secret.
- Dedupe uses unique `telegram_update_id`.
- No AI rewrite, CMS transfer, editorial approval, or publication in this PR.
- The `/health` route only verifies process availability; it does not prove database connectivity.
- Do not merge until migration, environment variables, and editor IDs are prepared.
