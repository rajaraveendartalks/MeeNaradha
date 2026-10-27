# Creator Studio isolated staging validation

Verified 2026-10-27.

- Staging browser assets reference the separate test project pbusxvpvaackkudgttfd.supabase.co.
- Real Supabase Auth and Data API tests with the test project's verified publishable key passed: creator/reviewer/admin sign-in, creator draft and submission, reviewer approval, admin publication, idempotent repeat publishing, anonymous published-video reads, denied self-approval, denied unapproved publishing, denied non-admin publishing and blocked approved edits.
- Staging's deployed public key returns HTTP 401 Invalid API key against the test project, with or without an Authorization header. This configuration mismatch blocks the website; its detail page incorrectly masks the query failure as HTTP 404.
- Correct the public key in mee-narada-creator-staging only and redeploy before website validation.
- Synthetic QA FAUZI publishing test rows were used. Production content and accounts were not copied or changed.
- Current stable staging deployment is 4ecac54, without PR #36's manager UI change.
- No production release or production database write performed.

The SQL migration now matches the isolated database: alter the existing videos_read policy to authenticated staff-only, then add a separate published-only read policy. It retains SECURITY INVOKER and administrator approval checks.
