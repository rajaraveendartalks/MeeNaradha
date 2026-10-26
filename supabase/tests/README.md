# Creator video regression checks

Run with Node.js and `@electric-sql/pglite@0.5.11` available to require():

```sh
NODE_PATH=/path/to/test-dependencies/node_modules node supabase/tests/creator-video-regression.cjs
```

The test creates an in-memory PostgreSQL database with synthetic users and content.
It never connects to Supabase. The fixture reproduces the relevant live role,
SELECT/UPDATE policies and the pre-fix publishing function. It is deliberately
not a complete Supabase schema, Auth service or browser integration test.

Checks:
- Reproduce anonymous read permission failure before migration.
- Reproduce administrator publishing failure from SELECT FOR UPDATE before migration.
- Anonymous reads return published rows only after migration.
- Anonymous, reviewer and creator publication is denied.
- An administrator cannot publish an unapproved submission.
- Administrator publication succeeds and repeat publication returns the same ID.
- Approved submission edits remain blocked for administrator and creator.

## Deployment gate

As verified on 2026-10-26, both meenarada.com/admin and the Creator Studio staging
site embed the endpoint sfykcmbgsuzlyksosjny.supabase.co. Do not apply this migration
to that shared database under staging-only authorization.

Supabase rejected branch creation because branching requires Pro or above.
No database schema, data, roles or policies were changed remotely.

Before release:
1. Provision an isolated test project or development branch.
2. Reconcile and restore the full current schema: repository migrations alone do
   not yet include all live Creator Studio foundation changes.
3. Apply the migration there and seed synthetic users/submissions.
4. Point a dedicated Vercel preview at that isolated database.
5. Test creator submission, reviewer approval, admin publishing, duplicate clicks,
   logged-out listing and detail pages, and denied operations in a browser.
6. Review deployment and database changes together before any production release.

Removing the submission lock relies on the existing immutable approved-state
policies and trigger. Any future approval-revocation workflow must revisit that
assumption and concurrency tests. The unique creator_submission_id constraint
continues to enforce one linked video per submission.
