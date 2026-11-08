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
