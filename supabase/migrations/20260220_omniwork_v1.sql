-- OmniWork V1 foundational migration
-- Adds unified services / contracts / escrow / autopilot tables.

create table if not exists public.work_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  seller_persona_id uuid references public.personas(id) on delete set null,
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
  provider_snapshot jsonb not null default '{}'::jsonb,
  risk_score numeric(6,2) not null default 0,
  status text not null default 'draft',
  visibility text not null default 'public',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_work_listings_seller on public.work_listings(seller_id, created_at desc);
create index if not exists idx_work_listings_status on public.work_listings(status, created_at desc);
create index if not exists idx_work_listings_category on public.work_listings(category);
drop trigger if exists set_work_listings_updated_at on public.work_listings;
create trigger set_work_listings_updated_at before update on public.work_listings
for each row execute function public.set_updated_at();

create table if not exists public.work_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete cascade,
  requester_persona_id uuid references public.personas(id) on delete set null,
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
  location jsonb not null default '{}'::jsonb,
  requirements jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  risk_score numeric(6,2) not null default 0,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_work_requests_requester on public.work_requests(requester_id, created_at desc);
create index if not exists idx_work_requests_target_provider on public.work_requests(target_provider_id, created_at desc);
create index if not exists idx_work_requests_status on public.work_requests(status, created_at desc);
drop trigger if exists set_work_requests_updated_at on public.work_requests;
create trigger set_work_requests_updated_at before update on public.work_requests
for each row execute function public.set_updated_at();

create table if not exists public.work_proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.work_requests(id) on delete set null,
  listing_id uuid references public.work_listings(id) on delete set null,
  provider_id uuid not null references public.users(id) on delete cascade,
  provider_persona_id uuid references public.personas(id) on delete set null,
  provider_snapshot jsonb not null default '{}'::jsonb,
  client_id uuid not null references public.users(id) on delete cascade,
  client_persona_id uuid references public.personas(id) on delete set null,
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
create index if not exists idx_work_proposals_provider on public.work_proposals(provider_id, created_at desc);
create index if not exists idx_work_proposals_client on public.work_proposals(client_id, created_at desc);
create index if not exists idx_work_proposals_request on public.work_proposals(request_id, created_at desc);
drop trigger if exists set_work_proposals_updated_at on public.work_proposals;
create trigger set_work_proposals_updated_at before update on public.work_proposals
for each row execute function public.set_updated_at();

create table if not exists public.work_engagements (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id text not null,
  mode text not null default 'hybrid',
  fulfillment_kind text not null default 'hybrid',
  buyer_id uuid not null references public.users(id) on delete cascade,
  buyer_persona_id uuid references public.personas(id) on delete set null,
  provider_id uuid references public.users(id) on delete set null,
  provider_persona_id uuid references public.personas(id) on delete set null,
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
create index if not exists idx_work_engagements_buyer on public.work_engagements(buyer_id, created_at desc);
create index if not exists idx_work_engagements_provider on public.work_engagements(provider_id, created_at desc);
create index if not exists idx_work_engagements_source on public.work_engagements(source_type, source_id);
drop trigger if exists set_work_engagements_updated_at on public.work_engagements;
create trigger set_work_engagements_updated_at before update on public.work_engagements
for each row execute function public.set_updated_at();

create table if not exists public.work_contracts (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references public.work_proposals(id) on delete set null,
  request_id uuid references public.work_requests(id) on delete set null,
  listing_id uuid references public.work_listings(id) on delete set null,
  engagement_id uuid references public.work_engagements(id) on delete set null,
  client_id uuid not null references public.users(id) on delete cascade,
  client_persona_id uuid references public.personas(id) on delete set null,
  client_snapshot jsonb not null default '{}'::jsonb,
  provider_id uuid not null references public.users(id) on delete cascade,
  provider_persona_id uuid references public.personas(id) on delete set null,
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
create index if not exists idx_work_contracts_provider on public.work_contracts(provider_id, created_at desc);
create index if not exists idx_work_contracts_client on public.work_contracts(client_id, created_at desc);
create index if not exists idx_work_contracts_status on public.work_contracts(status, created_at desc);
drop trigger if exists set_work_contracts_updated_at on public.work_contracts;
create trigger set_work_contracts_updated_at before update on public.work_contracts
for each row execute function public.set_updated_at();

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
create index if not exists idx_work_milestones_contract on public.work_milestones(contract_id, sort_order);
drop trigger if exists set_work_milestones_updated_at on public.work_milestones;
create trigger set_work_milestones_updated_at before update on public.work_milestones
for each row execute function public.set_updated_at();

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
create index if not exists idx_work_escrow_ledger_engagement on public.work_escrow_ledger(engagement_id, created_at desc);

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
create index if not exists idx_work_disputes_engagement on public.work_disputes(engagement_id, created_at desc);
drop trigger if exists set_work_disputes_updated_at on public.work_disputes;
create trigger set_work_disputes_updated_at before update on public.work_disputes
for each row execute function public.set_updated_at();

create table if not exists public.work_reputation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  persona_id uuid references public.personas(id) on delete set null,
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
create index if not exists idx_work_reputation_user on public.work_reputation(user_id, updated_at desc);
drop trigger if exists set_work_reputation_updated_at on public.work_reputation;
create trigger set_work_reputation_updated_at before update on public.work_reputation
for each row execute function public.set_updated_at();

create table if not exists public.work_autopilot_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null,
  actor_user_id uuid references public.users(id) on delete set null,
  actor_persona_id uuid references public.personas(id) on delete set null,
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
create index if not exists idx_work_autopilot_runs_type on public.work_autopilot_runs(run_type, created_at desc);

alter table public.work_listings enable row level security;
alter table public.work_requests enable row level security;
alter table public.work_proposals enable row level security;
alter table public.work_contracts enable row level security;
alter table public.work_milestones enable row level security;
alter table public.work_engagements enable row level security;
alter table public.work_escrow_ledger enable row level security;
alter table public.work_disputes enable row level security;
alter table public.work_reputation enable row level security;
alter table public.work_autopilot_runs enable row level security;

drop policy if exists "service_role_all_work_listings" on public.work_listings;
create policy "service_role_all_work_listings" on public.work_listings for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_work_requests" on public.work_requests;
create policy "service_role_all_work_requests" on public.work_requests for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_work_proposals" on public.work_proposals;
create policy "service_role_all_work_proposals" on public.work_proposals for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_work_contracts" on public.work_contracts;
create policy "service_role_all_work_contracts" on public.work_contracts for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_work_milestones" on public.work_milestones;
create policy "service_role_all_work_milestones" on public.work_milestones for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_work_engagements" on public.work_engagements;
create policy "service_role_all_work_engagements" on public.work_engagements for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_work_escrow_ledger" on public.work_escrow_ledger;
create policy "service_role_all_work_escrow_ledger" on public.work_escrow_ledger for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_work_disputes" on public.work_disputes;
create policy "service_role_all_work_disputes" on public.work_disputes for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_work_reputation" on public.work_reputation;
create policy "service_role_all_work_reputation" on public.work_reputation for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_work_autopilot_runs" on public.work_autopilot_runs;
create policy "service_role_all_work_autopilot_runs" on public.work_autopilot_runs for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "work_listings_public_read" on public.work_listings;
create policy "work_listings_public_read" on public.work_listings for select using (
  status = 'published' and visibility = 'public'
);
drop policy if exists "work_listings_owner" on public.work_listings;
create policy "work_listings_owner" on public.work_listings for all using (
  public.is_service_role() or seller_id = auth.uid()
) with check (
  public.is_service_role() or seller_id = auth.uid()
);
