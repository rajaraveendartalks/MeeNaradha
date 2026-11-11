-- Atomic, idempotent transfer from private Telegram intake to unpublished News CMS.
-- Apply in Supabase SQL Editor before testing the transfer button.
create or replace function public.transfer_telegram_news_to_cms(p_intake_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  intake public.telegram_news_intake%rowtype;
  article_id uuid;
  headline text;
begin
  select * into intake from public.telegram_news_intake where id=p_intake_id for update;
  if not found then raise exception 'Telegram submission not found'; end if;
  if intake.status='transferred' and intake.cms_article_id is not null then
    return intake.cms_article_id;
  end if;
  if intake.status <> 'in_review' then
    raise exception 'Only submissions in review can be transferred';
  end if;
  headline := left(regexp_replace(split_part(trim(intake.raw_text), E'\n', 1), E'[\r\n]+', ' ', 'g'), 180);
  if headline = '' then raise exception 'News text is empty'; end if;
  insert into public.news_articles
    (slug, headline_en, headline_te, body_te, source_name, source_url, status, updated_at)
  values
    ('telegram-' || replace(intake.id::text, '-', ''),
     'Telegram submission – editorial translation required',
     headline,
     intake.raw_text,
     'Telegram editorial intake',
     case when jsonb_array_length(intake.source_urls)>0
       then intake.source_urls->>0 else null end,
     'draft', now())
  returning id into article_id;
  update public.telegram_news_intake
    set cms_article_id=article_id,status='transferred',updated_at=now()
    where id=intake.id;
  return article_id;
end;
$$;
revoke all on function public.transfer_telegram_news_to_cms(uuid) from public, anon, authenticated;
grant execute on function public.transfer_telegram_news_to_cms(uuid) to service_role;
