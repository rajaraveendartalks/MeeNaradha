# Creator Studio staging validation

Verified 2026-10-27. Staging uses isolated Supabase project
`pbusxvpvaackkudgttfd`. Production project `sfykcmbgsuzlyksosjny` was not changed.

## Verified

- The deployed staging public key and URL read published test videos successfully.
- Hosted published detail returned HTTP 200 with the expected title and YouTube embed.
- Real Supabase Auth/Data API tests passed for creator, reviewer and administrator
  sign-in; draft/submission; reviewer approval; admin publication; repeat publication;
  anonymous published reads; and denied self-approval, unapproved publication,
  non-admin publication and approved-content edits.
- PostgreSQL regression tests reproduce both original failures before the migration
  and pass after it, including public-only reads and idempotent publication.
- Chromium tests against the compiled application and real isolated database verified
  logged-out guidance, reviewer role display and publishing denial, administrator
  publication status/links, creator submission and reviewer approval through the UI.
- A focused Chromium test verified the final publish implementation: the administrator
  clicks Publish video, confirms, then sees Published and View published page.
- The new video appears for an anonymous visitor at 390px width without horizontal
  overflow. Screenshots were inspected.
- TypeScript and the final Next.js production build passed. The initial clean build
  reported existing CSS autoprefixer warnings; no CSS changes were included.

## Fixes

The manager shows the actual account and role and separates guidance from errors.
After publication, it fetches the confirmed video directly and updates the card;
it no longer repeats the entire auth, role and queue sequence. If that status fetch
fails, it explains that publication succeeded and asks for a status refresh.

Missing sessions receive a sign-in instruction. Video query/configuration failures
raise a generic temporary-unavailable error with a retry control, rather than being
reported as a missing video. A successful query with no matching video still uses 404.

The migration retains `videos_read` as authenticated staff-only and adds a separate
published-only read policy. It preserves SECURITY INVOKER and the admin/approval checks.

## Limits and release gate

Browser tests used a local compiled copy of the proposed code with real test Supabase
requests relayed through a test-only HTTP transport because this workspace's browser
networking was unreliable. Requests were not mocked. External thumbnails/video playback
were blocked during these tests, so playback and Telugu font rendering were not assessed.

Synthetic QA content/accounts only were used. No production users/content were copied.
The test schema covers core content and Creator Studio; full editorial/gallery migration
reconciliation is still outstanding.

The stable staging alias remains on the earlier development checkpoint until a staging
code deployment is selected. Review the final PR preview after its build. PR #36 targets
`feature/news-article-editor-v2`, not main. No merge or production release is authorized
by this validation report. Obtain explicit approval before a production release.
