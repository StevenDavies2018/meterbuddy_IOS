# MeterBuddy Architecture

## Recommended Platform Split

- `Expo mobile app`: capture meter photos, confirm AI readings, trigger reminders
- `Supabase`: system of record for app data, auth, and image storage
- `Vercel + Next.js`: web app for viewing readings and comparing to online bills
- `OpenAI API`: server-side AI meter reading extraction

## Why This Split

- Mobile is best for camera capture.
- Web is best for bill review because many users open utility bills online.
- Supabase is the cleanest place to keep structured data plus uploaded images.
- Vercel is the cleanest place to host the Next.js web app and server-side API routes.
- OpenAI should be called from the server layer, not directly from the phone app.

## Recommended Web Starter

Use the Vercel `Supabase Starter` for the web app if you want auth and database wiring fast.

Reason:

- It is a current Vercel template for Next.js App Router with Supabase auth already integrated.
- It is better than a plain Next.js starter if you know Supabase is part of the final stack.

If you want the absolute leanest start and do not want auth yet, plain Next.js is fine.

Recommendation:

- `Web app`: start from Vercel Supabase Starter
- `Mobile app`: keep the current Expo app and wire it to Supabase separately

## Supabase Schema

This schema matches the simplified MVP:

- `readings`
- `results`
- `reminders`
- `profiles`
- `entitlements`

Optional later:

- `bills`

### readings

Purpose:

- stores each confirmed reading event
- stores the original image reference
- stores the AI suggestion and the human-confirmed value

Suggested columns:

```sql
create table public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meter_type text not null check (meter_type in ('gas', 'hydro', 'water')),
  image_path text not null,
  captured_at timestamptz not null default now(),
  ai_reading_value text not null,
  ai_confidence numeric(5,4) not null check (ai_confidence >= 0 and ai_confidence <= 1),
  confirmed_value text not null,
  units text not null,
  created_at timestamptz not null default now()
);
```

### results

Purpose:

- stores the comparison between the current and previous reading
- avoids recalculating every time for common views

Suggested columns:

```sql
create table public.results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meter_type text not null check (meter_type in ('gas', 'hydro', 'water')),
  current_reading_id uuid not null references public.readings(id) on delete cascade,
  previous_reading_id uuid references public.readings(id) on delete set null,
  usage_value numeric,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
```

### reminders

Purpose:

- stores the next due date for each meter type

Suggested columns:

```sql
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meter_type text not null check (meter_type in ('gas', 'hydro', 'water')),
  next_due_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, meter_type)
);
```

## Optional Future Table

### bills

If the web app becomes the main bill comparison surface, this is the next table I would add:

```sql
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meter_type text not null check (meter_type in ('gas', 'hydro', 'water')),
  billing_period_start date,
  billing_period_end date,
  billed_usage numeric,
  billed_units text,
  bill_total numeric,
  notes text,
  created_at timestamptz not null default now()
);
```

## Storage Buckets

Create one Supabase Storage bucket:

- `meter-images`

Suggested object path convention:

```text
{user_id}/{meter_type}/{reading_id}.jpg
```

This keeps storage simple and easy to secure.

## RLS Approach

Enable Row Level Security on every exposed table.

Policy concept:

- users can only `select`, `insert`, `update`, and `delete` rows where `user_id = auth.uid()`

Example pattern:

```sql
alter table public.readings enable row level security;
alter table public.results enable row level security;
alter table public.reminders enable row level security;
```

Then add user-owned policies per table.

## Account And Purchase Tables

### profiles

Purpose:

- durable app-level identity metadata
- onboarding state
- shared user record for mobile and web

Suggested columns:

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### entitlements

Purpose:

- stores the user's premium or trial status
- ties app-store purchases to the Supabase account
- allows access checks from both mobile and web

Suggested columns:

```sql
create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_key text not null,
  status text not null check (status in ('trial', 'active', 'revoked', 'expired')),
  source text not null check (source in ('app_store', 'play_store', 'web', 'admin')),
  product_id text,
  original_transaction_id text,
  purchase_date timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entitlement_key)
);
```

Recommended default entitlement row:

- `entitlement_key = 'lifetime_unlock'`
- `status = 'trial'`

## Auth Plan: Email Magic Link

Because the user needs:

- web access
- cross-device access
- purchase restoration
- lifetime upgrade tracking

the product should use real accounts, not anonymous-only auth.

Recommended auth method:

- Supabase email magic link

Why:

- low friction
- no password reset burden
- works on both web and mobile
- stable user ID for storage, history, and purchases

Supabase notes:

- Magic links are configured through Supabase passwordless email login.
- Redirect URLs must be configured in Supabase.
- Mobile apps need deep linking so the magic link can return to the app.
- Magic links expire and resend windows are rate limited by Supabase defaults.

Sources:

