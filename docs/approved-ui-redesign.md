# Mee Narada — Approved UI Redesign

Status: **Design direction approved by product owner on 2026-10-20**.

## Source of truth
Five user-provided reference screenshots in the design conversation:
1. Desktop homepage (featured hero, latest news, trending sidebar, photo galleries).
2. Mobile homepage (compact news feed, category filters, sticky bottom navigation).
3. Article page (editorial headline, video hero, highlights, story, related articles, comments).
4. Desktop gallery (hero image, grid, slideshow, share/download actions, editorial sidebar).
5. Mobile gallery (vertical photo feed, fullscreen viewer, compact photo metadata).

## Design rules
- Preserve Mee Narada brand, red accent, clean light surfaces, Telugu-first headlines and bilingual fields.
- Use separate responsive desktop/mobile compositions with accessible semantic markup and legible Telugu fonts.
- Reuse existing public routes, Supabase content, SEO metadata, gallery viewer, CMS permissions and publication rules.
- Avoid hardcoded sample content in production. Respect published-only public access.
- Keep PR #33 (`feature/pr33-profile-relationships`) untouched.
- Prioritize usable article publishing through the existing CMS; any new interactions (comments, reactions, polls, downloads, metrics) must be backed by real implementation or omitted/clearly disabled.

## Implementation phases
1. Shared header/navigation, tokens, homepage desktop and mobile.
2. Article page and article publishing/preview workflow.
3. Desktop and mobile gallery pages and viewer.
4. Responsive QA, Telugu readability, performance, accessibility and regression tests.

## Acceptance criteria
- Screens match the supplied references in layout hierarchy and responsive behavior.
- Existing published stories and galleries render from Supabase.
- Editors can create, preview and publish a Telugu/English article without losing content.
- No regression to celebrity/movie profile pages from merged PR #32.
- Vercel preview reviewed before merge; no production changes until approval.

## Delivery
This commit is the design handoff only. UI code and preview testing are pending.
