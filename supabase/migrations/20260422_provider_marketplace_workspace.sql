-- Provider marketplace workspace expansion
-- Adds provider applications plus moderated listing/request metadata.

alter table if exists public.work_listings
  add column if not exists details jsonb not null default '{}'::jsonb,
  add column if not exists review_notes text,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz;

alter table if exists public.work_requests
  add column if not exists request_type text not null default 'quote',
  add column if not exists details jsonb not null default '{}'::jsonb,
  add column if not exists scheduled_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz;

create table if not exists public.work_provider_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider_persona_id text,
  business_name text,
  business_type text,
  bio text,
  service_categories jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  years_experience integer not null default 0,
  service_area jsonb not null default '[]'::jsonb,
  response_sla_hours integer not null default 24,
  payout_ready boolean not null default false,
  website text,
  documents jsonb not null default '[]'::jsonb,
  portfolio jsonb not null default '[]'::jsonb,
  onboarding_progress integer not null default 0,
  status text not null default 'draft',
  notes text,
  reviewer_notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create index if not exists idx_work_provider_applications_user on public.work_provider_applications(user_id, updated_at desc);
create index if not exists idx_work_provider_applications_status on public.work_provider_applications(status, updated_at desc);

drop trigger if exists set_work_provider_applications_updated_at on public.work_provider_applications;
create trigger set_work_provider_applications_updated_at before update on public.work_provider_applications
for each row execute function public.set_updated_at();

alter table if exists public.work_provider_applications enable row level security;
