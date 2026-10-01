# MeeNaradha V1 Database

Supabase project: `sfykcmbgsuzlyksosjny`

Applied migration history:
1. `20261001123923_v1_core_content_architecture.sql` — bilingual core content model (27 tables).
2. `20261001124009_v1_add_fk_indexes.sql` — foreign-key query indexes.
3. `20261001124219_v1_auth_rbac_rls.sql` — V1 RBAC/RLS using user/editor/admin roles.

## Access model
- Anonymous and normal authenticated readers: published content only.
- Editors: read all editorial content and create/update it.
- Admins: editor permissions plus protected deletes.
- `movie_pulse` is an aggregate table; V1 does not add user reaction/session tables.
- Role assignment is held in `public.user_roles` and linked to `auth.users`.
- RLS remains the database enforcement boundary; CMS UI checks are defense-in-depth.

Do not edit an already-applied migration. Add a new migration for future changes.
