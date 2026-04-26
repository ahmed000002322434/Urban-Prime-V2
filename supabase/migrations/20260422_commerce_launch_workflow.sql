-- Launch workflow: canonical rentals + auctions + disputes

create table if not exists public.rental_bookings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  buyer_id uuid not null references public.users(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  delivery_mode text not null check (delivery_mode in ('pickup', 'shipping')),
  pickup_instructions text,
  pickup_code text,
  pickup_window_start timestamptz,
  pickup_window_end timestamptz,
  rental_start timestamptz not null,
  rental_end timestamptz not null,
  status text not null default 'pending_confirmation' check (
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
  ),
  security_deposit_amount numeric(12,2) not null default 0,
  security_deposit_status text not null default 'not_applicable' check (
    security_deposit_status in ('not_applicable', 'held', 'released', 'claimed')
  ),
  claim_amount numeric(12,2) not null default 0,
  claim_reason text,
  claim_evidence_url text,
  tracking_number text,
  return_tracking_number text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, order_item_id),
  constraint rental_window_valid check (rental_end > rental_start)
);

create index if not exists idx_rental_bookings_buyer on public.rental_bookings(buyer_id, created_at desc);
create index if not exists idx_rental_bookings_seller on public.rental_bookings(seller_id, created_at desc);
create index if not exists idx_rental_bookings_item_window on public.rental_bookings(item_id, rental_start, rental_end);
create index if not exists idx_rental_bookings_status on public.rental_bookings(status, created_at desc);
drop trigger if exists set_rental_bookings_updated_at on public.rental_bookings;
create trigger set_rental_bookings_updated_at before update on public.rental_bookings
for each row execute function public.set_updated_at();

create table if not exists public.rental_blocks (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  rental_booking_id uuid references public.rental_bookings(id) on delete set null,
  block_start timestamptz not null,
  block_end timestamptz not null,
  block_type text not null default 'manual_blackout' check (
    block_type in ('manual_blackout', 'maintenance', 'booking_hold', 'admin_override')
  ),
  status text not null default 'active' check (status in ('active', 'released', 'cancelled')),
  reason text,
  created_by uuid references public.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rental_block_window_valid check (block_end > block_start)
);

create index if not exists idx_rental_blocks_item_status on public.rental_blocks(item_id, status, block_start, block_end);
create index if not exists idx_rental_blocks_booking on public.rental_blocks(rental_booking_id);
drop trigger if exists set_rental_blocks_updated_at on public.rental_blocks;
create trigger set_rental_blocks_updated_at before update on public.rental_blocks
for each row execute function public.set_updated_at();

create table if not exists public.auction_bids (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  bidder_id uuid not null references public.users(id) on delete cascade,
  bidder_persona_id uuid references public.personas(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'placed' check (
    status in ('placed', 'accepted', 'declined', 'countered', 'counter_offer', 'outbid', 'invalidated', 'winner', 'withdrawn')
  ),
  placed_at timestamptz not null default now(),
  source_thread_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_auction_bids_item_placed on public.auction_bids(item_id, placed_at desc);
create index if not exists idx_auction_bids_item_amount on public.auction_bids(item_id, amount desc, placed_at desc);
create index if not exists idx_auction_bids_bidder on public.auction_bids(bidder_id, placed_at desc);
drop trigger if exists set_auction_bids_updated_at on public.auction_bids;
create trigger set_auction_bids_updated_at before update on public.auction_bids
for each row execute function public.set_updated_at();

create table if not exists public.auction_sessions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.items(id) on delete cascade,
  status text not null default 'live' check (
    status in ('draft', 'live', 'winner_pending_payment', 'sold', 'closed', 'closed_no_sale', 'cancelled')
  ),
  highest_bid_id uuid references public.auction_bids(id) on delete set null,
  winner_id uuid references public.users(id) on delete set null,
  winner_checkout_expires_at timestamptz,
  reserve_met boolean not null default false,
  closed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_auction_sessions_status on public.auction_sessions(status, updated_at desc);
create index if not exists idx_auction_sessions_winner_expiry on public.auction_sessions(winner_checkout_expires_at);
drop trigger if exists set_auction_sessions_updated_at on public.auction_sessions;
create trigger set_auction_sessions_updated_at before update on public.auction_sessions
for each row execute function public.set_updated_at();

create table if not exists public.commerce_disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  rental_booking_id uuid references public.rental_bookings(id) on delete set null,
  opened_by uuid not null references public.users(id) on delete cascade,
  reason_code text not null,
  details text,
  status text not null default 'open' check (
    status in ('open', 'under_review', 'awaiting_response', 'resolved', 'rejected', 'closed')
  ),
  resolution text,
  admin_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_commerce_disputes_order on public.commerce_disputes(order_id, created_at desc);
create index if not exists idx_commerce_disputes_rental on public.commerce_disputes(rental_booking_id, created_at desc);
create index if not exists idx_commerce_disputes_status on public.commerce_disputes(status, created_at desc);
create index if not exists idx_commerce_disputes_opened_by on public.commerce_disputes(opened_by, created_at desc);
drop trigger if exists set_commerce_disputes_updated_at on public.commerce_disputes;
create trigger set_commerce_disputes_updated_at before update on public.commerce_disputes
for each row execute function public.set_updated_at();

create index if not exists idx_payments_metadata_deposit_status on public.payments((metadata->>'deposit_status'));
create index if not exists idx_payments_metadata_payout_ref on public.payments((metadata->>'payout_settlement_ref'));

alter table public.rental_bookings enable row level security;
alter table public.rental_blocks enable row level security;
alter table public.auction_bids enable row level security;
alter table public.auction_sessions enable row level security;
alter table public.commerce_disputes enable row level security;

drop policy if exists "service_role_all_rental_bookings" on public.rental_bookings;
create policy "service_role_all_rental_bookings" on public.rental_bookings for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "service_role_all_rental_blocks" on public.rental_blocks;
create policy "service_role_all_rental_blocks" on public.rental_blocks for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "service_role_all_auction_bids" on public.auction_bids;
create policy "service_role_all_auction_bids" on public.auction_bids for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "service_role_all_auction_sessions" on public.auction_sessions;
create policy "service_role_all_auction_sessions" on public.auction_sessions for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "service_role_all_commerce_disputes" on public.commerce_disputes;
create policy "service_role_all_commerce_disputes" on public.commerce_disputes for all using (public.is_service_role()) with check (public.is_service_role());
