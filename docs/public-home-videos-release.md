# Public homepage Videos segment

This change adds a Videos section after the existing lead news stories, a Videos navigation link, and dedicated category and watch pages. Existing homepage news, gallery pages, and CMS remain on the current production codebase; Creator Studio's unfinished branch is not merged.

## Release scope

- Homepage: six latest published videos, original thumbnails, Telugu/English headings, links to All / Trailers / Songs / Short Films.
- `/videos`: server-rendered category filtering and pagination (24/page), published rows only.
- `/videos/[slug]`: published-only lookup, encoded slugs, privacy-enhanced YouTube player, original channel link, and real 404/error states.
- Existing five production videos remain unchanged. Their `content_type` is currently null, so they appear under All as “Video”; they will not be guessed into a category.
- No transfer of staging's fourteen supplied links or QA records in this release.

## Database prerequisite — production approval required

Production has five published video rows, but `videos_read` invokes `private.current_app_role()` for anonymous visitors. An anonymous SELECT currently fails with permission denied. Apply only `20261028054549_public_home_videos_read.sql` when this release is approved. It preserves authenticated access and all write rules, and limits anonymous reads to published rows. Do not run every pending repository migration.

A rollback-only regression on isolated staging reproduces the combined production read policy, applies this focused change, and confirms anonymous and nonstaff readers can see published fixtures but cannot see a draft. No fixture data persists.

## Release order

1. Obtain approval for this PR and its single policy migration.
2. Apply that migration to production project `sfykcmbgsuzlyksosjny`.
3. Verify an anonymous published-only read succeeds and drafts remain private.
4. Merge this focused PR to main and verify the www.meenarada.com homepage, `/videos`, a real detail page, and `/gallery`.
5. If application validation fails, revert this PR. The published-only read fix can remain; it does not enable writes.

Production data, domain aliases, environment variables, and deployment settings have not been changed while preparing this release.

## Validation completed

- Next.js production build passed (two existing CSS compatibility warnings).
- Browser checks used the compiled app and actual isolated staging public Data API: homepage six cards, All 18, Songs 3, category navigation/browser back, a watch page with valid YouTube embed URL, missing video HTTP 404, and no horizontal overflow at 390px.
- Production anonymous SQL SELECT reproduced the staff-helper permission failure. No production policy was changed.
- The rollback-only policy regression passed on staging, including draft exclusion for anonymous and nonstaff readers.
- Existing `/gallery` route renders on this production base, but staging reports `image_galleries.category` missing because its gallery schema differs from production. Gallery source is unchanged in this PR; production's current gallery was separately verified reachable with five galleries.
- Automated layout screenshots blocked external thumbnails and YouTube frames; playback and external image loading still need a hosted preview check. Test machine lacks Telugu system fonts; no font changes are included in this focused release.
