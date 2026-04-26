-- Commerce launch workflow repair / completion
-- Safe to run after 20260422_commerce_launch_workflow.sql, even if that migration only partially applied.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.is_service_role()
returns boolean as $$
  select auth.role() = 'service_role';
$$ language sql stable;

do $$ begin
  alter type public.listing_type add value if not exists 'both';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.listing_type add value if not exists 'auction';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.listing_status add value if not exists 'sold';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.notification_type add value if not exists 'dispute';
exception when duplicate_object then null;
end $$;

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, idempotency_key)
);

create index if not exists idx_webhook_events_provider_created
  on public.webhook_events(provider, created_at desc);

alter table public.webhook_events enable row level security;
drop policy if exists "service_role_all_webhook_events" on public.webhook_events;
create policy "service_role_all_webhook_events"
  on public.webhook_events
  for all
  using (public.is_service_role())
  with check (public.is_service_role());

create table if not exists public.rental_bookings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  buyer_id uuid not null references public.users(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  delivery_mode text not null,
  pickup_instructions text,
  pickup_code text,
  pickup_window_start timestamptz,
  pickup_window_end timestamptz,
  rental_start timestamptz not null,
  rental_end timestamptz not null,
  status text not null default 'pending_confirmation',
  security_deposit_amount numeric(12,2) not null default 0,
  security_deposit_status text not null default 'not_applicable',
  claim_amount numeric(12,2) not null default 0,
  claim_reason text,
  claim_evidence_url text,
  tracking_number text,
  return_tracking_number text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rental_bookings add column if not exists order_id uuid references public.orders(id) on delete cascade;
alter table public.rental_bookings add column if not exists order_item_id uuid references public.order_items(id) on delete cascade;
alter table public.rental_bookings add column if not exists item_id uuid references public.items(id) on delete cascade;
alter table public.rental_bookings add column if not exists buyer_id uuid references public.users(id) on delete cascade;
alter table public.rental_bookings add column if not exists seller_id uuid references public.users(id) on delete cascade;
alter table public.rental_bookings add column if not exists delivery_mode text;
alter table public.rental_bookings add column if not exists pickup_instructions text;
alter table public.rental_bookings add column if not exists pickup_code text;
alter table public.rental_bookings add column if not exists pickup_window_start timestamptz;
alter table public.rental_bookings add column if not exists pickup_window_end timestamptz;
alter table public.rental_bookings add column if not exists rental_start timestamptz;
alter table public.rental_bookings add column if not exists rental_end timestamptz;
alter table public.rental_bookings add column if not exists status text;
alter table public.rental_bookings add column if not exists security_deposit_amount numeric(12,2) not null default 0;
alter table public.rental_bookings add column if not exists security_deposit_status text not null default 'not_applicable';
alter table public.rental_bookings add column if not exists claim_amount numeric(12,2) not null default 0;
alter table public.rental_bookings add column if not exists claim_reason text;
alter table public.rental_bookings add column if not exists claim_evidence_url text;
alter table public.rental_bookings add column if not exists tracking_number text;
alter table public.rental_bookings add column if not exists return_tracking_number text;
alter table public.rental_bookings add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.rental_bookings add column if not exists created_at timestamptz not null default now();
alter table public.rental_bookings add column if not exists updated_at timestamptz not null default now();

update public.rental_bookings
set security_deposit_status = coalesce(nullif(security_deposit_status, ''), 'not_applicable')
where security_deposit_status is null or security_deposit_status = '';

update public.rental_bookings
set status = coalesce(nullif(status, ''), 'pending_confirmation')
where status is null or status = '';

update public.rental_bookings
set delivery_mode = coalesce(nullif(delivery_mode, ''), 'shipping')
where delivery_mode is null or delivery_mode = '';

alter table public.rental_bookings
  alter column status set default 'pending_confirmation';
alter table public.rental_bookings
  alter column security_deposit_status set default 'not_applicable';
alter table public.rental_bookings
  alter column metadata set default '{}'::jsonb;

alter table if exists public.rental_bookings drop constraint if exists rental_bookings_delivery_mode_check;
alter table if exists public.rental_bookings drop constraint if exists rental_bookings_status_check;
alter table if exists public.rental_bookings drop constraint if exists rental_bookings_security_deposit_status_check;
alter table if exists public.rental_bookings drop constraint if exists rental_window_valid;

alter table public.rental_bookings
  add constraint rental_bookings_delivery_mode_check
  check (delivery_mode in ('pickup', 'shipping'));

alter table public.rental_bookings
  add constraint rental_bookings_status_check
  check (
    status in (
      'pending_confirmation',
      'confirmed',
      'ready_for_handoff',
      'in_transit',
      'active',
      'return_in_transit',
      'returned',
      'completed',
      'cancelled'
    )
  );

alter table public.rental_bookings
  add constraint rental_bookings_security_deposit_status_check
  check (security_deposit_status in ('not_applicable', 'held', 'released', 'claimed'));

alter table public.rental_bookings
  add constraint rental_window_valid
  check (rental_end > rental_start);

create unique index if not exists idx_rental_bookings_order_item_unique
  on public.rental_bookings(order_id, order_item_id);
create index if not exists idx_rental_bookings_buyer
  on public.rental_bookings(buyer_id, created_at desc);
create index if not exists idx_rental_bookings_seller
  on public.rental_bookings(seller_id, created_at desc);
create index if not exists idx_rental_bookings_item_window
  on public.rental_bookings(item_id, rental_start, rental_end);
create index if not exists idx_rental_bookings_status
  on public.rental_bookings(status, created_at desc);

drop trigger if exists set_rental_bookings_updated_at on public.rental_bookings;
create trigger set_rental_bookings_updated_at
before update on public.rental_bookings
for each row execute function public.set_updated_at();

create table if not exists public.rental_blocks (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  rental_booking_id uuid references public.rental_bookings(id) on delete set null,
  block_start timestamptz not null,
  block_end timestamptz not null,
  block_type text not null default 'manual_blackout',
  status text not null default 'active',
  reason text,
  created_by uuid references public.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rental_blocks add column if not exists item_id uuid references public.items(id) on delete cascade;
alter table public.rental_blocks add column if not exists rental_booking_id uuid references public.rental_bookings(id) on delete set null;
alter table public.rental_blocks add column if not exists block_start timestamptz;
alter table public.rental_blocks add column if not exists block_end timestamptz;
alter table public.rental_blocks add column if not exists block_type text;
alter table public.rental_blocks add column if not exists status text;
alter table public.rental_blocks add column if not exists reason text;
alter table public.rental_blocks add column if not exists created_by uuid references public.users(id) on delete set null;
alter table public.rental_blocks add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.rental_blocks add column if not exists created_at timestamptz not null default now();
alter table public.rental_blocks add column if not exists updated_at timestamptz not null default now();

update public.rental_blocks
set status = coalesce(nullif(status, ''), 'active')
where status is null or status = '';

update public.rental_blocks
set block_type = coalesce(nullif(block_type, ''), 'manual_blackout')
where block_type is null or block_type = '';

alter table public.rental_blocks
  alter column block_type set default 'manual_blackout';
alter table public.rental_blocks
  alter column status set default 'active';
alter table public.rental_blocks
  alter column metadata set default '{}'::jsonb;

alter table if exists public.rental_blocks drop constraint if exists rental_blocks_block_type_check;
alter table if exists public.rental_blocks drop constraint if exists rental_blocks_status_check;
alter table if exists public.rental_blocks drop constraint if exists rental_block_window_valid;

alter table public.rental_blocks
  add constraint rental_blocks_block_type_check
  check (block_type in ('manual_blackout', 'maintenance', 'booking_hold', 'admin_override'));

alter table public.rental_blocks
  add constraint rental_blocks_status_check
  check (status in ('active', 'released', 'cancelled'));

alter table public.rental_blocks
  add constraint rental_block_window_valid
  check (block_end > block_start);

create index if not exists idx_rental_blocks_item_status
  on public.rental_blocks(item_id, status, block_start, block_end);
create index if not exists idx_rental_blocks_booking
  on public.rental_blocks(rental_booking_id);

drop trigger if exists set_rental_blocks_updated_at on public.rental_blocks;
create trigger set_rental_blocks_updated_at
before update on public.rental_blocks
for each row execute function public.set_updated_at();

create table if not exists public.auction_bids (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  bidder_id uuid not null references public.users(id) on delete cascade,
  bidder_persona_id uuid references public.personas(id) on delete set null,
  amount numeric(12,2) not null,
  status text not null default 'placed',
  placed_at timestamptz not null default now(),
  source_thread_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.auction_bids add column if not exists item_id uuid references public.items(id) on delete cascade;
alter table public.auction_bids add column if not exists bidder_id uuid references public.users(id) on delete cascade;
alter table public.auction_bids add column if not exists bidder_persona_id uuid references public.personas(id) on delete set null;
alter table public.auction_bids add column if not exists amount numeric(12,2) not null default 0;
alter table public.auction_bids add column if not exists status text;
alter table public.auction_bids add column if not exists placed_at timestamptz not null default now();
alter table public.auction_bids add column if not exists source_thread_id text;
alter table public.auction_bids add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.auction_bids add column if not exists created_at timestamptz not null default now();
alter table public.auction_bids add column if not exists updated_at timestamptz not null default now();

update public.auction_bids
set status = coalesce(nullif(status, ''), 'placed')
where status is null or status = '';

alter table public.auction_bids
  alter column status set default 'placed';
alter table public.auction_bids
  alter column metadata set default '{}'::jsonb;

alter table if exists public.auction_bids drop constraint if exists auction_bids_amount_check;
alter table if exists public.auction_bids drop constraint if exists auction_bids_status_check;

alter table public.auction_bids
  add constraint auction_bids_amount_check
  check (amount > 0);

alter table public.auction_bids
  add constraint auction_bids_status_check
  check (
    status in (
      'placed',
      'accepted',
      'declined',
      'countered',
      'counter_offer',
      'counter_accepted',
      'counter_declined',
      'outbid',
      'invalidated',
      'winner',
      'withdrawn',
      'payment_expired'
    )
  );

create index if not exists idx_auction_bids_item_placed
  on public.auction_bids(item_id, placed_at desc);
create index if not exists idx_auction_bids_item_amount
  on public.auction_bids(item_id, amount desc, placed_at desc);
create index if not exists idx_auction_bids_bidder
  on public.auction_bids(bidder_id, placed_at desc);

drop trigger if exists set_auction_bids_updated_at on public.auction_bids;
create trigger set_auction_bids_updated_at
before update on public.auction_bids
for each row execute function public.set_updated_at();

create table if not exists public.auction_sessions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  status text not null default 'live',
  highest_bid_id uuid references public.auction_bids(id) on delete set null,
  winner_id uuid references public.users(id) on delete set null,
  winner_checkout_expires_at timestamptz,
  reserve_met boolean not null default false,
  closed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.auction_sessions add column if not exists item_id uuid references public.items(id) on delete cascade;
alter table public.auction_sessions add column if not exists status text;
alter table public.auction_sessions add column if not exists highest_bid_id uuid references public.auction_bids(id) on delete set null;
alter table public.auction_sessions add column if not exists winner_id uuid references public.users(id) on delete set null;
alter table public.auction_sessions add column if not exists winner_checkout_expires_at timestamptz;
alter table public.auction_sessions add column if not exists reserve_met boolean not null default false;
alter table public.auction_sessions add column if not exists closed_at timestamptz;
alter table public.auction_sessions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.auction_sessions add column if not exists created_at timestamptz not null default now();
alter table public.auction_sessions add column if not exists updated_at timestamptz not null default now();

update public.auction_sessions
set status = coalesce(nullif(status, ''), 'live')
where status is null or status = '';

alter table public.auction_sessions
  alter column status set default 'live';
alter table public.auction_sessions
  alter column reserve_met set default false;
alter table public.auction_sessions
  alter column metadata set default '{}'::jsonb;

alter table if exists public.auction_sessions drop constraint if exists auction_sessions_status_check;

alter table public.auction_sessions
  add constraint auction_sessions_status_check
  check (
    status in (
      'draft',
      'live',
      'winner_pending_payment',
      'sold',
      'closed',
      'closed_no_sale',
      'cancelled'
    )
  );

create unique index if not exists idx_auction_sessions_item_unique
  on public.auction_sessions(item_id);
create index if not exists idx_auction_sessions_status
  on public.auction_sessions(status, updated_at desc);
create index if not exists idx_auction_sessions_winner_expiry
  on public.auction_sessions(winner_checkout_expires_at);

drop trigger if exists set_auction_sessions_updated_at on public.auction_sessions;
create trigger set_auction_sessions_updated_at
before update on public.auction_sessions
for each row execute function public.set_updated_at();

create table if not exists public.commerce_disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  rental_booking_id uuid references public.rental_bookings(id) on delete set null,
  opened_by uuid not null references public.users(id) on delete cascade,
  reason_code text not null,
  details text,
  status text not null default 'open',
  resolution text,
  admin_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.commerce_disputes add column if not exists order_id uuid references public.orders(id) on delete cascade;
alter table public.commerce_disputes add column if not exists order_item_id uuid references public.order_items(id) on delete set null;
alter table public.commerce_disputes add column if not exists rental_booking_id uuid references public.rental_bookings(id) on delete set null;
alter table public.commerce_disputes add column if not exists opened_by uuid references public.users(id) on delete cascade;
alter table public.commerce_disputes add column if not exists reason_code text;
alter table public.commerce_disputes add column if not exists details text;
alter table public.commerce_disputes add column if not exists status text;
alter table public.commerce_disputes add column if not exists resolution text;
alter table public.commerce_disputes add column if not exists admin_notes text;
alter table public.commerce_disputes add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.commerce_disputes add column if not exists created_at timestamptz not null default now();
alter table public.commerce_disputes add column if not exists updated_at timestamptz not null default now();

update public.commerce_disputes
set status = coalesce(nullif(status, ''), 'open')
where status is null or status = '';

alter table public.commerce_disputes
  alter column status set default 'open';
alter table public.commerce_disputes
  alter column metadata set default '{}'::jsonb;

alter table if exists public.commerce_disputes drop constraint if exists commerce_disputes_status_check;

alter table public.commerce_disputes
  add constraint commerce_disputes_status_check
  check (status in ('open', 'under_review', 'awaiting_response', 'resolved', 'rejected', 'closed'));

create index if not exists idx_commerce_disputes_order
  on public.commerce_disputes(order_id, created_at desc);
create index if not exists idx_commerce_disputes_rental
  on public.commerce_disputes(rental_booking_id, created_at desc);
create index if not exists idx_commerce_disputes_status
  on public.commerce_disputes(status, created_at desc);
create index if not exists idx_commerce_disputes_opened_by
  on public.commerce_disputes(opened_by, created_at desc);

drop trigger if exists set_commerce_disputes_updated_at on public.commerce_disputes;
create trigger set_commerce_disputes_updated_at
before update on public.commerce_disputes
for each row execute function public.set_updated_at();

create index if not exists idx_payments_metadata_deposit_status
  on public.payments((metadata->>'deposit_status'));
create index if not exists idx_payments_metadata_payout_ref
  on public.payments((metadata->>'payout_settlement_ref'));

alter table public.rental_bookings enable row level security;
alter table public.rental_blocks enable row level security;
alter table public.auction_bids enable row level security;
alter table public.auction_sessions enable row level security;
alter table public.commerce_disputes enable row level security;

drop policy if exists "service_role_all_rental_bookings" on public.rental_bookings;
create policy "service_role_all_rental_bookings"
  on public.rental_bookings
  for all
  using (public.is_service_role())
  with check (public.is_service_role());

drop policy if exists "service_role_all_rental_blocks" on public.rental_blocks;
create policy "service_role_all_rental_blocks"
  on public.rental_blocks
  for all
  using (public.is_service_role())
  with check (public.is_service_role());

drop policy if exists "service_role_all_auction_bids" on public.auction_bids;
create policy "service_role_all_auction_bids"
  on public.auction_bids
  for all
  using (public.is_service_role())
  with check (public.is_service_role());

drop policy if exists "service_role_all_auction_sessions" on public.auction_sessions;
create policy "service_role_all_auction_sessions"
  on public.auction_sessions
  for all
  using (public.is_service_role())
  with check (public.is_service_role());

drop policy if exists "service_role_all_commerce_disputes" on public.commerce_disputes;
create policy "service_role_all_commerce_disputes"
  on public.commerce_disputes
  for all
  using (public.is_service_role())
  with check (public.is_service_role());

notify pgrst, 'reload schema';

select
  to_regclass('public.rental_bookings') as rental_bookings,
  to_regclass('public.rental_blocks') as rental_blocks,
  to_regclass('public.auction_bids') as auction_bids,
  to_regclass('public.auction_sessions') as auction_sessions,
  to_regclass('public.commerce_disputes') as commerce_disputes,
  to_regclass('public.webhook_events') as webhook_events;
