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

## Article layout and advertising

- `/admin/article-layout`: manually select and reorder published stories, galleries and trailers. Set defaults or choose a published article for an override. Current-article links and subsequently unpublished selections are omitted on public pages.
- `/admin/ads`: administrator-only banner campaigns, placement controls, Google IDs and direct-banner reports. Campaigns have India-time start/end dates, device/category targeting, priority, enable/pause controls and Media Library image selection.
- `/admin/advertiser-enquiries`: administrator-only enquiry inbox with private contact details, notes, status filters, search and follow-up.
- `/advertise`: public advertising brief and contact form with a persisted reference receipt. Replies, proposals and booking confirmation are handled directly by staff.

Apply `supabase/migrations/20261109070000_article_layout_and_advertising.sql` and deploy `supabase/functions/advertising` with the explicit `deno.json` import map. Its `verify_jwt=false` entrypoint validates the project API key in its handler, supports modern publishable keys and keeps privileged credentials in the Edge runtime. Do not change existing function authentication settings.

Apply the follow-up legacy_manual_trailer_selection migration as well. The manual trailer picker includes published unclassified videos from older imports without changing their metadata. Classified songs and short films are excluded.

The sidebar receives a one-time initial selection from existing published content. Editors manage these stored selections manually thereafter. Direct campaigns start paused; no paid sample campaigns are created. Public campaign records contain banner metadata only, with row policies hiding paused, future and ended campaigns. Enquiries and raw measurement records live in private tables, with role-checked inbox/report RPCs.

Google fallback is off by default. It requires an approved publisher ID, slot IDs, confirmation of the existing certified CMP setup, and a working `__tcfapi` consent API. The app waits for that API before loading Google's script. For GDPR-covered visits it conservatively requires consent for Google and purposes 1, 3 and 4. Staff browsing and browser privacy signals suppress Google requests and first-party ad measurement. The app does not install or certify a CMP; use the approved consent platform's normal deployment procedure.

Direct banner measurements record loaded displays, viewable displays (50% visible for one continuous second) and deduplicated clicks. A per-display random ID is hashed on the server; no persistent visitor identifier or raw IP is stored. Google earnings and network reports are accessed in AdSense. This release retains ad records; automatic deletion and billing are not included.

Validate with `npm run test:advertising`, the existing test suites, `npm run build` and the rolled-back `supabase/tests/article_layout_advertising_rls.sql` in each target database. Browser visual QA availability is reported separately from these checks.
