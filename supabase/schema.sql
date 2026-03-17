-- Urban Prime V2.0 Supabase schema

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- Helper functions
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

create or replace function public.current_firebase_uid()
returns text as $$
  select nullif(auth.jwt() ->> 'firebase_uid', '');
$$ language sql stable;

-- Enums
do $$ begin create type public.listing_type as enum ('sale', 'rent', 'both', 'auction'); exception when duplicate_object then null; end $$;
do $$ begin create type public.listing_status as enum ('draft', 'published', 'archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_status as enum ('pending', 'authorized', 'paid', 'failed', 'refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type public.message_type as enum ('text', 'image', 'offer', 'system'); exception when duplicate_object then null; end $$;
do $$ begin create type public.notification_type as enum ('order', 'message', 'listing', 'promo', 'system'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payout_status as enum ('pending', 'processing', 'paid', 'failed', 'cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.review_status as enum ('pending', 'approved', 'rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type public.fulfillment_status as enum ('pending', 'processing', 'shipped', 'delivered', 'cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.supplier_order_status as enum ('pending', 'processing', 'shipped', 'delivered', 'cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.affiliate_status as enum ('pending', 'active', 'suspended'); exception when duplicate_object then null; end $$;

-- Users & Profiles
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

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at before update on public.users
for each row execute function public.set_updated_at();

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_user_profiles_user on public.user_profiles(user_id);
drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at before update on public.user_profiles
for each row execute function public.set_updated_at();

alter table public.user_profiles add column if not exists purpose text;
alter table public.user_profiles add column if not exists interests jsonb not null default '[]'::jsonb;
alter table public.user_profiles add column if not exists currency_preference text;
alter table public.user_profiles add column if not exists dob date;
alter table public.user_profiles add column if not exists gender text;
alter table public.user_profiles add column if not exists about text;
alter table public.user_profiles add column if not exists business_name text;
alter table public.user_profiles add column if not exists business_description text;
alter table public.user_profiles add column if not exists onboarding_required boolean not null default true;
alter table public.user_profiles add column if not exists onboarding_completed_at timestamptz;
alter table public.user_profiles add column if not exists profile_version integer not null default 1;

-- Stores & Seller Profiles
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  slug text unique,
  description text,
  logo_url text,
  cover_url text,
  status text not null default 'active',
  rating numeric(3,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_stores_owner on public.stores(owner_id);
drop trigger if exists set_stores_updated_at on public.stores;
create trigger set_stores_updated_at before update on public.stores
for each row execute function public.set_updated_at();

create table if not exists public.store_settings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_store_settings_store on public.store_settings(store_id);
drop trigger if exists set_store_settings_updated_at on public.store_settings;
create trigger set_store_settings_updated_at before update on public.store_settings
for each row execute function public.set_updated_at();

-- Categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  parent_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_categories_parent on public.categories(parent_id);

-- Items & Media
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  description text,
  listing_type public.listing_type not null,
  status public.listing_status not null default 'draft',
  condition text,
  brand text,
  tags text[] not null default '{}',
  location text,
  currency text not null default 'USD',
  sale_price numeric(12,2),
  rental_price numeric(12,2),
  auction_start_price numeric(12,2),
  auction_reserve_price numeric(12,2),
  auction_end_at timestamptz,
  stock integer not null default 0,
  is_featured boolean not null default false,
  is_verified boolean not null default false,
  views integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_items_status on public.items(status);
create index if not exists idx_items_seller on public.items(seller_id);
create index if not exists idx_items_category on public.items(category_id);
create index if not exists idx_items_created on public.items(created_at desc);
drop trigger if exists set_items_updated_at on public.items;
create trigger set_items_updated_at before update on public.items
for each row execute function public.set_updated_at();

create table if not exists public.item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_item_images_item on public.item_images(item_id);

create table if not exists public.item_variants (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  sku text,
  title text,
  price numeric(12,2),
  stock integer not null default 0,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_item_variants_item on public.item_variants(item_id);
drop trigger if exists set_item_variants_updated_at on public.item_variants;
create trigger set_item_variants_updated_at before update on public.item_variants
for each row execute function public.set_updated_at();

create table if not exists public.item_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists idx_item_collections_user on public.item_collections(user_id);

create table if not exists public.item_collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.item_collections(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_item_collection_unique on public.item_collection_items(collection_id, item_id);

-- Carts
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_carts_user on public.carts(user_id);
drop trigger if exists set_carts_updated_at on public.carts;
create trigger set_carts_updated_at before update on public.carts
for each row execute function public.set_updated_at();

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  quantity integer not null default 1,
  price_snapshot numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_cart_items_cart on public.cart_items(cart_id);

-- Orders & Payments
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
create index if not exists idx_addresses_user on public.shipping_addresses(user_id);
drop trigger if exists set_addresses_updated_at on public.shipping_addresses;
create trigger set_addresses_updated_at before update on public.shipping_addresses
for each row execute function public.set_updated_at();

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.users(id) on delete cascade,
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
create index if not exists idx_orders_buyer on public.orders(buyer_id);
create index if not exists idx_orders_status on public.orders(status);
drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete set null,
  seller_id uuid not null references public.users(id) on delete cascade,
  quantity integer not null default 1,
  unit_price numeric(12,2) not null default 0,
  listing_type public.listing_type not null,
  rental_start timestamptz,
  rental_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_seller on public.order_items(seller_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text,
  status public.payment_status not null default 'pending',
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  provider_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_payments_order on public.payments(order_id);
drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at before update on public.payments
for each row execute function public.set_updated_at();

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  reason text,
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  min_days integer,
  max_days integer,
  base_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  carrier text,
  tracking_number text,
  status public.fulfillment_status not null default 'pending',
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_shipments_order on public.shipments(order_id);

-- Reviews & Wishlists
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  reviewer_id uuid not null references public.users(id) on delete cascade,
  rating integer not null,
  title text,
  body text,
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists idx_reviews_item on public.reviews(item_id);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null default 'Wishlist',
  is_default boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_wishlists_user on public.wishlists(user_id);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_wishlist_items_unique on public.wishlist_items(wishlist_id, item_id);

-- Follows
create table if not exists public.user_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.users(id) on delete cascade,
  following_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_user_follows_unique on public.user_follows(follower_id, following_user_id);

create table if not exists public.store_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_store_follows_unique on public.store_follows(follower_id, store_id);

-- Messaging
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items(id) on delete set null,
  buyer_id uuid not null references public.users(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);
create index if not exists idx_chat_threads_users on public.chat_threads(buyer_id, seller_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  message_type public.message_type not null default 'text',
  body text,
  image_url text,
  offer_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_chat_messages_thread on public.chat_messages(thread_id);

create table if not exists public.custom_offers (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  title text,
  description text,
  price numeric(12,2) not null default 0,
  duration_days integer,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Notifications
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
create index if not exists idx_notifications_user on public.notifications(user_id);

-- Payouts
create table if not exists public.payout_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  method_type text not null,
  details jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_payout_methods_user on public.payout_methods(user_id);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  status public.payout_status not null default 'pending',
  requested_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists idx_payouts_user on public.payouts(user_id);

-- Dropshipping
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text,
  api_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  external_id text,
  sku text,
  title text,
  price numeric(12,2),
  stock integer,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_supplier_products_supplier on public.supplier_products(supplier_id);

create table if not exists public.supplier_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  status public.supplier_order_status not null default 'pending',
  tracking_number text,
  created_at timestamptz not null default now()
);

-- Affiliate
create table if not exists public.affiliate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status public.affiliate_status not null default 'pending',
  payout_method_id uuid references public.payout_methods(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_affiliate_profiles_user on public.affiliate_profiles(user_id);

create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliate_profiles(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  code text unique,
  url text,
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_attributions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliate_profiles(id) on delete cascade,
  referred_user_id uuid references public.users(id) on delete set null,
  item_id uuid references public.items(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_conversions (
  id uuid primary key default gen_random_uuid(),
  attribution_id uuid not null references public.affiliate_attributions(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  amount numeric(12,2) not null default 0,
  commission numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliate_profiles(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  status public.payout_status not null default 'pending',
  requested_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Admin & Settings
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
drop trigger if exists set_site_settings_updated_at on public.site_settings;
create trigger set_site_settings_updated_at before update on public.site_settings
for each row execute function public.set_updated_at();

create table if not exists public.moderation_flags (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items(id) on delete set null,
  reporter_id uuid references public.users(id) on delete set null,
  reason text,
  status text not null default 'open',
  created_at timestamptz not null default now()
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

-- Mirror table for dual-write: Firestore + Supabase
create table if not exists public.mirror_documents (
  collection text not null,
  doc_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (collection, doc_id)
);

create index if not exists idx_mirror_collection on public.mirror_documents (collection);
create index if not exists idx_mirror_updated_at on public.mirror_documents (updated_at desc);

create table if not exists public.user_onboarding_state (
  user_id uuid primary key references public.users(id) on delete cascade,
  current_step text not null default 'intent',
  flow_version integer not null default 1,
  selected_intents jsonb not null default '[]'::jsonb,
  draft jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_user_onboarding_state_updated_at on public.user_onboarding_state(updated_at desc);
drop trigger if exists set_user_onboarding_state_updated_at on public.user_onboarding_state;
create trigger set_user_onboarding_state_updated_at before update on public.user_onboarding_state
for each row execute function public.set_updated_at();


-- Multi-persona model
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
create index if not exists idx_personas_user on public.personas(user_id);
create index if not exists idx_personas_firebase_uid on public.personas(firebase_uid);
create index if not exists idx_personas_type_status on public.personas(type, status);
drop trigger if exists set_personas_updated_at on public.personas;
create trigger set_personas_updated_at before update on public.personas
for each row execute function public.set_updated_at();

create table if not exists public.persona_members (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personas(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (persona_id, user_id)
);

create table if not exists public.persona_wallet_ledgers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  persona_id uuid not null references public.personas(id) on delete cascade,
  direction text not null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  source_type text,
  source_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_persona_wallet_ledgers_persona on public.persona_wallet_ledgers(persona_id, created_at desc);

create table if not exists public.persona_notifications (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personas(id) on delete cascade,
  type public.notification_type not null default 'system',
  title text,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_persona_notifications_persona on public.persona_notifications(persona_id, created_at desc);

create table if not exists public.persona_capability_requests (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personas(id) on delete cascade,
  capability text not null,
  status text not null default 'pending',
  notes text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_persona_capability_requests_persona on public.persona_capability_requests(persona_id, status);
drop trigger if exists set_persona_capability_requests_updated_at on public.persona_capability_requests;
create trigger set_persona_capability_requests_updated_at before update on public.persona_capability_requests
for each row execute function public.set_updated_at();

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
create index if not exists idx_uploaded_assets_owner on public.uploaded_assets(owner_user_id, created_at desc);
create index if not exists idx_uploaded_assets_persona on public.uploaded_assets(owner_persona_id, created_at desc);
create index if not exists idx_uploaded_assets_resource on public.uploaded_assets(asset_type, resource_id);
drop trigger if exists set_uploaded_assets_updated_at on public.uploaded_assets;
create trigger set_uploaded_assets_updated_at before update on public.uploaded_assets
for each row execute function public.set_updated_at();

-- OmniWork unified services domain
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
create index if not exists idx_work_proposals_status on public.work_proposals(status, created_at desc);
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
create index if not exists idx_work_milestones_status on public.work_milestones(status);
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
create index if not exists idx_work_escrow_ledger_contract on public.work_escrow_ledger(contract_id, created_at desc);

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
create index if not exists idx_work_disputes_status on public.work_disputes(status, created_at desc);
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
create index if not exists idx_work_autopilot_runs_actor on public.work_autopilot_runs(actor_user_id, created_at desc);

-- Persona reference columns on existing transactional tables
alter table public.items add column if not exists owner_persona_id uuid references public.personas(id) on delete set null;
alter table public.orders add column if not exists buyer_persona_id uuid references public.personas(id) on delete set null;
alter table public.orders add column if not exists seller_persona_id uuid references public.personas(id) on delete set null;
alter table public.chat_threads add column if not exists buyer_persona_id uuid references public.personas(id) on delete set null;
alter table public.chat_threads add column if not exists seller_persona_id uuid references public.personas(id) on delete set null;
create index if not exists idx_items_owner_persona on public.items(owner_persona_id);
create index if not exists idx_orders_buyer_persona on public.orders(buyer_persona_id);
create index if not exists idx_orders_seller_persona on public.orders(seller_persona_id);
create index if not exists idx_chat_threads_buyer_persona on public.chat_threads(buyer_persona_id);
create index if not exists idx_chat_threads_seller_persona on public.chat_threads(seller_persona_id);

-- RLS
alter table public.users enable row level security;
alter table public.user_profiles enable row level security;
alter table public.stores enable row level security;
alter table public.store_settings enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.item_images enable row level security;
alter table public.item_variants enable row level security;
alter table public.item_collections enable row level security;
alter table public.item_collection_items enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.shipping_addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.shipping_methods enable row level security;
alter table public.shipments enable row level security;
alter table public.reviews enable row level security;
alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.user_follows enable row level security;
alter table public.store_follows enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.custom_offers enable row level security;
alter table public.notifications enable row level security;
alter table public.payout_methods enable row level security;
alter table public.payouts enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_products enable row level security;
alter table public.supplier_orders enable row level security;
alter table public.affiliate_profiles enable row level security;
alter table public.affiliate_links enable row level security;
alter table public.affiliate_attributions enable row level security;
alter table public.affiliate_conversions enable row level security;
alter table public.affiliate_payouts enable row level security;
alter table public.admin_users enable row level security;
alter table public.site_settings enable row level security;
alter table public.moderation_flags enable row level security;
alter table public.audit_logs enable row level security;
alter table public.personas enable row level security;
alter table public.persona_members enable row level security;
alter table public.persona_wallet_ledgers enable row level security;
alter table public.persona_notifications enable row level security;
alter table public.persona_capability_requests enable row level security;
alter table public.uploaded_assets enable row level security;
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
alter table public.mirror_documents enable row level security;
alter table public.user_onboarding_state enable row level security;

-- Public read policies
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories for select using (true);
drop policy if exists "items_public_read" on public.items;
create policy "items_public_read" on public.items for select using (status = 'published');
drop policy if exists "stores_public_read" on public.stores;
create policy "stores_public_read" on public.stores for select using (true);

-- Service role full access
drop policy if exists "service_role_all_users" on public.users;
create policy "service_role_all_users" on public.users for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_profiles" on public.user_profiles;
create policy "service_role_all_profiles" on public.user_profiles for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_items" on public.items;
create policy "service_role_all_items" on public.items for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_general" on public.item_images;
create policy "service_role_all_general" on public.item_images for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_variants" on public.item_variants;
create policy "service_role_all_variants" on public.item_variants for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_orders" on public.orders;
create policy "service_role_all_orders" on public.orders for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_order_items" on public.order_items;
create policy "service_role_all_order_items" on public.order_items for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_carts" on public.carts;
create policy "service_role_all_carts" on public.carts for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_cart_items" on public.cart_items;
create policy "service_role_all_cart_items" on public.cart_items for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_payments" on public.payments;
create policy "service_role_all_payments" on public.payments for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_notifications" on public.notifications;
create policy "service_role_all_notifications" on public.notifications for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_admin" on public.admin_users;
create policy "service_role_all_admin" on public.admin_users for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_settings" on public.site_settings;
create policy "service_role_all_settings" on public.site_settings for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_mirror" on public.mirror_documents;
create policy "service_role_all_mirror" on public.mirror_documents for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_personas" on public.personas;
create policy "service_role_all_personas" on public.personas for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_persona_members" on public.persona_members;
create policy "service_role_all_persona_members" on public.persona_members for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_persona_wallet_ledgers" on public.persona_wallet_ledgers;
create policy "service_role_all_persona_wallet_ledgers" on public.persona_wallet_ledgers for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_persona_notifications" on public.persona_notifications;
create policy "service_role_all_persona_notifications" on public.persona_notifications for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_persona_capability_requests" on public.persona_capability_requests;
create policy "service_role_all_persona_capability_requests" on public.persona_capability_requests for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_uploaded_assets" on public.uploaded_assets;
create policy "service_role_all_uploaded_assets" on public.uploaded_assets for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_user_onboarding_state" on public.user_onboarding_state;
create policy "service_role_all_user_onboarding_state" on public.user_onboarding_state for all using (public.is_service_role()) with check (public.is_service_role());
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

-- User ownership policies (requires JWT mapped to user id or firebase_uid)
drop policy if exists "users_self" on public.users;
create policy "users_self" on public.users for select using (
  public.is_service_role()
  or id = auth.uid()
  or firebase_uid = public.current_firebase_uid()
);

drop policy if exists "profiles_self" on public.user_profiles;
create policy "profiles_self" on public.user_profiles for all using (
  public.is_service_role() or user_id = auth.uid()
) with check (
  public.is_service_role() or user_id = auth.uid()
);

drop policy if exists "stores_owner" on public.stores;
create policy "stores_owner" on public.stores for all using (
  public.is_service_role() or owner_id = auth.uid()
) with check (
  public.is_service_role() or owner_id = auth.uid()
);

drop policy if exists "items_owner" on public.items;
create policy "items_owner" on public.items for all using (
  public.is_service_role() or seller_id = auth.uid()
) with check (
  public.is_service_role() or seller_id = auth.uid()
);

drop policy if exists "carts_owner" on public.carts;
create policy "carts_owner" on public.carts for all using (
  public.is_service_role() or user_id = auth.uid()
) with check (
  public.is_service_role() or user_id = auth.uid()
);

drop policy if exists "cart_items_owner" on public.cart_items;
create policy "cart_items_owner" on public.cart_items for all using (
  public.is_service_role() or exists (
    select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()
  )
) with check (
  public.is_service_role() or exists (
    select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()
  )
);

drop policy if exists "orders_buyer" on public.orders;
create policy "orders_buyer" on public.orders for select using (
  public.is_service_role() or buyer_id = auth.uid()
);

drop policy if exists "order_items_buyer" on public.order_items;
create policy "order_items_buyer" on public.order_items for select using (
  public.is_service_role() or exists (
    select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid()
  )
);

drop policy if exists "addresses_owner" on public.shipping_addresses;
create policy "addresses_owner" on public.shipping_addresses for all using (
  public.is_service_role() or user_id = auth.uid()
) with check (
  public.is_service_role() or user_id = auth.uid()
);

drop policy if exists "wishlists_owner" on public.wishlists;
create policy "wishlists_owner" on public.wishlists for all using (
  public.is_service_role() or user_id = auth.uid()
) with check (
  public.is_service_role() or user_id = auth.uid()
);

drop policy if exists "wishlist_items_owner" on public.wishlist_items;
create policy "wishlist_items_owner" on public.wishlist_items for all using (
  public.is_service_role() or exists (
    select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()
  )
) with check (
  public.is_service_role() or exists (
    select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()
  )
);

drop policy if exists "chat_threads_participants" on public.chat_threads;
create policy "chat_threads_participants" on public.chat_threads for select using (
  public.is_service_role() or buyer_id = auth.uid() or seller_id = auth.uid()
);

drop policy if exists "chat_messages_participants" on public.chat_messages;
create policy "chat_messages_participants" on public.chat_messages for select using (
  public.is_service_role() or exists (
    select 1 from public.chat_threads t where t.id = thread_id and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
  )
);

drop policy if exists "notifications_owner" on public.notifications;
create policy "notifications_owner" on public.notifications for select using (
  public.is_service_role() or user_id = auth.uid()
);

drop policy if exists "personas_owner" on public.personas;
create policy "personas_owner" on public.personas for all using (
  public.is_service_role() or user_id = auth.uid() or exists (
    select 1 from public.persona_members pm where pm.persona_id = personas.id and pm.user_id = auth.uid()
  )
) with check (
  public.is_service_role() or user_id = auth.uid()
);

drop policy if exists "persona_members_owner_or_self" on public.persona_members;
create policy "persona_members_owner_or_self" on public.persona_members for all using (
  public.is_service_role() or user_id = auth.uid() or exists (
    select 1 from public.personas p where p.id = persona_members.persona_id and p.user_id = auth.uid()
  )
) with check (
  public.is_service_role() or user_id = auth.uid() or exists (
    select 1 from public.personas p where p.id = persona_members.persona_id and p.user_id = auth.uid()
  )
);

drop policy if exists "persona_wallet_ledgers_owner" on public.persona_wallet_ledgers;
create policy "persona_wallet_ledgers_owner" on public.persona_wallet_ledgers for select using (
  public.is_service_role() or user_id = auth.uid() or exists (
    select 1 from public.personas p where p.id = persona_wallet_ledgers.persona_id and p.user_id = auth.uid()
  )
);

drop policy if exists "persona_notifications_owner" on public.persona_notifications;
create policy "persona_notifications_owner" on public.persona_notifications for select using (
  public.is_service_role() or exists (
    select 1 from public.personas p where p.id = persona_notifications.persona_id and p.user_id = auth.uid()
  )
);

drop policy if exists "persona_capability_requests_owner" on public.persona_capability_requests;
create policy "persona_capability_requests_owner" on public.persona_capability_requests for all using (
  public.is_service_role() or exists (
    select 1 from public.personas p where p.id = persona_capability_requests.persona_id and p.user_id = auth.uid()
  )
) with check (
  public.is_service_role() or exists (
    select 1 from public.personas p where p.id = persona_capability_requests.persona_id and p.user_id = auth.uid()
  )
);

drop policy if exists "personas_public_directory_read" on public.personas;
create policy "personas_public_directory_read" on public.personas for select using (
  status = 'active' and type in ('seller', 'provider', 'affiliate', 'consumer')
);
drop policy if exists "uploaded_assets_owner" on public.uploaded_assets;
create policy "uploaded_assets_owner" on public.uploaded_assets for all using (
  public.is_service_role()
  or owner_user_id = auth.uid()
  or exists (
    select 1 from public.persona_members pm where pm.persona_id = uploaded_assets.owner_persona_id and pm.user_id = auth.uid()
  )
) with check (
  public.is_service_role()
  or owner_user_id = auth.uid()
);

drop policy if exists "uploaded_assets_public_read" on public.uploaded_assets;
create policy "uploaded_assets_public_read" on public.uploaded_assets for select using (
  is_public = true and status = 'active'
);

drop policy if exists "user_onboarding_state_owner" on public.user_onboarding_state;
create policy "user_onboarding_state_owner" on public.user_onboarding_state for all using (
  public.is_service_role() or user_id = auth.uid()
) with check (
  public.is_service_role() or user_id = auth.uid()
);

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

drop policy if exists "work_requests_participants" on public.work_requests;
create policy "work_requests_participants" on public.work_requests for all using (
  public.is_service_role()
  or requester_id = auth.uid()
  or target_provider_id = auth.uid()
) with check (
  public.is_service_role() or requester_id = auth.uid()
);

drop policy if exists "work_proposals_participants" on public.work_proposals;
create policy "work_proposals_participants" on public.work_proposals for all using (
  public.is_service_role()
  or provider_id = auth.uid()
  or client_id = auth.uid()
) with check (
  public.is_service_role()
  or provider_id = auth.uid()
  or client_id = auth.uid()
);

drop policy if exists "work_contracts_participants" on public.work_contracts;
create policy "work_contracts_participants" on public.work_contracts for all using (
  public.is_service_role()
  or provider_id = auth.uid()
  or client_id = auth.uid()
) with check (
  public.is_service_role()
  or provider_id = auth.uid()
  or client_id = auth.uid()
);

drop policy if exists "work_milestones_participants" on public.work_milestones;
create policy "work_milestones_participants" on public.work_milestones for all using (
  public.is_service_role()
  or exists (
    select 1
    from public.work_contracts c
    where c.id = work_milestones.contract_id
      and (c.provider_id = auth.uid() or c.client_id = auth.uid())
  )
) with check (
  public.is_service_role()
  or exists (
    select 1
    from public.work_contracts c
    where c.id = work_milestones.contract_id
      and (c.provider_id = auth.uid() or c.client_id = auth.uid())
  )
);

drop policy if exists "work_engagements_participants" on public.work_engagements;
create policy "work_engagements_participants" on public.work_engagements for all using (
  public.is_service_role()
  or buyer_id = auth.uid()
  or provider_id = auth.uid()
) with check (
  public.is_service_role()
  or buyer_id = auth.uid()
  or provider_id = auth.uid()
);

drop policy if exists "work_escrow_ledger_participants" on public.work_escrow_ledger;
create policy "work_escrow_ledger_participants" on public.work_escrow_ledger for select using (
  public.is_service_role()
  or payer_id = auth.uid()
  or payee_id = auth.uid()
  or exists (
    select 1
    from public.work_engagements e
    where e.id = work_escrow_ledger.engagement_id
      and (e.buyer_id = auth.uid() or e.provider_id = auth.uid())
  )
);

drop policy if exists "work_disputes_participants" on public.work_disputes;
create policy "work_disputes_participants" on public.work_disputes for all using (
  public.is_service_role()
  or opened_by = auth.uid()
  or against_user_id = auth.uid()
) with check (
  public.is_service_role()
  or opened_by = auth.uid()
);

drop policy if exists "work_reputation_public_read" on public.work_reputation;
create policy "work_reputation_public_read" on public.work_reputation for select using (true);
drop policy if exists "work_reputation_owner_write" on public.work_reputation;
create policy "work_reputation_owner_write" on public.work_reputation for all using (
  public.is_service_role() or user_id = auth.uid()
) with check (
  public.is_service_role() or user_id = auth.uid()
);

drop policy if exists "work_autopilot_runs_owner" on public.work_autopilot_runs;
create policy "work_autopilot_runs_owner" on public.work_autopilot_runs for all using (
  public.is_service_role() or actor_user_id = auth.uid()
) with check (
  public.is_service_role() or actor_user_id = auth.uid()
);


-- Seed categories (basic)
insert into public.categories (name, slug)
values
  ('Electronics', 'electronics'),
  ('Fashion', 'fashion'),
  ('Home', 'home'),
  ('Beauty', 'beauty'),
  ('Sports', 'sports'),
  ('Toys', 'toys')
on conflict do nothing;


-- Brand Hub v3

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
