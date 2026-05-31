-- MeterBuddy MVP schema
-- Target: Supabase Postgres
-- Created: 2026-05-24

begin;

create extension if not exists pgcrypto;

create table if not exists public.readings (
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

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meter_type text not null check (meter_type in ('gas', 'hydro', 'water')),
  current_reading_id uuid not null references public.readings(id) on delete cascade,
  previous_reading_id uuid references public.readings(id) on delete set null,
  usage_value numeric,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meter_type text not null check (meter_type in ('gas', 'hydro', 'water')),
  next_due_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, meter_type)
);

create index if not exists idx_readings_user_meter_captured
  on public.readings (user_id, meter_type, captured_at desc);

create index if not exists idx_results_user_meter_calculated
  on public.results (user_id, meter_type, calculated_at desc);

create index if not exists idx_reminders_user_due
  on public.reminders (user_id, next_due_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reminders_set_updated_at on public.reminders;

create trigger reminders_set_updated_at
before update on public.reminders
for each row
execute function public.set_updated_at();

alter table public.readings enable row level security;
alter table public.results enable row level security;
alter table public.reminders enable row level security;

drop policy if exists "readings_select_own" on public.readings;
create policy "readings_select_own"
on public.readings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "readings_insert_own" on public.readings;
create policy "readings_insert_own"
on public.readings
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "readings_update_own" on public.readings;
create policy "readings_update_own"
on public.readings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "readings_delete_own" on public.readings;
create policy "readings_delete_own"
on public.readings
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "results_select_own" on public.results;
create policy "results_select_own"
on public.results
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "results_insert_own" on public.results;
create policy "results_insert_own"
on public.results
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "results_update_own" on public.results;
create policy "results_update_own"
on public.results
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "results_delete_own" on public.results;
create policy "results_delete_own"
on public.results
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "reminders_select_own" on public.reminders;
create policy "reminders_select_own"
on public.reminders
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "reminders_insert_own" on public.reminders;
create policy "reminders_insert_own"
on public.reminders
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "reminders_update_own" on public.reminders;
create policy "reminders_update_own"
on public.reminders
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "reminders_delete_own" on public.reminders;
create policy "reminders_delete_own"
on public.reminders
for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('meter-images', 'meter-images', false)
on conflict (id) do nothing;

drop policy if exists "meter_images_select_own" on storage.objects;
create policy "meter_images_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'meter-images'
  and owner = auth.uid()
);

drop policy if exists "meter_images_insert_own" on storage.objects;
create policy "meter_images_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'meter-images'
  and owner = auth.uid()
);

drop policy if exists "meter_images_update_own" on storage.objects;
create policy "meter_images_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'meter-images'
  and owner = auth.uid()
)
with check (
  bucket_id = 'meter-images'
  and owner = auth.uid()
);

drop policy if exists "meter_images_delete_own" on storage.objects;
create policy "meter_images_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'meter-images'
  and owner = auth.uid()
);

commit;
