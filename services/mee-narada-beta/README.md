# Mee Narada public website and Content Studio

This app lives under `services/mee-narada-beta`, with **Root Directory = services/mee-narada-beta** in the `mee-narada-beta` Vercel project. It serves the public Mee Narada website and `/admin` Content Studio. The repository root also contains a separate CMS application.

## Environment variables
- `NEXT_PUBLIC_SUPABASE_URL` — existing Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — existing anon key, or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable key
- `NEXT_PUBLIC_SITE_URL` — beta site URL (optional; used for sharing)
- `NEXT_PUBLIC_GALLERY_BUCKET` — optional, pre-existing storage bucket with appropriate upload policies

**Never configure a service-role key in this beta.** Public pages request only published records. The admin uses Supabase Auth and existing database RLS. Editors must have an appropriate user_roles record and existing insert/update permissions. If these policies do not allow an operation, it fails safely.

## Routes
- `/` — mobile-first published article feed
- `/?section=movies`, `/?section=ott` — filtered news
- `/?section=galleries` — published galleries
- `/article/[slug]`, `/gallery/[slug]` — detail pages
- `/admin` — Content Studio for posts, homepage, media, editorial tools and site management
- `/publish-with-us` — production house, studio and creator registration with an article request
- `/admin/publishing-requests` — private editorial review inbox

## Deployment safety
Use the isolated test Supabase project for branch previews. Keep production public environment variables pointed at the production project. Apply and test additive database migrations and deploy their Edge Functions before releasing dependent UI changes.

## Partner publishing requests

The public form submits registration and article details together; it does not create an Auth account, verify an organisation or grant CMS permissions. Only the on-screen persisted reference confirms receipt. No automatic applicant emails are sent.

Apply `supabase/migrations/20261109054024_partner_publication_requests.sql` and deploy the four files in `supabase/functions/publishing-requests`, using `index.ts` and the explicit `deno.json` import map. This public Edge Function uses `verify_jwt=false` and validates the project API key itself, supporting modern publishable keys. Keep service-role credentials exclusively in the Edge runtime. Preserve the authentication configuration of existing functions.

Requests and contact details live in private tables without client grants. Staff RPCs check the signed-in user's database role. Editors can review and request changes; administrators accept or decline. An accepted request can become one unpublished article draft, attributed to the staff member preparing it. Existing article publication permissions still apply. Review notes are internal; staff contact applicants directly when needed.

The endpoint bounds payloads, validates HTTP(S) links without fetching them, checks consent, uses a honeypot and minimum form time, throttles daily HMAC identities and returns the same receipt on a retried submission. It stores no raw IP address. Registration details are not copied into the public article body.

Validate with `npm run test:publishing`, the existing test suites, `npm run build` and the rolled-back `supabase/tests/publication_requests_rls.sql` in each target database.
