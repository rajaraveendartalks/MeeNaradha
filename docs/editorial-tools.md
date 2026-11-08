# Editorial tools

The public website keeps its current appearance until an administrator applies a new font choice. Four sections join Content Studio:

| Section | What it does | Access |
| --- | --- | --- |
| Typography | Headline and article font choices, text size, line spacing and Telugu previews | Administrators apply; readers receive the saved settings |
| News Desk | Politics, entertainment, sports, music and influencers; AP/Telangana/Telugu or India focus; source headlines, coverage signals and Create draft | Administrators and editors |
| Calendar | Celebrity directory birthdays, eight sourced important dates, custom birthdays/milestones, yearly recurrence, archive/restore and Create draft | Administrators and editors |
| Reports | Date/category/writer filters, daily activity, article and writer performance, sharing platforms and UTF-8 CSV exports | Administrators see the team; editors see only their own articles |

## Fonts

Six fonts are served locally: Noto Sans Telugu, Noto Serif Telugu, Mandali, Ramabhadra, NTR and Hind Guntur. Files come from the corresponding `ofl/` directories in [Google Fonts](https://github.com/google/fonts); each font's SIL Open Font License is beside its WOFF2 asset. The original system font remains available. No Google Fonts request or new tracking SDK is used. Public pages load the fonts they use; the chooser loads previews. Refresh a public page after applying settings.

## News discovery

The authenticated `/api/studio/news` endpoint fetches fixed Google News RSS searches for the selected topic and region. It has a 15-minute upstream cache and the open desk refreshes every 15 minutes while visible. Results are restricted to the last 48 hours. The desk displays headlines, publisher names, timestamps and source links, without importing article bodies or photographs. The parser rejects DTD/entity declarations, unsafe links, oversized feeds, invalid dates and out-of-window items. Provider failures are shown honestly; Open news search remains available.

Similar headlines are grouped by token overlap. High means at least three different publisher labels with the lead within 12 hours; Watch means at least two within 24 hours. These are transparent editorial coverage signals, not social engagement statistics, independent corroboration or guaranteed virality. Draft creation preserves attribution and the source link, but requires the writer to research and write the article before publication. Production’s existing administrator approval rule is preserved; editors create drafts and administrators publish them. RSS is a best-effort external service and may return sparse results or become unavailable.

## Calendar

Existing People birth dates are read without changing those records. Custom events support an original date, yearly recurrence, type, source link and notes. February 29 birthdays appear on February 29 in leap years. All dates and report boundaries use Asia/Kolkata. Archived custom events can be restored from Archived events.

Initial important-day dates link to the [United Nations observances](https://www.un.org/en/observances/list-days-weeks), their individual UN pages and a [Government of India backgrounder](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2218369&lang=1&reg=6). Milestones and additional birthdays are added by the editorial team. Variable festival dates are not guessed or silently repeated each year.

## Audience and writer reporting

- Counts begin when the analytics migration and collector are released. Historical audience activity is unavailable; no old view/share counts are fabricated.
- A recorded view is a visible article visit deduplicated for the browser/article/India-calendar-day. Repeated share clicks are deduplicated per platform on the same basis. Counts are estimates, not audited unique people.
- Sharing-platform counts include icon clicks, Email, Copy link and More. A composer opening, clipboard copy or native-share cancellation does not establish that a social post was completed.
- The client excludes signed-in browsing, known bot/preview agents, Do Not Track and Global Privacy Control. Requests blocked by readers' software are not recovered through fingerprinting.
- The browser holds a random identifier. The collector transforms it into a daily, article-specific HMAC; raw identifiers, IP addresses, user agents and referrer URLs are not stored in the event table. A daily salted IP hash is used only for bounded per-minute ingest throttling.
- Raw events and rate-limit records live in the unexposed private schema with RLS and no browser grants. Events are retained up to 400 days and rate-limit records up to two days, pruned during ingestion.
- `article-analytics` is a new public-facing Edge Function. Its body authenticates the project API key through the Supabase gateway, validates origins and bounded input, filters bots/privacy headers, then records using its server-only credentials. Gateway `verify_jwt` is disabled for this function because anonymous readers can use modern publishable keys rather than user JWTs; this does not alter any existing function's authentication.
- New signed-in CMS posts receive their writer automatically. Existing stories stay Unassigned unless an administrator assigns an author. Editors cannot reassign attribution. Administrator reports cover the team; the database forces editors' reports to their own author ID, regardless of supplied filters.
- Published-article counts use publication dates within the report period. Views and clicks include activity during that period on older articles too. The top-article list and article CSV are capped at 200 rows; totals cover the full selected scope. CSV exports neutralise formula-prefixed text and preserve Telugu.

## Verification

Run `npm run test:editorial`, `npm run test:studio`, `npm run test:share` and `npm run build` in `services/mee-narada-beta`. Run `supabase/tests/editorial_tools_rls.sql` against the intended database; its role changes, content and analytics fixtures all roll back. The tests cover settings conflicts, calendar restore, attribution protection, anonymous isolation, writer report isolation, event deduplication and rate limits. Live feed checks cover all five topics. A staging Edge Function integration check verifies valid/invalid keys, origin rejection and persistent reload deduplication, then removes its temporary content fixture.

Existing production content, URLs, homepage/menu selections and publication state are preserved. New categories are added without automatically enabling homepage sections or changing navigation.
