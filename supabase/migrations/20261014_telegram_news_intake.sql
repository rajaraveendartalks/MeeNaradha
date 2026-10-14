-- Mee Narada Telegram private editorial intake (no public access).
create table if not exists public.telegram_news_intake (
  id uuid primary key default gen_random_uuid(),
  telegram_update_id bigint not null unique,
  telegram_user_id bigint not null,
  telegram_chat_id bigint not null,
  source_message_id bigint not null,
  raw_text text not null check (char_length(raw_text) between 1 and 10000),
  source_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(source_urls) = 'array'),
  status text not null default 'draft' check (status in ('draft','in_review','rejected','transferred')),
  cms_article_id uuid references public.news_articles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists telegram_news_intake_user_created_idx
  on public.telegram_news_intake(telegram_user_id,created_at desc);
alter table public.telegram_news_intake enable row level security;
revoke all on public.telegram_news_intake from anon, authenticated;
-- No client RLS policies. Service-role backend only; editorial CMS integration follows separately.
