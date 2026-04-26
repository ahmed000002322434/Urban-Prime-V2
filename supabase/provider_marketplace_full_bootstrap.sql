-- Provider Marketplace Full Bootstrap
-- Run this in Supabase SQL Editor for a complete provider marketplace backend.
--
-- This file now includes:
-- 1. The `public.users` / `public.user_profiles` bridge required by the app
-- 2. Provider marketplace tables
-- 3. Browser-mode grants and RLS policies for running without the Node backend
--
-- What this file gives you:
-- - Provider applications and moderated service listings
-- - Requests, proposals, contracts, milestones, disputes, escrow ledger
-- - Reviews, shortlists, saved searches, availability overrides
-- - Provider payout accounts and payout requests
-- - Search/review queue indexes and RLS policies
-- - A runtime flag: `app_runtime_flags.allow_direct_client_provider_mode`
--   Keep it `true` for no-backend browser mode, or flip it to `false` later
--   once you replace browser writes with a trusted backend / edge functions.

create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text not null unique,
  email citext unique,
  name text,
  avatar_url text,
  phone text,
  role text not null default 'user',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  username text unique,
  bio text,
  city text,
  country text,
  language text,
  preferences jsonb not null default '{}'::jsonb,
  social_links jsonb not null default '{}'::jsonb,
  is_seller boolean not null default false,
  is_provider boolean not null default false,
  about text,
  business_name text,
  business_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_user_profiles_user on public.user_profiles(user_id);

create table if not exists public.app_runtime_flags (
  key text primary key,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_service_role()
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  return coalesce(auth.jwt() ->> 'role', '') = 'service_role';
end;
$$;

create or replace function public.current_firebase_uid()
returns text
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  return nullif(auth.jwt() ->> 'firebase_uid', '');
end;
$$;

create or replace function public.is_direct_client_provider_mode_enabled()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.app_runtime_flags
    where key = 'allow_direct_client_provider_mode'
      and enabled = true
  );
end;
$$;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_app_runtime_flags_updated_at on public.app_runtime_flags;
create trigger set_app_runtime_flags_updated_at before update on public.app_runtime_flags
for each row execute function public.set_updated_at();

insert into public.app_runtime_flags (key, enabled, config)
values (
  'allow_direct_client_provider_mode',
  true,
  jsonb_build_object(
    'notes',
    'Allows browser-mode provider marketplace writes from the app without the Node backend. Disable after moving writes to a trusted backend.'
  )
)
on conflict (key) do update
set enabled = excluded.enabled,
    config = excluded.config,
    updated_at = now();

create table if not exists public.work_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  seller_persona_id uuid,
  title text not null,
  description text,
  category text not null default 'general',
  mode text not null default 'hybrid',
  fulfillment_kind text not null default 'hybrid',
  pricing_type text not null default 'fixed',
  base_price numeric(12,2) not null default 0,
  currency text not null default 'USD',
  timezone text not null default 'UTC',
  packages jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  media jsonb not null default '[]'::jsonb,
  availability jsonb not null default '{}'::jsonb,
  details jsonb not null default '{}'::jsonb,
  provider_snapshot jsonb not null default '{}'::jsonb,
  risk_score numeric(6,2) not null default 0,
  status text not null default 'draft',
  visibility text not null default 'public',
  review_notes text,
  published_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.work_listings
  add column if not exists details jsonb not null default '{}'::jsonb,
  add column if not exists review_notes text,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz;

create table if not exists public.work_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete cascade,
  requester_persona_id uuid,
  requester_snapshot jsonb not null default '{}'::jsonb,
  title text not null,
  brief text not null,
  listing_id uuid references public.work_listings(id) on delete set null,
  target_provider_id uuid references public.users(id) on delete set null,
  category text not null default 'general',
  mode text not null default 'hybrid',
  fulfillment_kind text not null default 'hybrid',
  budget_min numeric(12,2) not null default 0,
  budget_max numeric(12,2) not null default 0,
  currency text not null default 'USD',
  timezone text not null default 'UTC',
  request_type text not null default 'quote',
  location jsonb not null default '{}'::jsonb,
  details jsonb not null default '{}'::jsonb,
  requirements jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  risk_score numeric(6,2) not null default 0,
  status text not null default 'open',
  scheduled_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.work_requests
  add column if not exists request_type text not null default 'quote',
  add column if not exists details jsonb not null default '{}'::jsonb,
  add column if not exists scheduled_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz;

