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


## Image uploads and automatic profile links

Article Media Library uploads, Gallery Manager bulk uploads, and legacy CMS single/gallery uploaders share `lib/image-processing.ts`. New uploads default to WebP at quality 0.9 with aspect ratios preserved, no enlargement and a maximum 2,560-pixel longest side. A smaller original is retained when re-encoding would increase its size. Source files may be up to 40 MB / 40 megapixels; the uploaded object remains within 8 MB. JPEG, PNG, WebP and GIF are accepted. Transparency is retained. GIF and animated PNG/WebP retain their original frames and require No watermark.

Choose Original file for exact byte preservation. High quality compression is visually conservative, not mathematically lossless. No second original copy is uploaded automatically. Existing stored images and pasted remote image URLs are not modified.

Before uploading, choose no watermark, the existing Mee Narada logo, or MeeNarada.com text; choose a corner and opacity. The first image preview shows the result and before/after sizes. Settings apply to the batch. Watermarks are rendered into the uploaded pixels. Each bulk result is reported separately; retries include failed images only. Unique upload paths and upsert:false preserve existing image URLs.

`/admin/profiles` manages Movies, People / Cast & Crew, and Studios / Production Houses. Primary Telugu/English names and up to 30 editorial aliases identify a published profile. Legacy CMS modules expose the same aliases. Public destinations are `/movie/[slug]`, `/celebrity/[slug]`, and `/studio/[slug]`; profiles include related published coverage. Profile edits use timestamp checks to prevent overwriting another editor's changes. No biographies, cast relationships or missing profiles are invented or published automatically.

Articles render one automatic link per matching profile (maximum 12), using literal Unicode-aware word boundaries, longest-name preference and ambiguity checks. Existing authored links, headings and code are preserved. Stored article text is never rewritten. Writers can preview matches and disable automatic links per article with Names & profile links. New or changed profiles apply when articles load again. Missing or unpublished profiles remain ordinary text until an editor publishes them.

Apply migrations `20261109104429_article_entity_links.sql`, `20261109105015_public_studio_profiles.sql` and `20261109105347_public_profile_reads.sql` before deploying the application. The latter two separate anonymous published-profile reads from staff-only role helpers, including older staging policies. Both read RPCs use SECURITY INVOKER and existing table RLS. Run the rolled-back `supabase/tests/article_entity_links_rls.sql` in each target project.

Validate with `npm run test:media-profiles`, the complete test suite and both Next builds. The native Canvas dev dependency is pinned for reproducible pixel tests and is not imported into the website bundle. Browser visual QA availability is recorded separately.

## Article reactions

Published articles show Like, Touched, Angry, LOL, Kiss and Throw an egg below the article, with public counts, a percentage breakdown and small contained animations. Reduced-motion preferences disable animations. One browser can have one active choice per article; changing or removing it moves the existing count. Tapping the selected reaction replays its animation without submitting a vote. A browser identifier is created only after an explicit choice. Clearing browser storage or changing browsers creates another identity; these are browser choices, not verified unique people.

`/admin/reactions` contains India-time date, category and writer filters, daily participation, emotion totals, article reports and CSV export. Administrators see all writers; editors see only their own articles. Range counts use each browser/article's last action inside the dates, with removal contributing zero. Daily counts use the last action on each India calendar day. Current all-time choices are shown separately. Reactions per 100 tracked views measure participation and may exceed 100 because view tracking has privacy exclusions. Reaction sentiment is not a writer-quality score. Reports retain history when a reaction is disabled. The article list and CSV show up to 200 matching articles.

Administrators can pause reactions, disable Kiss, or choose the categories offering Kiss. Movies, Celebrities and OTT are selected initially. Settings use revision checks to prevent overwriting another administrator's edit.

Apply `supabase/migrations/20261110043345_article_reactions.sql` and deploy the three files in `supabase/functions/article-reactions` with `index.ts` and the explicit `deno.json` import map before releasing the UI. Set `verify_jwt=false` for this function because its handler authenticates the project API key itself; keep every other function's authentication configuration unchanged. No service credentials belong in the website. Individual choices, HMAC browser/IP identities, signing configuration, rate limits and history stay in private tables without client access. Raw IPs are not saved. Service-only invoker RPCs perform atomic counter changes; a private role-checked report function supplies staff aggregates through an invoker wrapper.

Writes use operation IDs and per-browser/article versions so retries are idempotent and stale tabs cannot overwrite newer votes. The card offers retry/status recovery after a lost response. Limits are 30 changes per minute / 200 per India day per browser and 120 per minute / 2,000 per day per IP identity. Counters reset in place; no scheduled deletion is installed. As with any anonymous endpoint, rate limits reduce repeated voting but do not prove a human identity.

Validate with `npm run test:reactions`, the complete test suite, `npm run build`, the rolled-back `supabase/tests/article_reactions_rls.sql` in each target project and isolated staging HTTP/concurrency checks. Never seed public production votes for testing.