- [Supabase magic link auth](https://supabase.com/docs/guides/auth/auth-magic-link)
- [Supabase Auth overview](https://supabase.com/docs/guides/auth/)
- [Supabase native mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)

## Recommended Sign-In Flow

### Mobile

1. User opens app
2. User enters email
3. App calls Supabase passwordless email login
4. User taps magic link in email
5. Magic link redirects back into the Expo app using the app scheme
6. Supabase session is established on device
7. App loads `profiles`, `entitlements`, `readings`, `results`, and `reminders`

### Web

1. User opens the Vercel-hosted web app
2. User enters the same email
3. Magic link opens a browser session
4. Web app loads the same Supabase account data

## Expo Integration Plan: Real Sign-In

Replace anonymous auth with a real sign-in layer.

Recommended Expo auth implementation:

- `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`
- keep the app scheme in `app.json`
- add deep-link handling so Supabase can complete the session in-app

Recommended mobile auth screens:

- `sign-in`
- `check-email`
- `auth-callback`

### Mobile Auth Responsibilities

`sign-in`

- collect email
- send magic link

`check-email`

- explain that a link was sent
- allow resend after cooldown

`auth-callback`

- receive deep link
- restore or exchange session
- route into the main app

## Changes To The Current Expo Plan

The current Expo prototype uses anonymous sign-in assumptions. That should be replaced with:

- required real account session before the first durable save
- loading `profiles` and `entitlements` after login
- uploading images under the authenticated user
- using the same account for web comparison and purchase restore

Recommended rule:

- do not let a user rely on long-term history without a real account

If you want a lower-friction preview mode later, it should be a temporary pre-auth experience, not the final persistence model.

## Entitlement Model

Use the account as the source of truth for paid access.

Flow:

1. User signs into mobile app
2. User purchases lifetime unlock through Apple or Google
3. Receipt is verified server-side
4. Backend updates `entitlements`
5. Mobile and web both read the same entitlement row

## Vercel Web App Structure

Use Next.js App Router.

Suggested routes:

```text
app/
  page.tsx
  dashboard/page.tsx
  readings/page.tsx
  compare/page.tsx
  reminders/page.tsx
  auth/login/page.tsx
  api/ai/extract-meter/route.ts
lib/
  supabase/
    client.ts
    server.ts
  meter/
    calculations.ts
    schemas.ts
```

### Page Responsibilities

`/`

- landing or signed-in redirect

`/dashboard`

- latest reading per meter
- current reminder dates
- quick compare summary
- premium or trial status

`/readings`

- reading history by meter type
- image thumbnail
- confirmed reading
- timestamp

`/compare`

- enter bill usage
- compare bill vs latest calculated app usage

`/reminders`

- show next due dates
- allow pause/resume later if needed

### API Route

`/api/ai/extract-meter`

Responsibilities:

- receives uploaded meter image or signed upload reference
- calls OpenAI server-side
- validates structured response
- returns safe JSON to mobile/web

Do not put your OpenAI key in the Expo client.

Additional future API routes:

- `/api/purchases/verify-app-store`
- `/api/purchases/verify-play-store`

## Expo-to-Supabase Data Flow

### Save Reading Flow

1. User signs in with magic link
2. Expo restores authenticated Supabase session
3. User taps `Gas Meter`, `Hydro Meter`, or `Water Meter`
4. Camera opens in Expo app
5. User takes picture
6. Expo app uploads image to Supabase Storage
7. Expo app gets storage path or signed URL reference
8. Expo app sends request to Vercel API route with:
   - `meterType`
   - `imagePath` or signed image URL
   - `capturedAt`
9. Vercel API route calls OpenAI
10. API returns:
   - `aiReadingValue`
   - `aiConfidence`
   - `units`
11. Expo app shows confirm screen
12. User confirms or edits reading
13. Expo app inserts into `readings`
14. Expo app fetches previous reading for same `meter_type`
15. Expo app or server calculates usage
16. App inserts into `results`
17. App upserts `reminders` with `captured_at + 28 days`

## AI Processing Flow

Recommended rule:

- call OpenAI from Vercel, not from Expo

Why:

- protects API key
- centralizes prompt and schema control
- makes retries/logging easier
- lets both mobile and web use the same extraction service

### API Request Shape

Suggested request body from Expo to Vercel:

```json
{
  "meterType": "gas",
  "imageUrl": "https://...",
  "capturedAt": "2026-05-24T14:00:00.000Z"
}
```

### OpenAI Response Shape

Use Structured Outputs with a fixed schema.

Suggested schema:

```json
{
  "readingValue": "43021",
  "units": "m3",
  "confidence": 0.93,
  "isReadable": true,
  "notes": "Digits are clear and fully visible."
}
```

### AI Prompting Rules

Prompt should instruct the model to:

- read the cumulative meter value only
- ignore decorative numbers
- return `isReadable: false` if the image is unclear
- avoid inventing digits
- return structured JSON only

### Server Validation

Before returning AI output to the app:

- validate against Zod schema
- reject malformed values
- normalize units by meter type if needed

## Where Calculation Should Live

For MVP, usage math can live in both places:

- Expo app for fast UX
- Vercel or web app utility code for consistency

Best long-term move:

- keep one shared calculation rule in TypeScript
- duplicate only if necessary between web and mobile

Core formula:

```text
usage = current_confirmed_value - previous_confirmed_value
```

If current is lower than previous:

- do not compute automatically
- flag for review

## Build Order

### Phase 1

- create Supabase project
- create tables
- create storage bucket
- enable RLS
- configure magic-link redirect URLs
- connect Expo app to Supabase auth and storage

### Phase 2

- create Next.js web app on Vercel
- start from Supabase Starter template
- connect to same Supabase project
- build dashboard and compare pages

### Phase 3

- create Vercel API route for OpenAI extraction
- wire Expo confirm flow to live AI
- save readings and results to Supabase

### Phase 4

- add bill entry in web app
- compare billed usage against results

## Final Recommendation

Start with:

- current Expo app for capture
- Supabase for auth, Postgres, and image storage
- Next.js Supabase Starter on Vercel for the web app
- Vercel API route for OpenAI meter extraction

That is the cleanest path with the accounts and API keys you already have.
