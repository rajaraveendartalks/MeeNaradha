# Mee Narada Beta (isolated application)

This app lives under `services/mee-narada-beta` and is intended for its own Vercel project with **Root Directory = services/mee-narada-beta**. It does not change the production Mee Narada Next.js app.

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
- `/admin` — sign-in and lightweight Articles/Galleries editor

## Deployment safety
Use a separate Vercel project and configure the three public variables for Preview and Production. Do not merge this branch or deploy to the main Mee Narada project to test the beta. No database migrations or changes to production data are included.
