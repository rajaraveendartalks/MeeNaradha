# Mee Narada Content Studio

The first release replaces the combined article form/list with Posts, a focused Telugu-first editor and a shared Media Library.

## Routes and workflow

- /admin: search English/Telugu titles, filter by category/status, paginate, select multiple posts, send for review, move to Trash and restore as a draft.
- /admin/posts/new and /admin/posts/{id}: visual text formatting, inline images, YouTube embeds, featured image selection, draft preview, Save Draft, Send for review and Publish/Update.
- /admin/media: browse folders, search the current folder, upload multiple JPG/PNG/WebP/GIF images up to 8 MB each and copy reusable URLs. Uploads use unique paths and never overwrite existing files.
- /admin/galleries: existing gallery management remains available in the shared shell.

Admin/editor access uses the existing Supabase account and user_roles. The browser checks all returned roles, including accounts with more than one role. RLS remains authoritative for every read and write. Signing out clears protected screens; unsaved edits prompt before leaving. Published timestamps and existing URLs survive ordinary edits. Concurrent article saves use updated_at to avoid silently replacing another editor's changes.

The existing archived status is presented as Trash. Restore always returns a post to Draft. Neither Trash nor removing an image from an article deletes the stored image file. There is no permanent-delete action in this release.

## Article compatibility

Existing plain text and restricted editorial markup continue to render. Editing a rich-text body stores an allowlisted document with the MNRICH1: prefix in the existing body column. Only body edits convert that field. The public renderer accepts both formats and renders React elements rather than author-supplied HTML. Links, images, colors and YouTube sources are validated.

Deploy the public renderer with the editor. After rich-text posts have been saved, retain lib/rich-content.ts and the compatible public ArticleContent renderer when reverting other Studio UI changes. Rolling back to an older renderer can display the serialized document as text. No existing article data is migrated by this release.

English content, source attribution and manual URLs are in Advanced options. A Telugu-only title is accepted and supplies the existing required fallback title field. Search metadata uses the saved headline and summary; an unpublished draft preview is local to the editor.

## Storage and preview setup

Apply 20261108063533_studio_media_library.sql to each target database. It retains an existing media bucket, provisions one in an empty test project, grants media listing only to existing editors/admins, and adds the existing staff upload rule only where it is missing. It does not grant anonymous listing or broader user roles.

The feature/wordpress-content-studio branch of Vercel project mee-narada-beta is configured with the separate test project pbusxvpvaackkudgttfd, an enabled publishable key, the media bucket and NEXT_PUBLIC_STUDIO_STAGE=test. Both supported public-key variable names point to that same test project. Production keeps its existing configuration and database. No service-role key is used by this app.

## Validation

Run from services/mee-narada-beta:

    npm ci
    npm run test:studio
    npm run build

The tests/studio.test.cjs suite checks legacy/rich content rendering, unsafe URL/HTML handling, Telugu-only validation, publication dates, stale writes and actual React screen flows for save/preview/publish/media selection/Trash/restore/logout and access denial. The root CMS excludes the separately deployed services from its TypeScript project; run its own npm run build from the repository root when changing shared build configuration.

Run supabase/tests/studio_posts_media_rls.sql in the target project to check staff post lifecycle, media permissions and blocked anonymous access. Its temporary article and storage metadata fixtures are inside a transaction and are rolled back.
