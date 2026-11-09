-- Keep public studio reads independent of the staff-only role helper.
-- The existing authenticated staff/published predicate remains unchanged.
alter policy companies_read on public.companies to authenticated;
create policy companies_public_published_read on public.companies for select to anon using (status='published'::public.content_status);
