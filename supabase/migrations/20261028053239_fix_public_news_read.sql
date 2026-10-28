-- Keep staff role checks out of anonymous homepage and article queries.
-- Authenticated access remains identical; anonymous readers see published rows only.
alter policy news_articles_read on public.news_articles to authenticated;
create policy news_articles_public_read on public.news_articles
for select to anon
using (status = 'published'::public.content_status);
