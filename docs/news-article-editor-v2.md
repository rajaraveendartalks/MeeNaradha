# Mee Narada — News Article Editor V2

Approved interactive UI prototype: bilingual WordPress-style editor with left writing canvas and right publishing sidebar.

## Confirmed existing database
public.news_articles fields: id, slug, headline_en, headline_te, dek_en, dek_te, body_en, body_te, hero_image_url, category, source_name, source_url, status, is_breaking, published_at, created_at, updated_at.

## Implementation plan
1. Locate existing News Articles CMS route and preserve authentication, role checks, and database write patterns.
2. Build a client-side bilingual editor: headlines, summaries, rich text, formatting toolbar, category, author/source, tags, image selection, SEO, draft/review/publish actions.
3. Preview in desktop and mobile layouts using current draft values. Ensure preview never publishes.
4. Reuse existing image storage or implement an authenticated storage upload path with file type/size validation.
5. Persist fields supported by current schema; only add new columns for SEO, tags and scheduling after reviewing policies and migrations.
6. Preserve published-only public RLS and authorized editorial mutations; sanitize article HTML before public rendering.
7. Verify new article, edit existing, save draft, preview, publish and reload. Check mobile and Telugu typography.
8. Vercel preview review before merging.

## Guardrails
- Never use client-side service-role credentials.
- Never show a successful save/publish state before the database confirms.
- No production schema changes without migration review.
- Keep PR #33 paused.
- The approved UI prototype is a design reference, not a backend implementation.

## Progress
- [x] PR #34 merged and used as base.
- [x] New feature branch created.
- [x] Existing article table columns inspected.
- [ ] Existing CMS route located and audited.
- [ ] Editor implemented.
- [ ] Storage and publishing tested.
- [ ] Preview approved.
