-- MeterBuddy account and purchase entitlements
-- Target: Supabase Postgres
-- Created: 2026-05-24

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlements (
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

create index if not exists idx_entitlements_user_key
  on public.entitlements (user_id, entitlement_key);

create index if not exists idx_entitlements_status
  on public.entitlements (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  insert into public.entitlements (
    user_id,
    entitlement_key,
    status,
    source,
    metadata
  )
  values (
    new.id,
    'lifetime_unlock',
    'trial',
    'admin',
    jsonb_build_object('seeded', true)
  )
  on conflict (user_id, entitlement_key) do nothing;

  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists entitlements_set_updated_at on public.entitlements;
create trigger entitlements_set_updated_at
before update on public.entitlements
for each row
execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.entitlements enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using (auth.uid() = id);

drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own"
on public.entitlements
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "entitlements_insert_own" on public.entitlements;
create policy "entitlements_insert_own"
on public.entitlements
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "entitlements_update_own" on public.entitlements;
create policy "entitlements_update_own"
on public.entitlements
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "entitlements_delete_own" on public.entitlements;
create policy "entitlements_delete_own"
on public.entitlements
for delete
to authenticated
using (auth.uid() = user_id);

commit;
