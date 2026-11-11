# Homepage management

Content Studio now includes `/admin/homepage` for existing administrators and editors.

Editors can pin a lead story and up to four ordered trending stories, or use the automatic latest-story selection. Only published stories are eligible. If a pinned story becomes unpublished, the homepage fills the slot with a recent published story. Pins can include older stories outside the main latest-news query.

The sections list controls the order, visibility, title and item count for Videos, Movies, OTT, Celebrities, Box Office, Technology, Politics and Photo Galleries. News and video sections offer Lead + Headlines, Compact Rows and Lead + Cards. Hiding a homepage section leaves its category/library page available. The heading, caption and updates ticker are editable text fields.

Save Draft retains private settings. Preview shows current published content using the same component as the public homepage and includes unsaved layout edits. Publish homepage atomically updates the draft and public versions after checking both revision numbers. Reload latest version prevents overwriting another editor's work. Current live layout and Original automatic layout replace the editor form only; editors can preview before publishing either one.

## Data and permissions

Apply `20261108071034_homepage_management.sql` before releasing the UI. It creates two settings rows initialized to the current automatic layout. It does not edit articles, media, galleries or videos.

Anonymous visitors and signed-in users without editorial roles can read only the published settings. Existing admins/editors can read both settings rows and update them. The save function uses SECURITY INVOKER, checks the existing user_roles and respects RLS. Draft and public revision checks plus row locks protect concurrent saves. No secret/service-role key is used.

The public page reads published settings on each request; publishing needs no deployment. Missing or unreadable settings use the original automatic layout. Text renders through React, and layout/section keys are allowlisted. Video/gallery sections allow up to 12 items; news sections allow up to 24. The existing news query remains limited to 180 recent published stories, with a separate published-only lookup for older featured pins.

## Validation and release

From `services/mee-narada-beta`, run `npm run test:studio` and `npm run build`. The eight tests include real React screens, the shared public renderer, normalization, published-only selection and stale-save errors, plus the existing article/media regression checks.

Run `supabase/tests/homepage_settings_rls.sql` in each target database. It verifies draft isolation, private draft saves, atomic publishing, stale-update rejection and blocked writes by anonymous visitors/non-editors. All test changes are rolled back. Also verify anonymous REST access returns only the published row and compare security advisors with the pre-migration baseline.

The feature/homepage-management preview branch uses the isolated test database. Production keeps its existing database and account permissions. The settings migration can remain in place if the UI is reverted; the earlier public homepage ignores this new table.

## Additional news presets

Homepage Management now offers Feature + Compact Rows alongside the existing news layouts. It shows a lead image and summary, two supporting headlines, and compact rows below. Quick Reads can be selected for a category or enabled as its own all-news section; these cards occupy the desktop sidebar and follow the main sections on mobile. Readers navigate with Previous/Next, arrow keys or a horizontal swipe. There is no automatic rotation, and a swipe does not accidentally open a story. View All for all-news Quick Reads opens `/?section=all-news`.

The separate Reviews section uses Review Showcase: one featured review with supporting cards. Its source is published records in the existing Reviews module, with working `/reviews` and `/review/[slug]` destinations. The stored rating remains out of 10; the displayed five-star value is exactly half that score. Null ratings have no stars; zero is a real zero. Images come only from published related movie records, including published OTT-to-movie links. Unpublished parent metadata is never used as a cover. A missing public cover uses a branded placeholder.

News and review sections support Latest published or Choose and order stories manually. In manual mode, the first selected item is the lead. Editors can reorder, make any item the lead, remove items, and adjust the visible item count. No automatic stories are added to a curated list. Unpublished, missing or wrong-category selections are omitted. Pins outside the 180-item latest-news query are loaded separately with published-only reads; review pins are likewise independent of the 60-item review pool. Video and gallery presets retain their existing controls. Reviews and the additional all-news Quick Reads section start disabled; previously saved homepage arrangements retain their published selections and ordering until an editor publishes changes.

Preview homepage uses the same public renderer inside an isolated frame, with actual 1,180px desktop and 390px mobile viewport widths. It includes unsaved layout edits, loads only published content, suppresses ads and disables navigation while allowing the Quick Reads controls. The initial mount also handles frames that loaded before React hydrated. The non-production `/design/news-layouts` page contains clearly labelled design samples; these are never inserted into article or review tables and the page remains unavailable in production.

Apply `20261111142231_homepage_news_presets.sql` and `20261111143940_homepage_gallery_public_reads.sql` before releasing the app. They separate anonymous published-only review, OTT and gallery reads from existing authenticated staff policies, preserving draft isolation and existing editing permissions. Homepage settings continue to use their existing JSON storage, revision checks and atomic draft/publish function. No account, article, rating, image or live homepage configuration is seeded or published by these migrations.

Run `npm run test:home-presets`, the complete regression suite, both Next builds and `supabase/tests/homepage_news_presets_rls.sql` in each target database. The SQL checks are fully rolled back. Check anonymous REST loading and the live review routes after deployment. The dev command translates the managed preview launcher's host flags to Next's supported hostname flags; production build/start commands are unchanged.