create table if not exists public.work_proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.work_requests(id) on delete set null,
  listing_id uuid references public.work_listings(id) on delete set null,
  provider_id uuid not null references public.users(id) on delete cascade,
  provider_persona_id uuid,
  provider_snapshot jsonb not null default '{}'::jsonb,
  client_id uuid not null references public.users(id) on delete cascade,
  client_persona_id uuid,
  client_snapshot jsonb not null default '{}'::jsonb,
  title text not null,
  cover_letter text,
  price_total numeric(12,2) not null default 0,
  currency text not null default 'USD',
  delivery_days integer not null default 0,
  milestones jsonb not null default '[]'::jsonb,
  terms jsonb not null default '{}'::jsonb,
  revision_limit integer not null default 0,
  risk_score numeric(6,2) not null default 0,
  status text not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_engagements (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id text not null,
  mode text not null default 'hybrid',
  fulfillment_kind text not null default 'hybrid',
  buyer_id uuid not null references public.users(id) on delete cascade,
  buyer_persona_id uuid,
  provider_id uuid references public.users(id) on delete set null,
  provider_persona_id uuid,
  currency text not null default 'USD',
  timezone text not null default 'UTC',
  gross_amount numeric(12,2) not null default 0,
  escrow_status text not null default 'none',
  risk_score numeric(6,2) not null default 0,
  status text not null default 'created',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_contracts (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references public.work_proposals(id) on delete set null,
  request_id uuid references public.work_requests(id) on delete set null,
  listing_id uuid references public.work_listings(id) on delete set null,
  engagement_id uuid references public.work_engagements(id) on delete set null,
  client_id uuid not null references public.users(id) on delete cascade,
  client_persona_id uuid,
  client_snapshot jsonb not null default '{}'::jsonb,
  provider_id uuid not null references public.users(id) on delete cascade,
  provider_persona_id uuid,
  provider_snapshot jsonb not null default '{}'::jsonb,
  scope text not null default '',
  mode text not null default 'hybrid',
  fulfillment_kind text not null default 'hybrid',
  currency text not null default 'USD',
  timezone text not null default 'UTC',
  total_amount numeric(12,2) not null default 0,
  escrow_held numeric(12,2) not null default 0,
  risk_score numeric(6,2) not null default 0,
  status text not null default 'pending',
  terms jsonb not null default '{}'::jsonb,
  start_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_milestones (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.work_contracts(id) on delete cascade,
  title text not null,
  description text,
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  due_at timestamptz,
  sort_order integer not null default 0,
  status text not null default 'pending',
  deliverables jsonb not null default '[]'::jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_escrow_ledger (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.work_engagements(id) on delete cascade,
  contract_id uuid references public.work_contracts(id) on delete set null,
  milestone_id uuid references public.work_milestones(id) on delete set null,
  payer_id uuid references public.users(id) on delete set null,
  payee_id uuid references public.users(id) on delete set null,
  action text not null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  status text not null default 'succeeded',
  provider_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.work_disputes (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.work_engagements(id) on delete cascade,
  contract_id uuid references public.work_contracts(id) on delete set null,
  opened_by uuid not null references public.users(id) on delete cascade,
  against_user_id uuid references public.users(id) on delete set null,
  reason text not null,
  summary text,
  evidence jsonb not null default '[]'::jsonb,
  ai_summary text,
  status text not null default 'open',
  resolution jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_reputation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  persona_id uuid,
  score numeric(6,2) not null default 0,
  jobs_completed integer not null default 0,
  completion_rate numeric(6,2) not null default 0,
  dispute_rate numeric(6,2) not null default 0,
  on_time_rate numeric(6,2) not null default 0,
  response_sla_minutes integer not null default 0,
  repeat_client_rate numeric(6,2) not null default 0,
  badges jsonb not null default '[]'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, persona_id)
);

create table if not exists public.work_autopilot_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null,
  actor_user_id uuid references public.users(id) on delete set null,
  actor_persona_id uuid,
  request_id uuid references public.work_requests(id) on delete set null,
  listing_id uuid references public.work_listings(id) on delete set null,
  contract_id uuid references public.work_contracts(id) on delete set null,
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  model text,
  status text not null default 'succeeded',
  latency_ms integer,
  created_at timestamptz not null default now()
);

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

create table if not exists public.work_reviews (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references public.work_contracts(id) on delete set null,
  listing_id uuid references public.work_listings(id) on delete set null,
  reviewer_id uuid not null references public.users(id) on delete cascade,
  reviewee_id uuid not null references public.users(id) on delete cascade,
  reviewer_role text not null default 'client',
  rating numeric(3,2) not null default 5,
  title text,
  body text,
  badges jsonb not null default '[]'::jsonb,
  private_notes text,
  would_rehire boolean not null default true,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_provider_availability_overrides (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users(id) on delete cascade,
  listing_id uuid references public.work_listings(id) on delete cascade,
  override_date date not null,
  status text not null default 'blocked',
  windows jsonb not null default '[]'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_shortlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  listing_id uuid references public.work_listings(id) on delete cascade,
  provider_id uuid references public.users(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  query jsonb not null default '{}'::jsonb,
  channels jsonb not null default '["in_app"]'::jsonb,
  cadence text not null default 'daily',
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users(id) on delete cascade,
  account_type text not null default 'bank',
  provider_name text not null default 'manual',
  account_ref text,
  country text,
  currency text not null default 'USD',
  status text not null default 'pending',
  details jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_payout_requests (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users(id) on delete cascade,
  payout_account_id uuid references public.work_payout_accounts(id) on delete set null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending',
  contract_ids jsonb not null default '[]'::jsonb,
  notes text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_work_listings_seller on public.work_listings(seller_id, created_at desc);
create index if not exists idx_work_listings_status on public.work_listings(status, created_at desc);
create index if not exists idx_work_listings_category on public.work_listings(category);
create index if not exists idx_work_listings_review_queue on public.work_listings(status, submitted_at desc);
create index if not exists idx_work_listings_search
  on public.work_listings
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, '') || ' ' || coalesce(details::text, '')));

create index if not exists idx_work_requests_requester on public.work_requests(requester_id, created_at desc);
create index if not exists idx_work_requests_target_provider on public.work_requests(target_provider_id, created_at desc);
create index if not exists idx_work_requests_status on public.work_requests(status, created_at desc);
create index if not exists idx_work_requests_provider_type_status on public.work_requests(target_provider_id, request_type, status, scheduled_at desc);

create index if not exists idx_work_proposals_provider on public.work_proposals(provider_id, created_at desc);
create index if not exists idx_work_proposals_client on public.work_proposals(client_id, created_at desc);
create index if not exists idx_work_proposals_request on public.work_proposals(request_id, created_at desc);

create index if not exists idx_work_engagements_buyer on public.work_engagements(buyer_id, created_at desc);
create index if not exists idx_work_engagements_provider on public.work_engagements(provider_id, created_at desc);
create index if not exists idx_work_engagements_source on public.work_engagements(source_type, source_id);

create index if not exists idx_work_contracts_provider on public.work_contracts(provider_id, created_at desc);
create index if not exists idx_work_contracts_client on public.work_contracts(client_id, created_at desc);
create index if not exists idx_work_contracts_status on public.work_contracts(status, created_at desc);

create index if not exists idx_work_milestones_contract on public.work_milestones(contract_id, sort_order);
create index if not exists idx_work_escrow_ledger_engagement on public.work_escrow_ledger(engagement_id, created_at desc);
create index if not exists idx_work_disputes_engagement on public.work_disputes(engagement_id, created_at desc);
create index if not exists idx_work_reputation_user on public.work_reputation(user_id, updated_at desc);
create index if not exists idx_work_autopilot_runs_type on public.work_autopilot_runs(run_type, created_at desc);

create index if not exists idx_work_provider_applications_user on public.work_provider_applications(user_id, updated_at desc);
create index if not exists idx_work_provider_applications_status on public.work_provider_applications(status, updated_at desc);
create index if not exists idx_work_provider_applications_review_queue on public.work_provider_applications(status, submitted_at desc);

create index if not exists idx_work_reviews_reviewee on public.work_reviews(reviewee_id, created_at desc);
create index if not exists idx_work_reviews_listing on public.work_reviews(listing_id, created_at desc);
create index if not exists idx_work_reviews_contract on public.work_reviews(contract_id, created_at desc);

create index if not exists idx_work_provider_availability_overrides_provider
  on public.work_provider_availability_overrides(provider_id, override_date desc);

create unique index if not exists idx_work_shortlists_user_listing_unique
  on public.work_shortlists(user_id, listing_id)
  where listing_id is not null;

create unique index if not exists idx_work_shortlists_user_provider_unique
  on public.work_shortlists(user_id, provider_id)
  where provider_id is not null;

create index if not exists idx_work_saved_searches_user on public.work_saved_searches(user_id, updated_at desc);
create index if not exists idx_work_payout_accounts_provider on public.work_payout_accounts(provider_id, updated_at desc);
create index if not exists idx_work_payout_requests_provider on public.work_payout_requests(provider_id, created_at desc);
create index if not exists idx_work_payout_requests_status on public.work_payout_requests(status, created_at desc);

drop trigger if exists set_work_listings_updated_at on public.work_listings;
create trigger set_work_listings_updated_at before update on public.work_listings
for each row execute function public.set_updated_at();

drop trigger if exists set_work_requests_updated_at on public.work_requests;
create trigger set_work_requests_updated_at before update on public.work_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_work_proposals_updated_at on public.work_proposals;
create trigger set_work_proposals_updated_at before update on public.work_proposals
for each row execute function public.set_updated_at();

drop trigger if exists set_work_engagements_updated_at on public.work_engagements;
create trigger set_work_engagements_updated_at before update on public.work_engagements
for each row execute function public.set_updated_at();

drop trigger if exists set_work_contracts_updated_at on public.work_contracts;
create trigger set_work_contracts_updated_at before update on public.work_contracts
for each row execute function public.set_updated_at();

drop trigger if exists set_work_milestones_updated_at on public.work_milestones;
create trigger set_work_milestones_updated_at before update on public.work_milestones
for each row execute function public.set_updated_at();

drop trigger if exists set_work_disputes_updated_at on public.work_disputes;
create trigger set_work_disputes_updated_at before update on public.work_disputes
for each row execute function public.set_updated_at();

drop trigger if exists set_work_reputation_updated_at on public.work_reputation;
create trigger set_work_reputation_updated_at before update on public.work_reputation
for each row execute function public.set_updated_at();

drop trigger if exists set_work_provider_applications_updated_at on public.work_provider_applications;
create trigger set_work_provider_applications_updated_at before update on public.work_provider_applications
for each row execute function public.set_updated_at();

drop trigger if exists set_work_reviews_updated_at on public.work_reviews;
create trigger set_work_reviews_updated_at before update on public.work_reviews
for each row execute function public.set_updated_at();

drop trigger if exists set_work_provider_availability_overrides_updated_at on public.work_provider_availability_overrides;
create trigger set_work_provider_availability_overrides_updated_at before update on public.work_provider_availability_overrides
for each row execute function public.set_updated_at();

drop trigger if exists set_work_shortlists_updated_at on public.work_shortlists;
create trigger set_work_shortlists_updated_at before update on public.work_shortlists
for each row execute function public.set_updated_at();

drop trigger if exists set_work_saved_searches_updated_at on public.work_saved_searches;
create trigger set_work_saved_searches_updated_at before update on public.work_saved_searches
for each row execute function public.set_updated_at();

drop trigger if exists set_work_payout_accounts_updated_at on public.work_payout_accounts;
create trigger set_work_payout_accounts_updated_at before update on public.work_payout_accounts
for each row execute function public.set_updated_at();

drop trigger if exists set_work_payout_requests_updated_at on public.work_payout_requests;
create trigger set_work_payout_requests_updated_at before update on public.work_payout_requests
for each row execute function public.set_updated_at();

alter table if exists public.work_listings enable row level security;
alter table if exists public.work_requests enable row level security;
alter table if exists public.work_proposals enable row level security;
alter table if exists public.work_engagements enable row level security;
alter table if exists public.work_contracts enable row level security;
alter table if exists public.work_milestones enable row level security;
alter table if exists public.work_escrow_ledger enable row level security;
alter table if exists public.work_disputes enable row level security;
alter table if exists public.work_reputation enable row level security;
alter table if exists public.work_autopilot_runs enable row level security;
alter table if exists public.work_provider_applications enable row level security;
alter table if exists public.work_reviews enable row level security;
alter table if exists public.work_provider_availability_overrides enable row level security;
alter table if exists public.work_shortlists enable row level security;
alter table if exists public.work_saved_searches enable row level security;
alter table if exists public.work_payout_accounts enable row level security;
alter table if exists public.work_payout_requests enable row level security;

drop policy if exists "service_role_all_work_listings" on public.work_listings;
create policy "service_role_all_work_listings" on public.work_listings
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "work_listings_public_read" on public.work_listings;
create policy "work_listings_public_read" on public.work_listings
for select
using (status = 'published' and visibility = 'public');

drop policy if exists "work_listings_owner" on public.work_listings;
create policy "work_listings_owner" on public.work_listings
for all
using (public.is_service_role() or seller_id = auth.uid())
with check (public.is_service_role() or seller_id = auth.uid());

drop policy if exists "service_role_all_work_requests" on public.work_requests;
create policy "service_role_all_work_requests" on public.work_requests
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "work_requests_participants_read" on public.work_requests;
create policy "work_requests_participants_read" on public.work_requests
for select
using (requester_id = auth.uid() or target_provider_id = auth.uid());

drop policy if exists "work_requests_requester_insert" on public.work_requests;
create policy "work_requests_requester_insert" on public.work_requests
for insert
with check (public.is_service_role() or requester_id = auth.uid());

drop policy if exists "work_requests_requester_update" on public.work_requests;
create policy "work_requests_requester_update" on public.work_requests
for update
using (public.is_service_role() or requester_id = auth.uid())
with check (public.is_service_role() or requester_id = auth.uid());

drop policy if exists "service_role_all_work_proposals" on public.work_proposals;
create policy "service_role_all_work_proposals" on public.work_proposals
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "work_proposals_participants_read" on public.work_proposals;
create policy "work_proposals_participants_read" on public.work_proposals
for select
using (provider_id = auth.uid() or client_id = auth.uid());

drop policy if exists "work_proposals_provider_insert" on public.work_proposals;
create policy "work_proposals_provider_insert" on public.work_proposals
for insert
with check (public.is_service_role() or provider_id = auth.uid());

drop policy if exists "work_proposals_provider_update" on public.work_proposals;
create policy "work_proposals_provider_update" on public.work_proposals
for update
using (public.is_service_role() or provider_id = auth.uid())
with check (public.is_service_role() or provider_id = auth.uid());

drop policy if exists "service_role_all_work_engagements" on public.work_engagements;
create policy "service_role_all_work_engagements" on public.work_engagements
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "work_engagements_participants_read" on public.work_engagements;
create policy "work_engagements_participants_read" on public.work_engagements
for select
using (buyer_id = auth.uid() or provider_id = auth.uid());

drop policy if exists "service_role_all_work_contracts" on public.work_contracts;
create policy "service_role_all_work_contracts" on public.work_contracts
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "work_contracts_participants_read" on public.work_contracts;
create policy "work_contracts_participants_read" on public.work_contracts
for select
using (client_id = auth.uid() or provider_id = auth.uid());

drop policy if exists "service_role_all_work_milestones" on public.work_milestones;
create policy "service_role_all_work_milestones" on public.work_milestones
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "work_milestones_participants_read" on public.work_milestones;
create policy "work_milestones_participants_read" on public.work_milestones
for select
using (
  exists (
    select 1
    from public.work_contracts c
    where c.id = contract_id
      and (c.client_id = auth.uid() or c.provider_id = auth.uid())
  )
);

drop policy if exists "service_role_all_work_escrow_ledger" on public.work_escrow_ledger;
create policy "service_role_all_work_escrow_ledger" on public.work_escrow_ledger
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "work_escrow_ledger_participants_read" on public.work_escrow_ledger;
create policy "work_escrow_ledger_participants_read" on public.work_escrow_ledger
for select
using (payer_id = auth.uid() or payee_id = auth.uid());

drop policy if exists "service_role_all_work_disputes" on public.work_disputes;
create policy "service_role_all_work_disputes" on public.work_disputes
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "work_disputes_participants_read" on public.work_disputes;
create policy "work_disputes_participants_read" on public.work_disputes
for select
using (opened_by = auth.uid() or against_user_id = auth.uid());

drop policy if exists "work_disputes_owner_insert" on public.work_disputes;
create policy "work_disputes_owner_insert" on public.work_disputes
for insert
with check (public.is_service_role() or opened_by = auth.uid());

drop policy if exists "service_role_all_work_reputation" on public.work_reputation;
create policy "service_role_all_work_reputation" on public.work_reputation
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "work_reputation_public_read" on public.work_reputation;
create policy "work_reputation_public_read" on public.work_reputation
for select
using (true);

drop policy if exists "service_role_all_work_autopilot_runs" on public.work_autopilot_runs;
create policy "service_role_all_work_autopilot_runs" on public.work_autopilot_runs
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "work_autopilot_runs_actor_read" on public.work_autopilot_runs;
create policy "work_autopilot_runs_actor_read" on public.work_autopilot_runs
for select
using (actor_user_id = auth.uid());

drop policy if exists "service_role_all_work_provider_applications" on public.work_provider_applications;
create policy "service_role_all_work_provider_applications" on public.work_provider_applications
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "work_provider_applications_owner_select" on public.work_provider_applications;
create policy "work_provider_applications_owner_select" on public.work_provider_applications
for select
using (public.is_service_role() or user_id = auth.uid());

drop policy if exists "work_provider_applications_owner_insert" on public.work_provider_applications;
create policy "work_provider_applications_owner_insert" on public.work_provider_applications
for insert
with check (public.is_service_role() or user_id = auth.uid());

drop policy if exists "work_provider_applications_owner_update" on public.work_provider_applications;
create policy "work_provider_applications_owner_update" on public.work_provider_applications
for update
using (public.is_service_role() or user_id = auth.uid())
with check (public.is_service_role() or user_id = auth.uid());

drop policy if exists "service_role_all_work_reviews" on public.work_reviews;
create policy "service_role_all_work_reviews" on public.work_reviews
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "work_reviews_public_read" on public.work_reviews;
create policy "work_reviews_public_read" on public.work_reviews
for select
using (is_public = true);

drop policy if exists "work_reviews_owner_insert" on public.work_reviews;
create policy "work_reviews_owner_insert" on public.work_reviews
for insert
with check (public.is_service_role() or reviewer_id = auth.uid());

drop policy if exists "work_reviews_owner_update" on public.work_reviews;
create policy "work_reviews_owner_update" on public.work_reviews
for update
using (public.is_service_role() or reviewer_id = auth.uid())
with check (public.is_service_role() or reviewer_id = auth.uid());

drop policy if exists "service_role_all_work_provider_availability_overrides" on public.work_provider_availability_overrides;
create policy "service_role_all_work_provider_availability_overrides" on public.work_provider_availability_overrides
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "work_provider_availability_overrides_owner" on public.work_provider_availability_overrides;
create policy "work_provider_availability_overrides_owner" on public.work_provider_availability_overrides
for all
using (public.is_service_role() or provider_id = auth.uid())
with check (public.is_service_role() or provider_id = auth.uid());

drop policy if exists "service_role_all_work_shortlists" on public.work_shortlists;
create policy "service_role_all_work_shortlists" on public.work_shortlists
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "work_shortlists_owner" on public.work_shortlists;
create policy "work_shortlists_owner" on public.work_shortlists
for all
using (public.is_service_role() or user_id = auth.uid())
with check (public.is_service_role() or user_id = auth.uid());

drop policy if exists "service_role_all_work_saved_searches" on public.work_saved_searches;
create policy "service_role_all_work_saved_searches" on public.work_saved_searches
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "work_saved_searches_owner" on public.work_saved_searches;
create policy "work_saved_searches_owner" on public.work_saved_searches
for all
using (public.is_service_role() or user_id = auth.uid())
with check (public.is_service_role() or user_id = auth.uid());

drop policy if exists "service_role_all_work_payout_accounts" on public.work_payout_accounts;
create policy "service_role_all_work_payout_accounts" on public.work_payout_accounts
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "work_payout_accounts_owner" on public.work_payout_accounts;
create policy "work_payout_accounts_owner" on public.work_payout_accounts
for all
using (public.is_service_role() or provider_id = auth.uid())
with check (public.is_service_role() or provider_id = auth.uid());

drop policy if exists "service_role_all_work_payout_requests" on public.work_payout_requests;
create policy "service_role_all_work_payout_requests" on public.work_payout_requests
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "work_payout_requests_owner" on public.work_payout_requests;
create policy "work_payout_requests_owner" on public.work_payout_requests
for all
using (public.is_service_role() or provider_id = auth.uid())
with check (public.is_service_role() or provider_id = auth.uid());

alter table if exists public.users enable row level security;
alter table if exists public.user_profiles enable row level security;
alter table if exists public.app_runtime_flags enable row level security;

drop policy if exists "service_role_all_users" on public.users;
create policy "service_role_all_users" on public.users
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "users_bridge_self_read" on public.users;
create policy "users_bridge_self_read" on public.users
for select
using (
  public.is_service_role()
  or id = auth.uid()
  or firebase_uid = public.current_firebase_uid()
  or public.is_direct_client_provider_mode_enabled()
);

drop policy if exists "users_bridge_direct_mode_write" on public.users;
create policy "users_bridge_direct_mode_write" on public.users
for all
using (public.is_service_role() or public.is_direct_client_provider_mode_enabled())
with check (public.is_service_role() or public.is_direct_client_provider_mode_enabled());

drop policy if exists "service_role_all_user_profiles" on public.user_profiles;
create policy "service_role_all_user_profiles" on public.user_profiles
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "user_profiles_direct_mode" on public.user_profiles;
create policy "user_profiles_direct_mode" on public.user_profiles
for all
using (public.is_service_role() or public.is_direct_client_provider_mode_enabled())
with check (public.is_service_role() or public.is_direct_client_provider_mode_enabled());

drop policy if exists "app_runtime_flags_read" on public.app_runtime_flags;
create policy "app_runtime_flags_read" on public.app_runtime_flags
for select
using (true);

drop policy if exists "service_role_all_app_runtime_flags" on public.app_runtime_flags;
create policy "service_role_all_app_runtime_flags" on public.app_runtime_flags
for all
using (public.is_service_role())
with check (public.is_service_role());

drop policy if exists "direct_client_mode_work_listings" on public.work_listings;
create policy "direct_client_mode_work_listings" on public.work_listings
for all
using (public.is_direct_client_provider_mode_enabled())
with check (public.is_direct_client_provider_mode_enabled());

drop policy if exists "direct_client_mode_work_requests" on public.work_requests;
create policy "direct_client_mode_work_requests" on public.work_requests
for all
using (public.is_direct_client_provider_mode_enabled())
with check (public.is_direct_client_provider_mode_enabled());

drop policy if exists "direct_client_mode_work_proposals" on public.work_proposals;
create policy "direct_client_mode_work_proposals" on public.work_proposals
for all
using (public.is_direct_client_provider_mode_enabled())
with check (public.is_direct_client_provider_mode_enabled());

drop policy if exists "direct_client_mode_work_engagements" on public.work_engagements;
create policy "direct_client_mode_work_engagements" on public.work_engagements
for all
using (public.is_direct_client_provider_mode_enabled())
with check (public.is_direct_client_provider_mode_enabled());

drop policy if exists "direct_client_mode_work_contracts" on public.work_contracts;
create policy "direct_client_mode_work_contracts" on public.work_contracts
for all
using (public.is_direct_client_provider_mode_enabled())
with check (public.is_direct_client_provider_mode_enabled());

drop policy if exists "direct_client_mode_work_milestones" on public.work_milestones;
create policy "direct_client_mode_work_milestones" on public.work_milestones
for all
using (public.is_direct_client_provider_mode_enabled())
with check (public.is_direct_client_provider_mode_enabled());

drop policy if exists "direct_client_mode_work_escrow_ledger" on public.work_escrow_ledger;
create policy "direct_client_mode_work_escrow_ledger" on public.work_escrow_ledger
for all
using (public.is_direct_client_provider_mode_enabled())
with check (public.is_direct_client_provider_mode_enabled());

drop policy if exists "direct_client_mode_work_disputes" on public.work_disputes;
create policy "direct_client_mode_work_disputes" on public.work_disputes
for all
using (public.is_direct_client_provider_mode_enabled())
with check (public.is_direct_client_provider_mode_enabled());

drop policy if exists "direct_client_mode_work_reputation" on public.work_reputation;
create policy "direct_client_mode_work_reputation" on public.work_reputation
for all
using (public.is_direct_client_provider_mode_enabled())
with check (public.is_direct_client_provider_mode_enabled());

drop policy if exists "direct_client_mode_work_autopilot_runs" on public.work_autopilot_runs;
create policy "direct_client_mode_work_autopilot_runs" on public.work_autopilot_runs
for all
using (public.is_direct_client_provider_mode_enabled())
with check (public.is_direct_client_provider_mode_enabled());

drop policy if exists "direct_client_mode_work_provider_applications" on public.work_provider_applications;
create policy "direct_client_mode_work_provider_applications" on public.work_provider_applications
for all
using (public.is_direct_client_provider_mode_enabled())
with check (public.is_direct_client_provider_mode_enabled());

drop policy if exists "direct_client_mode_work_reviews" on public.work_reviews;
create policy "direct_client_mode_work_reviews" on public.work_reviews
for all
using (public.is_direct_client_provider_mode_enabled())
with check (public.is_direct_client_provider_mode_enabled());

drop policy if exists "direct_client_mode_work_provider_availability_overrides" on public.work_provider_availability_overrides;
create policy "direct_client_mode_work_provider_availability_overrides" on public.work_provider_availability_overrides
for all
using (public.is_direct_client_provider_mode_enabled())
with check (public.is_direct_client_provider_mode_enabled());

drop policy if exists "direct_client_mode_work_shortlists" on public.work_shortlists;
create policy "direct_client_mode_work_shortlists" on public.work_shortlists
for all
using (public.is_direct_client_provider_mode_enabled())
with check (public.is_direct_client_provider_mode_enabled());

drop policy if exists "direct_client_mode_work_saved_searches" on public.work_saved_searches;
create policy "direct_client_mode_work_saved_searches" on public.work_saved_searches
for all
using (public.is_direct_client_provider_mode_enabled())
with check (public.is_direct_client_provider_mode_enabled());

drop policy if exists "direct_client_mode_work_payout_accounts" on public.work_payout_accounts;
create policy "direct_client_mode_work_payout_accounts" on public.work_payout_accounts
for all
using (public.is_direct_client_provider_mode_enabled())
with check (public.is_direct_client_provider_mode_enabled());

drop policy if exists "direct_client_mode_work_payout_requests" on public.work_payout_requests;
create policy "direct_client_mode_work_payout_requests" on public.work_payout_requests
for all
using (public.is_direct_client_provider_mode_enabled())
with check (public.is_direct_client_provider_mode_enabled());

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.users to anon, authenticated;
grant select, insert, update, delete on table public.user_profiles to anon, authenticated;
grant select on table public.app_runtime_flags to anon, authenticated;
grant select, insert, update, delete on table public.work_listings to anon, authenticated;
grant select, insert, update, delete on table public.work_requests to anon, authenticated;
grant select, insert, update, delete on table public.work_proposals to anon, authenticated;
grant select, insert, update, delete on table public.work_engagements to anon, authenticated;
grant select, insert, update, delete on table public.work_contracts to anon, authenticated;
grant select, insert, update, delete on table public.work_milestones to anon, authenticated;
grant select, insert, update, delete on table public.work_escrow_ledger to anon, authenticated;
grant select, insert, update, delete on table public.work_disputes to anon, authenticated;
grant select, insert, update, delete on table public.work_reputation to anon, authenticated;
grant select, insert, update, delete on table public.work_autopilot_runs to anon, authenticated;
grant select, insert, update, delete on table public.work_provider_applications to anon, authenticated;
grant select, insert, update, delete on table public.work_reviews to anon, authenticated;
grant select, insert, update, delete on table public.work_provider_availability_overrides to anon, authenticated;
grant select, insert, update, delete on table public.work_shortlists to anon, authenticated;
grant select, insert, update, delete on table public.work_saved_searches to anon, authenticated;
grant select, insert, update, delete on table public.work_payout_accounts to anon, authenticated;
grant select, insert, update, delete on table public.work_payout_requests to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
