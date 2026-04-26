-- Persona analytics + realtime pipeline bootstrap
-- Safe to run on an existing Supabase project.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

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
  create type public.listing_type as enum ('sale', 'rent', 'both', 'auction');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.listing_status as enum ('draft', 'published', 'archived', 'sold');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_type as enum ('order', 'message', 'listing', 'promo', 'system', 'dispute');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payout_status as enum ('pending', 'requested', 'queued', 'processing', 'paid', 'failed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.fulfillment_status as enum ('pending', 'processing', 'picked_up', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'delayed', 'exception', 'failed_delivery', 'returned', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.affiliate_status as enum ('pending', 'active', 'suspended');
exception when duplicate_object then null;
end $$;

do $$ begin alter type public.listing_type add value if not exists 'both'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.listing_type add value if not exists 'auction'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.listing_status add value if not exists 'sold'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.notification_type add value if not exists 'dispute'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.payout_status add value if not exists 'requested'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.payout_status add value if not exists 'queued'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.fulfillment_status add value if not exists 'picked_up'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.fulfillment_status add value if not exists 'in_transit'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.fulfillment_status add value if not exists 'out_for_delivery'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.fulfillment_status add value if not exists 'delayed'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.fulfillment_status add value if not exists 'exception'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.fulfillment_status add value if not exists 'failed_delivery'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.fulfillment_status add value if not exists 'returned'; exception when duplicate_object then null; end $$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text not null unique,
  email citext unique,
  name text,
  avatar_url text,
  phone text,
  role text not null default 'user',
  status text not null default 'active',
  currency_preference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.personas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  firebase_uid text not null,
  type text not null,
  status text not null default 'active',
  display_name text not null,
  avatar_url text,
  handle text unique,
  bio text,
  capabilities jsonb not null default '{}'::jsonb,
  verification jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.persona_members (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personas(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (persona_id, user_id)
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  slug text unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  parent_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  owner_persona_id uuid references public.personas(id) on delete set null,
  store_id uuid references public.stores(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  description text,
  listing_type public.listing_type not null default 'sale',
  status public.listing_status not null default 'draft',
  condition text,
  brand text,
  tags text[] not null default '{}',
  location text,
  currency text not null default 'USD',
  sale_price numeric(12,2),
  rental_price numeric(12,2),
  stock integer not null default 0,
  views integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text,
  line1 text not null,
  line2 text,
  city text not null,
  state text,
  postal_code text,
  country text not null,
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.users(id) on delete cascade,
  buyer_persona_id uuid references public.personas(id) on delete set null,
  seller_persona_id uuid references public.personas(id) on delete set null,
  status public.order_status not null default 'pending',
  currency text not null default 'USD',
  subtotal numeric(12,2) not null default 0,
  shipping_total numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  shipping_address_id uuid references public.shipping_addresses(id) on delete set null,
  billing_address_id uuid references public.shipping_addresses(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete set null,
  seller_id uuid not null references public.users(id) on delete cascade,
  quantity integer not null default 1,
  unit_price numeric(12,2) not null default 0,
  listing_type public.listing_type not null default 'sale',
  rental_start timestamptz,
  rental_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  shipper_id uuid references public.users(id) on delete set null,
  shipper_persona_id uuid references public.personas(id) on delete set null,
  carrier text,
  tracking_number text,
  status public.fulfillment_status not null default 'pending',
  shipped_at timestamptz,
  estimated_delivery timestamptz,
  eta timestamptz,
  delivered_at timestamptz,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rental_bookings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  buyer_id uuid not null references public.users(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  delivery_mode text not null default 'shipping',
  pickup_instructions text,
  pickup_code text,
  pickup_window_start timestamptz,
  pickup_window_end timestamptz,
  rental_start timestamptz not null,
  rental_end timestamptz not null,
  status text not null default 'pending_confirmation',
  tracking_number text,
  return_tracking_number text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, order_item_id)
);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null default 'Wishlist',
  is_default boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (wishlist_id, item_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type public.notification_type not null default 'system',
  title text,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payout_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  method_type text not null,
  details jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  persona_id uuid references public.personas(id) on delete set null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  status public.payout_status not null default 'pending',
  requested_at timestamptz not null default now(),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status public.affiliate_status not null default 'pending',
  payout_method_id uuid references public.payout_methods(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references public.affiliate_profiles(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  affiliate_user_id uuid references public.users(id) on delete set null,
  affiliate_persona_id uuid references public.personas(id) on delete set null,
  item_id uuid references public.items(id) on delete set null,
  campaign_name text,
  title text,
  code text,
  short_code text,
  url text,
  status text not null default 'active',
  clicks integer not null default 0,
  click_count integer not null default 0,
  currency text not null default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_attributions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references public.affiliate_profiles(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  affiliate_user_id uuid references public.users(id) on delete set null,
  affiliate_persona_id uuid references public.personas(id) on delete set null,
  referred_user_id uuid references public.users(id) on delete set null,
  item_id uuid references public.items(id) on delete set null,
  campaign_name text,
  source text,
  channel text,
  platform text,
  clicks integer not null default 0,
  click_count integer not null default 0,
  conversions integer not null default 0,
  conversion_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_conversions (
  id uuid primary key default gen_random_uuid(),
  attribution_id uuid references public.affiliate_attributions(id) on delete cascade,
  affiliate_id uuid references public.affiliate_profiles(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  affiliate_user_id uuid references public.users(id) on delete set null,
  affiliate_persona_id uuid references public.personas(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  campaign_name text,
  code text,
  status text not null default 'approved',
  amount numeric(12,2) not null default 0,
  commission numeric(12,2) not null default 0,
  commission_amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references public.affiliate_profiles(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  affiliate_user_id uuid references public.users(id) on delete set null,
  affiliate_persona_id uuid references public.personas(id) on delete set null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  status public.payout_status not null default 'pending',
  requested_at timestamptz not null default now(),
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.moderation_flags (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items(id) on delete set null,
  reporter_id uuid references public.users(id) on delete set null,
  reason text,
  reason_code text,
  severity text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mirror_documents (
  collection text not null,
  doc_id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (collection, doc_id)
);

create table if not exists public.uploaded_assets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  owner_persona_id uuid references public.personas(id) on delete set null,
  asset_type text not null default 'generic',
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  storage_driver text not null default 'local_disk',
  storage_path text not null,
  resource_id text,
  is_public boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.work_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete cascade,
  requester_persona_id uuid references public.personas(id) on delete set null,
  requester_snapshot jsonb not null default '{}'::jsonb,
  title text not null,
  brief text not null default '',
  listing_id uuid references public.work_listings(id) on delete set null,
  target_provider_id uuid references public.users(id) on delete set null,
  target_provider_persona_id uuid references public.personas(id) on delete set null,
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
  amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
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
  client_persona_id uuid references public.personas(id) on delete set null,
  client_snapshot jsonb not null default '{}'::jsonb,
  provider_id uuid not null references public.users(id) on delete cascade,
  provider_persona_id uuid references public.personas(id) on delete set null,
  provider_snapshot jsonb not null default '{}'::jsonb,
  title text,
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

create table if not exists public.commerce_disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  rental_booking_id uuid references public.rental_bookings(id) on delete set null,
  opened_by uuid not null references public.users(id) on delete cascade,
  reason_code text not null default 'general',
  details text,
  status text not null default 'open',
  resolution text,
  admin_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add column if not exists currency_preference text;

alter table public.personas add column if not exists avatar_url text;
alter table public.personas add column if not exists handle text;
alter table public.personas add column if not exists bio text;
alter table public.personas add column if not exists capabilities jsonb not null default '{}'::jsonb;
alter table public.personas add column if not exists verification jsonb not null default '{}'::jsonb;
alter table public.personas add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.personas add column if not exists updated_at timestamptz not null default now();

alter table public.items add column if not exists owner_persona_id uuid references public.personas(id) on delete set null;
alter table public.items add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.items add column if not exists views integer not null default 0;
alter table public.items add column if not exists updated_at timestamptz not null default now();

alter table public.orders add column if not exists buyer_persona_id uuid references public.personas(id) on delete set null;
alter table public.orders add column if not exists seller_persona_id uuid references public.personas(id) on delete set null;
alter table public.orders add column if not exists note text;
alter table public.orders add column if not exists updated_at timestamptz not null default now();

alter table public.order_items add column if not exists listing_type public.listing_type not null default 'sale';
alter table public.order_items add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.order_items add column if not exists rental_start timestamptz;
alter table public.order_items add column if not exists rental_end timestamptz;

alter table public.shipments add column if not exists shipper_id uuid references public.users(id) on delete set null;
alter table public.shipments add column if not exists shipper_persona_id uuid references public.personas(id) on delete set null;
alter table public.shipments add column if not exists estimated_delivery timestamptz;
alter table public.shipments add column if not exists eta timestamptz;
alter table public.shipments add column if not exists note text;
alter table public.shipments add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.shipments add column if not exists updated_at timestamptz not null default now();

alter table public.rental_bookings add column if not exists tracking_number text;
alter table public.rental_bookings add column if not exists return_tracking_number text;
alter table public.rental_bookings add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.rental_bookings add column if not exists updated_at timestamptz not null default now();

alter table public.notifications add column if not exists body text;
alter table public.notifications add column if not exists link text;
alter table public.notifications add column if not exists read_at timestamptz;

alter table public.payouts add column if not exists persona_id uuid references public.personas(id) on delete set null;
alter table public.payouts add column if not exists currency text not null default 'USD';
alter table public.payouts add column if not exists created_at timestamptz not null default now();
alter table public.payouts add column if not exists updated_at timestamptz not null default now();

alter table public.affiliate_links add column if not exists user_id uuid references public.users(id) on delete set null;
alter table public.affiliate_links add column if not exists affiliate_user_id uuid references public.users(id) on delete set null;
alter table public.affiliate_links add column if not exists affiliate_persona_id uuid references public.personas(id) on delete set null;
alter table public.affiliate_links add column if not exists campaign_name text;
alter table public.affiliate_links add column if not exists title text;
alter table public.affiliate_links add column if not exists short_code text;
alter table public.affiliate_links add column if not exists status text not null default 'active';
alter table public.affiliate_links add column if not exists clicks integer not null default 0;
alter table public.affiliate_links add column if not exists click_count integer not null default 0;
alter table public.affiliate_links add column if not exists currency text not null default 'USD';
alter table public.affiliate_links add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.affiliate_links add column if not exists updated_at timestamptz not null default now();

alter table public.affiliate_attributions add column if not exists user_id uuid references public.users(id) on delete set null;
alter table public.affiliate_attributions add column if not exists affiliate_user_id uuid references public.users(id) on delete set null;
alter table public.affiliate_attributions add column if not exists affiliate_persona_id uuid references public.personas(id) on delete set null;
alter table public.affiliate_attributions add column if not exists campaign_name text;
alter table public.affiliate_attributions add column if not exists source text;
alter table public.affiliate_attributions add column if not exists channel text;
alter table public.affiliate_attributions add column if not exists platform text;
alter table public.affiliate_attributions add column if not exists clicks integer not null default 0;
alter table public.affiliate_attributions add column if not exists click_count integer not null default 0;
alter table public.affiliate_attributions add column if not exists conversions integer not null default 0;
alter table public.affiliate_attributions add column if not exists conversion_count integer not null default 0;
alter table public.affiliate_attributions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.affiliate_attributions add column if not exists updated_at timestamptz not null default now();

alter table public.affiliate_conversions add column if not exists affiliate_id uuid references public.affiliate_profiles(id) on delete set null;
alter table public.affiliate_conversions add column if not exists user_id uuid references public.users(id) on delete set null;
alter table public.affiliate_conversions add column if not exists affiliate_user_id uuid references public.users(id) on delete set null;
alter table public.affiliate_conversions add column if not exists affiliate_persona_id uuid references public.personas(id) on delete set null;
alter table public.affiliate_conversions add column if not exists campaign_name text;
alter table public.affiliate_conversions add column if not exists code text;
alter table public.affiliate_conversions add column if not exists status text not null default 'approved';
alter table public.affiliate_conversions add column if not exists commission_amount numeric(12,2) not null default 0;
alter table public.affiliate_conversions add column if not exists currency text not null default 'USD';
alter table public.affiliate_conversions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.affiliate_conversions add column if not exists updated_at timestamptz not null default now();

alter table public.affiliate_payouts add column if not exists user_id uuid references public.users(id) on delete set null;
alter table public.affiliate_payouts add column if not exists affiliate_user_id uuid references public.users(id) on delete set null;
alter table public.affiliate_payouts add column if not exists affiliate_persona_id uuid references public.personas(id) on delete set null;
alter table public.affiliate_payouts add column if not exists currency text not null default 'USD';
alter table public.affiliate_payouts add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.affiliate_payouts add column if not exists created_at timestamptz not null default now();
alter table public.affiliate_payouts add column if not exists updated_at timestamptz not null default now();

alter table public.moderation_flags add column if not exists reason_code text;
alter table public.moderation_flags add column if not exists severity text;
alter table public.moderation_flags add column if not exists updated_at timestamptz not null default now();

alter table public.audit_logs add column if not exists details jsonb not null default '{}'::jsonb;

alter table public.uploaded_assets add column if not exists owner_persona_id uuid references public.personas(id) on delete set null;
alter table public.uploaded_assets add column if not exists resource_id text;
alter table public.uploaded_assets add column if not exists is_public boolean not null default false;
alter table public.uploaded_assets add column if not exists status text not null default 'active';
alter table public.uploaded_assets add column if not exists updated_at timestamptz not null default now();

alter table public.work_listings add column if not exists seller_persona_id uuid references public.personas(id) on delete set null;
alter table public.work_listings add column if not exists media jsonb not null default '[]'::jsonb;
alter table public.work_listings add column if not exists availability jsonb not null default '{}'::jsonb;
alter table public.work_listings add column if not exists provider_snapshot jsonb not null default '{}'::jsonb;
alter table public.work_listings add column if not exists risk_score numeric(6,2) not null default 0;
alter table public.work_listings add column if not exists visibility text not null default 'public';
alter table public.work_listings add column if not exists updated_at timestamptz not null default now();

alter table public.work_requests add column if not exists requester_persona_id uuid references public.personas(id) on delete set null;
alter table public.work_requests add column if not exists requester_snapshot jsonb not null default '{}'::jsonb;
alter table public.work_requests add column if not exists target_provider_persona_id uuid references public.personas(id) on delete set null;
alter table public.work_requests add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.work_requests add column if not exists requirements jsonb not null default '[]'::jsonb;
alter table public.work_requests add column if not exists risk_score numeric(6,2) not null default 0;
alter table public.work_requests add column if not exists updated_at timestamptz not null default now();

alter table public.work_proposals add column if not exists provider_persona_id uuid references public.personas(id) on delete set null;
alter table public.work_proposals add column if not exists client_persona_id uuid references public.personas(id) on delete set null;
alter table public.work_proposals add column if not exists provider_snapshot jsonb not null default '{}'::jsonb;
alter table public.work_proposals add column if not exists client_snapshot jsonb not null default '{}'::jsonb;
alter table public.work_proposals add column if not exists milestones jsonb not null default '[]'::jsonb;
alter table public.work_proposals add column if not exists terms jsonb not null default '{}'::jsonb;
alter table public.work_proposals add column if not exists revision_limit integer not null default 0;
alter table public.work_proposals add column if not exists risk_score numeric(6,2) not null default 0;
alter table public.work_proposals add column if not exists updated_at timestamptz not null default now();

alter table public.work_engagements add column if not exists buyer_persona_id uuid references public.personas(id) on delete set null;
alter table public.work_engagements add column if not exists provider_persona_id uuid references public.personas(id) on delete set null;
alter table public.work_engagements add column if not exists amount numeric(12,2) not null default 0;
alter table public.work_engagements add column if not exists total_amount numeric(12,2) not null default 0;
alter table public.work_engagements add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.work_engagements add column if not exists updated_at timestamptz not null default now();

alter table public.work_contracts add column if not exists client_persona_id uuid references public.personas(id) on delete set null;
alter table public.work_contracts add column if not exists provider_persona_id uuid references public.personas(id) on delete set null;
alter table public.work_contracts add column if not exists client_snapshot jsonb not null default '{}'::jsonb;
alter table public.work_contracts add column if not exists provider_snapshot jsonb not null default '{}'::jsonb;
alter table public.work_contracts add column if not exists title text;
alter table public.work_contracts add column if not exists terms jsonb not null default '{}'::jsonb;
alter table public.work_contracts add column if not exists risk_score numeric(6,2) not null default 0;
alter table public.work_contracts add column if not exists updated_at timestamptz not null default now();

alter table public.commerce_disputes add column if not exists reason_code text;
alter table public.commerce_disputes add column if not exists admin_notes text;
alter table public.commerce_disputes add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.commerce_disputes add column if not exists updated_at timestamptz not null default now();

insert into public.personas (user_id, firebase_uid, type, status, display_name, capabilities, verification, settings)
select
  u.id,
  u.firebase_uid,
  'consumer',
  'active',
  coalesce(nullif(u.name, ''), split_part(coalesce(u.email::text, 'user@example.com'), '@', 1), 'Consumer'),
  '{}'::jsonb,
  '{}'::jsonb,
  jsonb_build_object('timezone', 'UTC')
from public.users u
where not exists (
  select 1 from public.personas p where p.user_id = u.id and p.type = 'consumer'
);

insert into public.personas (user_id, firebase_uid, type, status, display_name, capabilities, verification, settings)
select
  u.id,
  u.firebase_uid,
  'seller',
  'active',
  coalesce(nullif(u.name, ''), split_part(coalesce(u.email::text, 'seller@example.com'), '@', 1), 'Seller'),
  '{}'::jsonb,
  '{}'::jsonb,
  jsonb_build_object('timezone', 'UTC')
from public.users u
where exists (select 1 from public.items i where i.seller_id = u.id)
  and not exists (
    select 1 from public.personas p where p.user_id = u.id and p.type = 'seller'
  );

insert into public.personas (user_id, firebase_uid, type, status, display_name, capabilities, verification, settings)
select
  u.id,
  u.firebase_uid,
  'provider',
  'active',
  coalesce(nullif(u.name, ''), split_part(coalesce(u.email::text, 'provider@example.com'), '@', 1), 'Provider'),
  '{}'::jsonb,
  '{}'::jsonb,
  jsonb_build_object('timezone', 'UTC')
from public.users u
where (
    exists (select 1 from public.work_requests wr where wr.target_provider_id = u.id)
    or exists (select 1 from public.work_proposals wp where wp.provider_id = u.id)
    or exists (select 1 from public.work_contracts wc where wc.provider_id = u.id)
    or exists (select 1 from public.work_engagements we where we.provider_id = u.id)
  )
  and not exists (
    select 1 from public.personas p where p.user_id = u.id and p.type = 'provider'
  );

insert into public.personas (user_id, firebase_uid, type, status, display_name, capabilities, verification, settings)
select
  u.id,
  u.firebase_uid,
  'affiliate',
  'active',
  coalesce(nullif(u.name, ''), split_part(coalesce(u.email::text, 'affiliate@example.com'), '@', 1), 'Affiliate'),
  '{}'::jsonb,
  '{}'::jsonb,
  jsonb_build_object('timezone', 'UTC')
from public.users u
where exists (select 1 from public.affiliate_profiles ap where ap.user_id = u.id)
  and not exists (
    select 1 from public.personas p where p.user_id = u.id and p.type = 'affiliate'
  );

insert into public.personas (user_id, firebase_uid, type, status, display_name, capabilities, verification, settings)
select
  u.id,
  u.firebase_uid,
  'shipper',
  'active',
  coalesce(nullif(u.name, ''), split_part(coalesce(u.email::text, 'shipper@example.com'), '@', 1), 'Shipper'),
  '{}'::jsonb,
  '{}'::jsonb,
  jsonb_build_object('timezone', 'UTC')
from public.users u
where exists (select 1 from public.shipments s where s.shipper_id = u.id)
  and not exists (
    select 1 from public.personas p where p.user_id = u.id and p.type = 'shipper'
  );

insert into public.admin_users (user_id, role)
select u.id, 'admin'
from public.users u
where lower(coalesce(u.role, '')) = 'admin'
  and not exists (
    select 1 from public.admin_users a where a.user_id = u.id
  );

insert into public.persona_members (persona_id, user_id, role)
select p.id, p.user_id, 'owner'
from public.personas p
where not exists (
  select 1 from public.persona_members pm where pm.persona_id = p.id and pm.user_id = p.user_id
);

update public.items i
set owner_persona_id = p.id
from public.personas p
where i.owner_persona_id is null
  and p.user_id = i.seller_id
  and p.type = 'seller';

update public.orders o
set buyer_persona_id = p.id
from public.personas p
where o.buyer_persona_id is null
  and p.user_id = o.buyer_id
  and p.type = 'consumer';

update public.orders o
set seller_persona_id = seller_map.persona_id
from (
  select distinct on (oi.order_id)
    oi.order_id,
    p.id as persona_id
  from public.order_items oi
  join public.personas p
    on p.user_id = oi.seller_id
   and p.type = 'seller'
  order by oi.order_id, oi.created_at asc
) as seller_map
where o.id = seller_map.order_id
  and o.seller_persona_id is null;

update public.shipments s
set shipper_id = shipper_map.shipper_id
from (
  select distinct on (oi.order_id)
    oi.order_id,
    oi.seller_id as shipper_id
  from public.order_items oi
  order by oi.order_id, oi.created_at asc
) as shipper_map
where s.order_id = shipper_map.order_id
  and s.shipper_id is null;

update public.shipments s
set shipper_persona_id = coalesce(
    (
      select p.id
      from public.personas p
      where p.user_id = s.shipper_id
        and p.type = 'shipper'
      order by p.created_at asc
      limit 1
    ),
    (
      select p.id
      from public.personas p
      where p.user_id = s.shipper_id
        and p.type = 'seller'
      order by p.created_at asc
      limit 1
    )
  )
where s.shipper_persona_id is null;

update public.shipments
set estimated_delivery = coalesce(
    estimated_delivery,
    eta,
    delivered_at,
    shipped_at + interval '3 days',
    created_at + interval '3 days'
  ),
  eta = coalesce(eta, estimated_delivery),
  updated_at = coalesce(updated_at, delivered_at, shipped_at, created_at, now());

update public.payouts
set created_at = coalesce(created_at, requested_at, now()),
  updated_at = coalesce(updated_at, paid_at, requested_at, created_at, now()),
  currency = coalesce(nullif(currency, ''), 'USD');

update public.payouts po
set persona_id = coalesce(
    (
      select p.id
      from public.personas p
      where p.user_id = po.user_id
        and p.type = 'seller'
      order by p.created_at asc
      limit 1
    ),
    (
      select p.id
      from public.personas p
      where p.user_id = po.user_id
        and p.type = 'provider'
      order by p.created_at asc
      limit 1
    ),
    (
      select p.id
      from public.personas p
      where p.user_id = po.user_id
        and p.type = 'affiliate'
      order by p.created_at asc
      limit 1
    ),
    (
      select p.id
      from public.personas p
      where p.user_id = po.user_id
        and p.type = 'shipper'
      order by p.created_at asc
      limit 1
    ),
    (
      select p.id
      from public.personas p
      where p.user_id = po.user_id
        and p.type = 'consumer'
      order by p.created_at asc
      limit 1
    )
  )
where po.persona_id is null;

update public.affiliate_links l
set user_id = coalesce(l.user_id, ap.user_id),
  affiliate_user_id = coalesce(l.affiliate_user_id, ap.user_id),
  affiliate_persona_id = coalesce(
    l.affiliate_persona_id,
    (
      select p.id
      from public.personas p
      where p.user_id = ap.user_id
        and p.type = 'affiliate'
      order by p.created_at asc
      limit 1
    )
  ),
  short_code = coalesce(l.short_code, l.code),
  campaign_name = coalesce(nullif(l.campaign_name, ''), nullif(l.title, ''), nullif(l.code, ''), 'Campaign'),
  click_count = greatest(coalesce(l.click_count, 0), coalesce(l.clicks, 0)),
  clicks = greatest(coalesce(l.clicks, 0), coalesce(l.click_count, 0)),
  updated_at = coalesce(l.updated_at, l.created_at, now())
from public.affiliate_profiles ap
where l.affiliate_id = ap.id;

update public.affiliate_attributions a
set user_id = coalesce(a.user_id, ap.user_id),
  affiliate_user_id = coalesce(a.affiliate_user_id, ap.user_id),
  affiliate_persona_id = coalesce(
    a.affiliate_persona_id,
    (
      select p.id
      from public.personas p
      where p.user_id = ap.user_id
        and p.type = 'affiliate'
      order by p.created_at asc
      limit 1
    )
  ),
  campaign_name = coalesce(nullif(a.campaign_name, ''), 'Campaign'),
  click_count = greatest(coalesce(a.click_count, 0), coalesce(a.clicks, 0)),
  clicks = greatest(coalesce(a.clicks, 0), coalesce(a.click_count, 0)),
  conversion_count = greatest(coalesce(a.conversion_count, 0), coalesce(a.conversions, 0)),
  conversions = greatest(coalesce(a.conversions, 0), coalesce(a.conversion_count, 0)),
  updated_at = coalesce(a.updated_at, a.created_at, now())
from public.affiliate_profiles ap
where a.affiliate_id = ap.id;

update public.affiliate_conversions c
set affiliate_id = coalesce(c.affiliate_id, a.affiliate_id),
  user_id = coalesce(c.user_id, ap.user_id),
  affiliate_user_id = coalesce(c.affiliate_user_id, ap.user_id),
  affiliate_persona_id = coalesce(
    c.affiliate_persona_id,
    (
      select p.id
      from public.personas p
      where p.user_id = ap.user_id
        and p.type = 'affiliate'
      order by p.created_at asc
      limit 1
    )
  ),
  campaign_name = coalesce(nullif(c.campaign_name, ''), nullif(a.campaign_name, ''), 'Campaign'),
  code = coalesce(c.code, l.code, l.short_code),
  commission_amount = coalesce(nullif(c.commission_amount, 0), c.commission, c.amount, 0),
  currency = coalesce(nullif(c.currency, ''), 'USD'),
  updated_at = coalesce(c.updated_at, c.created_at, now())
from public.affiliate_attributions a
left join public.affiliate_profiles ap on ap.id = a.affiliate_id
left join public.affiliate_links l on l.affiliate_id = a.affiliate_id
where c.attribution_id = a.id;

update public.affiliate_payouts p
set user_id = coalesce(p.user_id, ap.user_id),
  affiliate_user_id = coalesce(p.affiliate_user_id, ap.user_id),
  affiliate_persona_id = coalesce(
    p.affiliate_persona_id,
    (
      select pe.id
      from public.personas pe
      where pe.user_id = ap.user_id
        and pe.type = 'affiliate'
      order by pe.created_at asc
      limit 1
    )
  ),
  currency = coalesce(nullif(p.currency, ''), 'USD'),
  created_at = coalesce(p.created_at, p.requested_at, now()),
  updated_at = coalesce(p.updated_at, p.paid_at, p.requested_at, p.created_at, now())
from public.affiliate_profiles ap
where p.affiliate_id = ap.id;

update public.work_requests wr
set target_provider_persona_id = p.id,
  updated_at = coalesce(wr.updated_at, wr.created_at, now())
from public.personas p
where wr.target_provider_persona_id is null
  and wr.target_provider_id = p.user_id
  and p.type = 'provider';

update public.work_engagements
set amount = coalesce(nullif(amount, 0), gross_amount, total_amount, 0),
  total_amount = coalesce(nullif(total_amount, 0), gross_amount, amount, 0),
  updated_at = coalesce(updated_at, created_at, now());

update public.work_contracts wc
set title = coalesce(
    nullif(wc.title, ''),
    (
      select wp.title
      from public.work_proposals wp
      where wp.id = wc.proposal_id
      limit 1
    ),
    nullif(wc.scope, ''),
    'Work Contract'
  ),
  updated_at = coalesce(wc.updated_at, wc.created_at, now());

update public.moderation_flags
set reason_code = coalesce(nullif(reason_code, ''), nullif(reason, ''), 'moderation'),
  severity = coalesce(nullif(severity, ''), 'medium'),
  updated_at = coalesce(updated_at, created_at, now());

update public.uploaded_assets ua
set owner_persona_id = coalesce(
    (
      select p.id
      from public.personas p
      where p.user_id = ua.owner_user_id
        and p.type = 'seller'
      order by p.created_at asc
      limit 1
    ),
    (
      select p.id
      from public.personas p
      where p.user_id = ua.owner_user_id
        and p.type = 'provider'
      order by p.created_at asc
      limit 1
    ),
    (
      select p.id
      from public.personas p
      where p.user_id = ua.owner_user_id
        and p.type = 'affiliate'
      order by p.created_at asc
      limit 1
    ),
    (
      select p.id
      from public.personas p
      where p.user_id = ua.owner_user_id
        and p.type = 'consumer'
      order by p.created_at asc
      limit 1
    )
  ),
  updated_at = coalesce(ua.updated_at, ua.created_at, now())
where ua.owner_persona_id is null;

delete from public.admin_users a
using public.admin_users b
where a.ctid < b.ctid
  and a.user_id = b.user_id;

create unique index if not exists idx_admin_users_user on public.admin_users(user_id);

create index if not exists idx_personas_user on public.personas(user_id);
create index if not exists idx_personas_type_status on public.personas(type, status);
create index if not exists idx_persona_members_persona_user on public.persona_members(persona_id, user_id);

create index if not exists idx_items_seller on public.items(seller_id);
create index if not exists idx_items_owner_persona on public.items(owner_persona_id);
create index if not exists idx_items_category on public.items(category_id);
create index if not exists idx_items_created on public.items(created_at desc);

create index if not exists idx_shipping_addresses_user on public.shipping_addresses(user_id);

create index if not exists idx_orders_buyer on public.orders(buyer_id);
create index if not exists idx_orders_buyer_created_at on public.orders(buyer_id, created_at desc);
create index if not exists idx_orders_buyer_persona_created_at on public.orders(buyer_persona_id, created_at desc);
create index if not exists idx_orders_seller_persona_created_at on public.orders(seller_persona_id, created_at desc);
create index if not exists idx_orders_status_created_at on public.orders(status, created_at desc);

create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_seller_created_at on public.order_items(seller_id, created_at desc);
create index if not exists idx_order_items_item on public.order_items(item_id);

create index if not exists idx_shipments_order on public.shipments(order_id);
create index if not exists idx_shipments_shipper_updated_at on public.shipments(shipper_id, updated_at desc);
create index if not exists idx_shipments_shipper_persona_updated_at on public.shipments(shipper_persona_id, updated_at desc);
create index if not exists idx_shipments_status_updated_at on public.shipments(status, updated_at desc);

create index if not exists idx_rental_bookings_buyer_created_at on public.rental_bookings(buyer_id, created_at desc);
create index if not exists idx_rental_bookings_seller_created_at on public.rental_bookings(seller_id, created_at desc);
create index if not exists idx_rental_bookings_status_created_at on public.rental_bookings(status, created_at desc);

create index if not exists idx_wishlists_user on public.wishlists(user_id);
create index if not exists idx_wishlist_items_wishlist on public.wishlist_items(wishlist_id);

create index if not exists idx_notifications_user_created_at on public.notifications(user_id, created_at desc);

create index if not exists idx_payouts_user_created_at on public.payouts(user_id, created_at desc);
create index if not exists idx_payouts_status_created_at on public.payouts(status, created_at desc);
create index if not exists idx_payouts_persona_created_at on public.payouts(persona_id, created_at desc);

create index if not exists idx_affiliate_profiles_user on public.affiliate_profiles(user_id);
create index if not exists idx_affiliate_links_code on public.affiliate_links(code);
create index if not exists idx_affiliate_links_persona_updated_at on public.affiliate_links(affiliate_persona_id, updated_at desc);
create index if not exists idx_affiliate_links_user_updated_at on public.affiliate_links(affiliate_user_id, updated_at desc);
create index if not exists idx_affiliate_conversions_persona_updated_at on public.affiliate_conversions(affiliate_persona_id, updated_at desc);
create index if not exists idx_affiliate_payouts_persona_updated_at on public.affiliate_payouts(affiliate_persona_id, updated_at desc);
create index if not exists idx_affiliate_attributions_persona_updated_at on public.affiliate_attributions(affiliate_persona_id, updated_at desc);

create index if not exists idx_moderation_flags_status_created_at on public.moderation_flags(status, created_at desc);

create index if not exists idx_audit_logs_actor_created_at on public.audit_logs(actor_user_id, created_at desc);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_details_gin on public.audit_logs using gin (details jsonb_path_ops);

create index if not exists idx_mirror_documents_collection_updated_at on public.mirror_documents(collection, updated_at desc);
create index if not exists idx_mirror_documents_data_gin on public.mirror_documents using gin (data jsonb_path_ops);

create index if not exists idx_uploaded_assets_owner_created_at on public.uploaded_assets(owner_user_id, created_at desc);
create index if not exists idx_uploaded_assets_persona_created_at on public.uploaded_assets(owner_persona_id, created_at desc);
create index if not exists idx_uploaded_assets_resource on public.uploaded_assets(asset_type, resource_id);

create index if not exists idx_work_listings_seller_created_at on public.work_listings(seller_id, created_at desc);
create index if not exists idx_work_listings_seller_persona_created_at on public.work_listings(seller_persona_id, created_at desc);
create index if not exists idx_work_listings_status_created_at on public.work_listings(status, created_at desc);

create index if not exists idx_work_requests_target_provider_updated_at on public.work_requests(target_provider_id, updated_at desc);
create index if not exists idx_work_requests_target_provider_persona_updated_at on public.work_requests(target_provider_persona_id, updated_at desc);
create index if not exists idx_work_requests_status_created_at on public.work_requests(status, created_at desc);

create index if not exists idx_work_proposals_provider_updated_at on public.work_proposals(provider_id, updated_at desc);
create index if not exists idx_work_proposals_provider_persona_updated_at on public.work_proposals(provider_persona_id, updated_at desc);
create index if not exists idx_work_proposals_client_updated_at on public.work_proposals(client_id, updated_at desc);

create index if not exists idx_work_engagements_provider_updated_at on public.work_engagements(provider_id, updated_at desc);
create index if not exists idx_work_engagements_provider_persona_updated_at on public.work_engagements(provider_persona_id, updated_at desc);
create index if not exists idx_work_engagements_buyer_updated_at on public.work_engagements(buyer_id, updated_at desc);

create index if not exists idx_work_contracts_provider_updated_at on public.work_contracts(provider_id, updated_at desc);
create index if not exists idx_work_contracts_provider_persona_updated_at on public.work_contracts(provider_persona_id, updated_at desc);
create index if not exists idx_work_contracts_client_updated_at on public.work_contracts(client_id, updated_at desc);
create index if not exists idx_work_contracts_status_updated_at on public.work_contracts(status, updated_at desc);

create index if not exists idx_commerce_disputes_status_created_at on public.commerce_disputes(status, created_at desc);
create index if not exists idx_commerce_disputes_opened_by_created_at on public.commerce_disputes(opened_by, created_at desc);

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_personas_updated_at on public.personas;
create trigger set_personas_updated_at before update on public.personas
for each row execute function public.set_updated_at();

drop trigger if exists set_stores_updated_at on public.stores;
create trigger set_stores_updated_at before update on public.stores
for each row execute function public.set_updated_at();

drop trigger if exists set_items_updated_at on public.items;
create trigger set_items_updated_at before update on public.items
for each row execute function public.set_updated_at();

drop trigger if exists set_shipping_addresses_updated_at on public.shipping_addresses;
create trigger set_shipping_addresses_updated_at before update on public.shipping_addresses
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists set_shipments_updated_at on public.shipments;
create trigger set_shipments_updated_at before update on public.shipments
for each row execute function public.set_updated_at();

drop trigger if exists set_rental_bookings_updated_at on public.rental_bookings;
create trigger set_rental_bookings_updated_at before update on public.rental_bookings
for each row execute function public.set_updated_at();

drop trigger if exists set_payouts_updated_at on public.payouts;
create trigger set_payouts_updated_at before update on public.payouts
for each row execute function public.set_updated_at();

drop trigger if exists set_affiliate_links_updated_at on public.affiliate_links;
create trigger set_affiliate_links_updated_at before update on public.affiliate_links
for each row execute function public.set_updated_at();

drop trigger if exists set_affiliate_attributions_updated_at on public.affiliate_attributions;
create trigger set_affiliate_attributions_updated_at before update on public.affiliate_attributions
for each row execute function public.set_updated_at();

drop trigger if exists set_affiliate_conversions_updated_at on public.affiliate_conversions;
create trigger set_affiliate_conversions_updated_at before update on public.affiliate_conversions
for each row execute function public.set_updated_at();

drop trigger if exists set_affiliate_payouts_updated_at on public.affiliate_payouts;
create trigger set_affiliate_payouts_updated_at before update on public.affiliate_payouts
for each row execute function public.set_updated_at();

drop trigger if exists set_moderation_flags_updated_at on public.moderation_flags;
create trigger set_moderation_flags_updated_at before update on public.moderation_flags
for each row execute function public.set_updated_at();

drop trigger if exists set_uploaded_assets_updated_at on public.uploaded_assets;
create trigger set_uploaded_assets_updated_at before update on public.uploaded_assets
for each row execute function public.set_updated_at();

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

drop trigger if exists set_commerce_disputes_updated_at on public.commerce_disputes;
create trigger set_commerce_disputes_updated_at before update on public.commerce_disputes
for each row execute function public.set_updated_at();

alter table public.mirror_documents enable row level security;
alter table public.audit_logs enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "service_role_all_mirror_documents" on public.mirror_documents;
create policy "service_role_all_mirror_documents" on public.mirror_documents
for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "service_role_all_audit_logs" on public.audit_logs;
create policy "service_role_all_audit_logs" on public.audit_logs
for all using (public.is_service_role()) with check (public.is_service_role());

drop policy if exists "service_role_all_admin_users" on public.admin_users;
create policy "service_role_all_admin_users" on public.admin_users
for all using (public.is_service_role()) with check (public.is_service_role());
