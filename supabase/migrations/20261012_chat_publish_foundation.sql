-- Private, approval-first inbound messaging queue. No automatic publishing.
create table if not exists public.chat_publish_senders (
 id uuid primary key default gen_random_uuid(),
 channel text not null check(channel in ('telegram','whatsapp')),
 sender_id text not null,
 display_name text,
 enabled boolean not null default true,
 created_at timestamptz not null default now(),
 unique(channel,sender_id)
);
create table if not exists public.chat_publish_submissions (
 id uuid primary key default gen_random_uuid(),
 channel text not null check(channel in ('telegram','whatsapp')),
 external_message_id text not null,
 sender_id uuid not null references public.chat_publish_senders(id),
 raw_text text not null default '',
 media_external_ids jsonb not null default '[]'::jsonb,
 status text not null default 'received' check(status in ('received','processing','draft_ready','in_review','approved','rejected','published','failed')),
 received_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 approved_by uuid references auth.users(id),
 approved_at timestamptz,
 published_content_id uuid,
 last_error text,
 unique(channel,external_message_id)
);
alter table public.chat_publish_senders enable row level security;
alter table public.chat_publish_submissions enable row level security;
revoke all on public.chat_publish_senders from anon,authenticated;
revoke all on public.chat_publish_submissions from anon,authenticated;
create index if not exists chat_publish_submissions_status_idx on public.chat_publish_submissions(status,created_at desc);
