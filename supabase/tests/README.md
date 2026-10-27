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

## Staging and release gate

As verified on 2026-10-27, Creator Studio staging uses the isolated test project
`pbusxvpvaackkudgttfd`. Its deployed URL and public key successfully read published
videos, and a published video detail returns HTTP 200 with the YouTube embed.
The production project remains `sfykcmbgsuzlyksosjny` and has not received this fix.

Live Auth/Data API tests passed using synthetic users: creator draft/submission,
reviewer approval, admin publishing, repeat publication, anonymous reads and denied
operations. No production user accounts or content were copied.

The local PostgreSQL regression is still useful to reproduce the original failures
without a remote service. Test dependencies are separate from the application.

Before production release:
1. Finish review of PR #36 and its parent development branch.
2. Reconcile missing historical migrations before attempting a fresh full CMS rebuild;
   the isolated test project currently covers the core schema and Creator Studio.
3. Validate the hosted PR preview after Vercel builds the final commit.
4. Obtain explicit production release authorization, then apply the reviewed migration
   and deploy the reviewed code in a controlled release.

Removing the submission lock relies on the existing immutable approved-state
policies and trigger. Any future approval-revocation workflow must revisit that
assumption and concurrency tests. The unique creator_submission_id constraint
continues to enforce one linked video per submission.
