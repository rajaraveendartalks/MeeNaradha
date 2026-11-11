# PR #33 — Explicit Movie, Celebrity & Gallery Relationships

## Goal
Replace fragile slug/name matching with editor-selected relationships while retaining PR #32's working public profile routes.

## Existing database
- `public.movie_credits` already links `movie_id` and `person_id` with `credit_type`, bilingual character names and `billing_order`. **Reuse this table**; do not create duplicate cast tables.
- `public.movies`, `public.people` and `public.image_galleries` already contain published/draft status and slugs.
- Public profile RLS for movies and people was repaired during PR #32. Preserve the distinction between anonymous published-only reads and authenticated editorial reads.

## Proposed incremental implementation
1. Add `gallery_movies (gallery_id, movie_id)` and `gallery_people (gallery_id, person_id)` join tables, with foreign keys, composite unique constraints, indexes and RLS. Public SELECT must only expose relationships whose gallery **and** linked profile are published. Editorial mutations require authenticated editor/admin authorization.
2. Add a searchable movie selector and celebrity selector in the Gallery CMS. Editors may associate multiple records. Save relationships transactionally or show partial-save errors.
3. Add a searchable cast/crew editor to the Movies CMS using `movie_credits`. Support roles, billing order and bilingual character names.
4. Update public movie profiles to show linked galleries and published cast/crew; update celebrity profiles to show published filmography and explicitly linked galleries. Link cards to existing `/movie/[slug]`, `/celebrity/[slug]`, `/gallery/[slug]` routes.
5. During transition, optionally keep the PR #32 conservative slug fallback for legacy galleries with **no explicit links**; never combine a mismatched fallback with an explicit selection.
6. Preserve current public SEO, bilingual content, gallery viewer, and CMS permissions.

## Acceptance tests
- Victory Venkatesh is assigned as an actor on Aadarsha Kutumbam House No: 47 – AK 47, and the movie appears in his filmography.
- The movie displays Venkatesh in Cast & Crew and links to his celebrity profile.
- The published `Aadarsha-Kutumbam` gallery is explicitly selected for the movie and displays on the movie profile even when its slug differs.
- Gallery-to-movie navigation works.
- A draft movie/person/gallery cannot be revealed to anonymous users through relationship endpoints.
- Existing Chiranjeevi and Venkatesh pages and AK 47 profile continue to work.
- No production migration or merge until preview and RLS checks pass.

## Delivery status
Planning document only. Implementation, migration, tests and Vercel preview verification are pending.
