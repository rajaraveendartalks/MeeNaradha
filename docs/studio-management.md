# Users, Categories and Menus

Content Studio adds `/admin/users`, `/admin/categories` and `/admin/menus`.

## Users

Administrators can search accounts, invite an editor/administrator, change a CMS role and remove CMS access while retaining the account and its content. Reviewer remains an existing role for the separate review workflow. The database blocks self-demotion and serializes role changes so an administrator remains available. Existing role assignments are not changed by these migrations. Legacy accounts with multiple role rows resolve to admin, editor, reviewer, then user in that order.

Account emails and names come from an admin-checked function in a private schema. Public RPC wrappers use SECURITY INVOKER; private SECURITY DEFINER functions check the authenticated user's real user_roles rows, use an empty search path and are not executable by anonymous visitors. Mutable user metadata is used only for display and the invitation welcome screen.

The `studio-users` Edge Function verifies a user JWT with Auth and checks the administrator role before calling the server-only invitation API. Its Supabase server key stays in the function's automatic environment. The browser sends only the current user session. Invitees receive a link and set their own password; administrators do not choose passwords for them. If mail succeeds but role assignment fails, the response explicitly tells the admin to assign access to the new account in Users.

Invitation redirects use the approved calling site plus `/admin`; the Auth redirect allowlist must include that address for each environment. A same-origin invitation/recovery redirect also handles a provider landing on the public homepage. No real invitation email was sent during validation, so mail delivery and the email-link round trip remain to be verified with a real recipient.

## Categories

Admins and editors can create, rename, describe and archive article categories. Slugs are immutable; archiving retains posts and links. Existing article category strings are imported as aliases without rewriting article records. The post editor and list use the registry, including legacy aliases. New categories appear as hidden optional homepage sections and as menu-link choices. Homepage sections retain the current 64-section limit.

Public category pages accept canonical slugs and legacy aliases. Gallery categories and video content types remain their existing separate taxonomies.

## Menus

Administrators can edit flat link lists for Main navigation, Category bar and Footer links. Items support a label, category/page/custom destination, visibility, new-tab behavior, removal and reordering. Destinations are restricted to safe relative paths or HTTP(S) URLs. React escapes labels; executable URLs and protocol-relative paths are rejected even when reading stored settings.

Save Draft is private. Preview uses the shared public homepage component. Publish menus updates both versions atomically and rejects stale revisions. The public homepage and article, gallery, movie, celebrity and video pages use the published header/footer. Mobile navigation uses a keyboard-accessible native menu disclosure.

## Deploy and validate

1. Apply `20261108074103_studio_management.sql`, then `20261108075838_studio_user_search_names.sql` to the target database.
2. Deploy `supabase/functions/studio-users/` as `studio-users`, entrypoint `index.ts`, with JWT verification enabled and all three source files included.
3. Configure the feature/studio-management preview to use the isolated test project; production keeps its existing project.
4. Run `npm run test:studio` and `npm run build` in services/mee-narada-beta; build the root CMS separately. The suite covers actual admin screens, role gating, invite-password setup, the invitation handler's authorization/partial-failure paths, URL validation and all earlier article/homepage/media workflows. `check-edge.cjs` also type-checks the Deno entrypoint against the pinned Supabase SDK.
5. Run `supabase/tests/studio_management_rls.sql` in the isolated test project. It verifies privileged account access, protected self-demotion, editor category writes, slug immutability, private menu drafts, atomic publishing, stale saves, denied escalation and anonymous/non-staff restrictions. All changes roll back.
6. Check anonymous REST draft/account isolation, invitation preflight and unauthenticated rejection, and compare security advisors. Production verification uses read-only role/grant checks and content/role fingerprints.

The managed local Next.js preview is unavailable in this workspace because its launcher injects Vite flags. Protected Vercel previews require interactive access. Automated tests cover the actual components; live public pages and admin entry URLs are checked after deployment.

The new tables/functions can remain if the UI is reverted. Earlier code ignores the registry and menu settings. Keep the compatible article renderer from the earlier Content Studio release.
