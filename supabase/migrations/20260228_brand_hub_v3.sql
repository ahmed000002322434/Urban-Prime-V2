-- Urban Prime Brand Hub v3

-- Brand core
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  normalized_name text not null,
  logo_url text,
  cover_url text,
  description text,
  story jsonb not null default '{}'::jsonb,
  website text,
  country text,
  status text not null default 'active',
  verification_level text not null default 'community',
  claimed_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_brands_normalized_name on public.brands(normalized_name);
create index if not exists idx_brands_status on public.brands(status);
create index if not exists idx_brands_claimed_by on public.brands(claimed_by_user_id);

drop trigger if exists set_brands_updated_at on public.brands;
create trigger set_brands_updated_at before update on public.brands
for each row execute function public.set_updated_at();

create table if not exists public.brand_aliases (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  source text not null default 'system',
  confidence numeric(5,4) not null default 1,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_brand_aliases_unique on public.brand_aliases(brand_id, normalized_alias);
create index if not exists idx_brand_aliases_lookup on public.brand_aliases(normalized_alias);

-- Unlimited catalog graph
create table if not exists public.brand_catalog_nodes (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  parent_node_id uuid references public.brand_catalog_nodes(id) on delete cascade,
  name text not null,
  slug text not null,
  normalized_name text not null,
  node_type text not null default 'line',
  depth integer not null default 0,
  path text not null,
  sort_order integer not null default 0,
  status text not null default 'active',
  source text not null default 'template',
  created_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_brand_catalog_nodes_path_unique on public.brand_catalog_nodes(brand_id, path);
create unique index if not exists idx_brand_catalog_nodes_name_unique on public.brand_catalog_nodes(brand_id, parent_node_id, normalized_name);
create index if not exists idx_brand_catalog_nodes_brand on public.brand_catalog_nodes(brand_id, depth, sort_order);
create index if not exists idx_brand_catalog_nodes_parent on public.brand_catalog_nodes(parent_node_id);
create index if not exists idx_brand_catalog_nodes_slug on public.brand_catalog_nodes(brand_id, slug);

create or replace function public.brand_catalog_nodes_set_path_depth()
returns trigger as $$
declare
  parent_path text;
  parent_depth integer;
  safe_slug text;
begin
  safe_slug := lower(regexp_replace(coalesce(new.slug, ''), '[^a-z0-9]+', '-', 'g'));
  safe_slug := trim(both '-' from safe_slug);

  if safe_slug = '' then
    safe_slug := lower(regexp_replace(coalesce(new.name, ''), '[^a-z0-9]+', '-', 'g'));
    safe_slug := trim(both '-' from safe_slug);
  end if;

  if safe_slug = '' then
    safe_slug := 'node';
  end if;

  new.slug := safe_slug;

  if new.parent_node_id is null then
    new.depth := 0;
    new.path := safe_slug;
    return new;
  end if;

  select path, depth into parent_path, parent_depth
  from public.brand_catalog_nodes
  where id = new.parent_node_id and brand_id = new.brand_id;

  if parent_path is null then
    raise exception 'Parent node must exist in same brand tree';
  end if;

  if tg_op = 'UPDATE' then
    if new.id = new.parent_node_id then
      raise exception 'Node cannot be its own parent';
    end if;

    if old.path is not null and parent_path like old.path || '/%' then
      raise exception 'Cycle detected in brand catalog tree';
    end if;
  end if;

  new.depth := coalesce(parent_depth, -1) + 1;
  new.path := parent_path || '/' || safe_slug;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_brand_catalog_nodes_path_depth on public.brand_catalog_nodes;
create trigger set_brand_catalog_nodes_path_depth
before insert or update of brand_id, parent_node_id, slug, name
on public.brand_catalog_nodes
for each row execute function public.brand_catalog_nodes_set_path_depth();

drop trigger if exists set_brand_catalog_nodes_updated_at on public.brand_catalog_nodes;
create trigger set_brand_catalog_nodes_updated_at before update on public.brand_catalog_nodes
for each row execute function public.set_updated_at();

create table if not exists public.brand_catalog_aliases (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  node_id uuid not null references public.brand_catalog_nodes(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  source text not null default 'system',
  confidence numeric(5,4) not null default 1,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_brand_catalog_aliases_unique on public.brand_catalog_aliases(brand_id, normalized_alias);
create index if not exists idx_brand_catalog_aliases_node on public.brand_catalog_aliases(node_id);

-- Classification queues
create table if not exists public.brand_match_queue (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  raw_brand text,
  normalized_brand text,
  proposed_brand_id uuid references public.brands(id) on delete set null,
  confidence numeric(5,4) not null default 0,
  status text not null default 'pending',
  reason text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_brand_match_queue_status on public.brand_match_queue(status, created_at desc);
create index if not exists idx_brand_match_queue_item on public.brand_match_queue(item_id);

create table if not exists public.brand_catalog_match_queue (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  raw_path text,
  normalized_path text,
  proposed_node_id uuid references public.brand_catalog_nodes(id) on delete set null,
  confidence numeric(5,4) not null default 0,
  status text not null default 'pending',
  reason text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_brand_catalog_match_queue_status on public.brand_catalog_match_queue(status, created_at desc);
create index if not exists idx_brand_catalog_match_queue_item on public.brand_catalog_match_queue(item_id);

-- Governance + follows
create table if not exists public.brand_claim_requests (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  requester_user_id uuid not null references public.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_brand_claim_requests_status on public.brand_claim_requests(status, created_at desc);
create index if not exists idx_brand_claim_requests_brand on public.brand_claim_requests(brand_id);


drop trigger if exists set_brand_claim_requests_updated_at on public.brand_claim_requests;
create trigger set_brand_claim_requests_updated_at before update on public.brand_claim_requests
for each row execute function public.set_updated_at();

create table if not exists public.brand_followers (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (brand_id, user_id)
);
create index if not exists idx_brand_followers_user on public.brand_followers(user_id);

create table if not exists public.brand_catalog_followers (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  node_id uuid not null references public.brand_catalog_nodes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (node_id, user_id)
);
create index if not exists idx_brand_catalog_followers_user on public.brand_catalog_followers(user_id);

-- Pricing + trust intelligence
create table if not exists public.brand_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  price numeric(12,2) not null,
  currency text not null default 'USD',
  captured_at timestamptz not null default now()
);
create index if not exists idx_brand_price_snapshots_brand on public.brand_price_snapshots(brand_id, captured_at desc);
create index if not exists idx_brand_price_snapshots_item on public.brand_price_snapshots(item_id);

create table if not exists public.brand_catalog_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.brand_catalog_nodes(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  price numeric(12,2) not null,
  currency text not null default 'USD',
  captured_at timestamptz not null default now()
);
create index if not exists idx_brand_catalog_price_snapshots_node on public.brand_catalog_price_snapshots(node_id, captured_at desc);

create table if not exists public.brand_trust_signals (
  brand_id uuid primary key references public.brands(id) on delete cascade,
  authenticity_risk_score numeric(5,2) not null default 0,
  price_integrity_score numeric(5,2) not null default 0,
  seller_quality_score numeric(5,2) not null default 0,
  overall_trust_score numeric(5,2) not null default 0,
  explainability jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_catalog_trust_signals (
  node_id uuid primary key references public.brand_catalog_nodes(id) on delete cascade,
  authenticity_risk_score numeric(5,2) not null default 0,
  price_integrity_score numeric(5,2) not null default 0,
  seller_quality_score numeric(5,2) not null default 0,
  overall_trust_score numeric(5,2) not null default 0,
  explainability jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Items brand linkage
alter table public.items add column if not exists brand_id uuid references public.brands(id) on delete set null;
alter table public.items add column if not exists brand_catalog_node_id uuid references public.brand_catalog_nodes(id) on delete set null;
alter table public.items add column if not exists brand_match_confidence numeric(5,4);
alter table public.items add column if not exists brand_catalog_match_confidence numeric(5,4);
alter table public.items add column if not exists brand_match_source text;
create index if not exists idx_items_brand_id on public.items(brand_id);
create index if not exists idx_items_brand_catalog_node_id on public.items(brand_catalog_node_id);

-- RLS
alter table public.brands enable row level security;
alter table public.brand_aliases enable row level security;
alter table public.brand_catalog_nodes enable row level security;
alter table public.brand_catalog_aliases enable row level security;
alter table public.brand_match_queue enable row level security;
alter table public.brand_catalog_match_queue enable row level security;
alter table public.brand_claim_requests enable row level security;
alter table public.brand_followers enable row level security;
alter table public.brand_catalog_followers enable row level security;
alter table public.brand_price_snapshots enable row level security;
alter table public.brand_catalog_price_snapshots enable row level security;
alter table public.brand_trust_signals enable row level security;
alter table public.brand_catalog_trust_signals enable row level security;

-- Public read

drop policy if exists "brands_public_read" on public.brands;
create policy "brands_public_read" on public.brands for select using (status = 'active');

drop policy if exists "brand_catalog_nodes_public_read" on public.brand_catalog_nodes;
create policy "brand_catalog_nodes_public_read" on public.brand_catalog_nodes for select using (status = 'active');

drop policy if exists "brand_trust_public_read" on public.brand_trust_signals;
create policy "brand_trust_public_read" on public.brand_trust_signals for select using (true);

drop policy if exists "brand_catalog_trust_public_read" on public.brand_catalog_trust_signals;
create policy "brand_catalog_trust_public_read" on public.brand_catalog_trust_signals for select using (true);

-- Service role full access

drop policy if exists "service_role_all_brands" on public.brands;
create policy "service_role_all_brands" on public.brands for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "service_role_all_brand_aliases" on public.brand_aliases;
create policy "service_role_all_brand_aliases" on public.brand_aliases for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "service_role_all_brand_catalog_nodes" on public.brand_catalog_nodes;
create policy "service_role_all_brand_catalog_nodes" on public.brand_catalog_nodes for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "service_role_all_brand_catalog_aliases" on public.brand_catalog_aliases;
create policy "service_role_all_brand_catalog_aliases" on public.brand_catalog_aliases for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "service_role_all_brand_match_queue" on public.brand_match_queue;
create policy "service_role_all_brand_match_queue" on public.brand_match_queue for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "service_role_all_brand_catalog_match_queue" on public.brand_catalog_match_queue;
create policy "service_role_all_brand_catalog_match_queue" on public.brand_catalog_match_queue for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "service_role_all_brand_claim_requests" on public.brand_claim_requests;
create policy "service_role_all_brand_claim_requests" on public.brand_claim_requests for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "service_role_all_brand_followers" on public.brand_followers;
create policy "service_role_all_brand_followers" on public.brand_followers for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "service_role_all_brand_catalog_followers" on public.brand_catalog_followers;
create policy "service_role_all_brand_catalog_followers" on public.brand_catalog_followers for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "service_role_all_brand_price_snapshots" on public.brand_price_snapshots;
create policy "service_role_all_brand_price_snapshots" on public.brand_price_snapshots for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "service_role_all_brand_catalog_price_snapshots" on public.brand_catalog_price_snapshots;
create policy "service_role_all_brand_catalog_price_snapshots" on public.brand_catalog_price_snapshots for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "service_role_all_brand_trust_signals" on public.brand_trust_signals;
create policy "service_role_all_brand_trust_signals" on public.brand_trust_signals for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "service_role_all_brand_catalog_trust_signals" on public.brand_catalog_trust_signals;
create policy "service_role_all_brand_catalog_trust_signals" on public.brand_catalog_trust_signals for all using (public.is_service_role()) with check (public.is_service_role());

-- Owner policies

drop policy if exists "brand_followers_owner" on public.brand_followers;
create policy "brand_followers_owner" on public.brand_followers for all using (
  public.is_service_role() or user_id = auth.uid()
) with check (
  public.is_service_role() or user_id = auth.uid()
);

drop policy if exists "brand_catalog_followers_owner" on public.brand_catalog_followers;
create policy "brand_catalog_followers_owner" on public.brand_catalog_followers for all using (
  public.is_service_role() or user_id = auth.uid()
) with check (
  public.is_service_role() or user_id = auth.uid()
);

drop policy if exists "brand_claim_requests_owner" on public.brand_claim_requests;
create policy "brand_claim_requests_owner" on public.brand_claim_requests for all using (
  public.is_service_role() or requester_user_id = auth.uid()
) with check (
  public.is_service_role() or requester_user_id = auth.uid()
);
