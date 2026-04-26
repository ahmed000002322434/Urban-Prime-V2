create extension if not exists pgcrypto;

create table if not exists affiliate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  is_affiliate boolean not null default false,
  onboarding_completed boolean not null default false,
  affiliate_profile jsonb,
  pending_referral jsonb,
  wallet_balance numeric(12,2) not null default 0,
  processing_balance numeric(12,2) not null default 0,
  held_deposits numeric(12,2) not null default 0,
  affiliate_tier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stores_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  store_name text not null,
  tagline text,
  city text,
  category text,
  description text,
  ideal_customer text,
  theme text,
  primary_color text,
  logo_emoji text,
  story text,
  mission text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists store_layouts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  sections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists store_analytics (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  total_rentals integer not null default 0,
  total_revenue numeric(12,2) not null default 0,
  average_order_value numeric(12,2) not null default 0,
  conversion_rate numeric(8,4) not null default 0,
  return_rate numeric(8,4) not null default 0,
  top_items jsonb not null default '[]'::jsonb,
  customer_count integer not null default 0,
  average_rating numeric(8,4) not null default 0,
  weekly_data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists affiliate_programs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  user_id uuid not null,
  commission_rate numeric(8,4) not null,
  max_reward numeric(12,2) not null default 0,
  platforms jsonb not null default '[]'::jsonb,
  enable_cookies boolean not null default true,
  cookie_duration integer not null default 30,
  is_active boolean not null default true,
  min_payout numeric(12,2) not null default 50,
  approval_mode text not null default 'manual',
  supported_surfaces jsonb not null default '["link","coupon","spotlight","pixe","seller_referral"]'::jsonb,
  seller_bonus_amount numeric(12,2) not null default 25,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists affiliate_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  store_id uuid,
  program_id uuid,
  name text not null,
  email text,
  platform text,
  audience text,
  status text not null default 'new',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  commission_rate numeric(8,4) not null default 10,
  min_payout numeric(12,2) not null default 50,
  approval_mode text not null default 'manual',
  supported_surfaces jsonb not null default '["link","coupon","spotlight","pixe","seller_referral"]'::jsonb,
  last_click_at timestamptz,
  last_conversion_at timestamptz,
  last_payout_at timestamptz
);

create table if not exists affiliate_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  affiliate_id uuid,
  store_id uuid,
  item_id text,
  original_url text not null,
  destination_url text not null,
  short_code text not null,
  tracking_code text not null,
  clicks integer not null default 0,
  source_surface text not null default 'link',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists affiliate_coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  affiliate_id uuid,
  store_id uuid,
  code text not null,
  discount_percentage numeric(8,2) not null default 10,
  uses integer not null default 0,
  commission_rate numeric(8,4) not null default 0.10,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  affiliate_id uuid,
  link_id uuid,
  tracking_code text,
  store_id uuid,
  item_id text,
  source_surface text not null default 'link',
  destination_url text,
  path text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  referrer text
);

create table if not exists affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  affiliate_id uuid,
  order_id text not null,
  booking_id text,
  order_item_id text,
  item_id text,
  store_id uuid,
  program_id uuid,
  source_surface text,
  event_type text not null,
  amount numeric(12,2) not null default 0,
  commission_rate numeric(8,4) not null default 0,
  commission_amount numeric(12,2) not null default 0,
  status text not null default 'pending',
  description text,
  link_id uuid,
  coupon_id uuid,
  tracking_code text,
  wallet_transaction_id text,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  reversal_reason text
);

create table if not exists affiliate_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  url text not null,
  type text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Existing Supabase projects may already have older versions of these tables.
-- Add any missing columns before creating indexes so rerunning this script is safe.

alter table if exists affiliate_profiles add column if not exists id uuid default gen_random_uuid();
alter table if exists affiliate_profiles add column if not exists user_id uuid;
alter table if exists affiliate_profiles add column if not exists is_affiliate boolean default false;
alter table if exists affiliate_profiles add column if not exists onboarding_completed boolean default false;
alter table if exists affiliate_profiles add column if not exists affiliate_profile jsonb;
alter table if exists affiliate_profiles add column if not exists pending_referral jsonb;
alter table if exists affiliate_profiles add column if not exists wallet_balance numeric(12,2) default 0;
alter table if exists affiliate_profiles add column if not exists processing_balance numeric(12,2) default 0;
alter table if exists affiliate_profiles add column if not exists held_deposits numeric(12,2) default 0;
alter table if exists affiliate_profiles add column if not exists affiliate_tier text;
alter table if exists affiliate_profiles add column if not exists created_at timestamptz default now();
alter table if exists affiliate_profiles add column if not exists updated_at timestamptz default now();

alter table if exists stores_v2 add column if not exists id uuid default gen_random_uuid();
alter table if exists stores_v2 add column if not exists user_id uuid;
alter table if exists stores_v2 add column if not exists store_name text;
alter table if exists stores_v2 add column if not exists tagline text;
alter table if exists stores_v2 add column if not exists city text;
alter table if exists stores_v2 add column if not exists category text;
alter table if exists stores_v2 add column if not exists description text;
alter table if exists stores_v2 add column if not exists ideal_customer text;
alter table if exists stores_v2 add column if not exists theme text;
alter table if exists stores_v2 add column if not exists primary_color text;
alter table if exists stores_v2 add column if not exists logo_emoji text;
alter table if exists stores_v2 add column if not exists story text;
alter table if exists stores_v2 add column if not exists mission text;
alter table if exists stores_v2 add column if not exists is_published boolean default false;
alter table if exists stores_v2 add column if not exists published_at timestamptz;
alter table if exists stores_v2 add column if not exists created_at timestamptz default now();
alter table if exists stores_v2 add column if not exists updated_at timestamptz default now();

alter table if exists store_layouts add column if not exists id uuid default gen_random_uuid();
alter table if exists store_layouts add column if not exists store_id uuid;
alter table if exists store_layouts add column if not exists sections jsonb default '[]'::jsonb;
alter table if exists store_layouts add column if not exists created_at timestamptz default now();
alter table if exists store_layouts add column if not exists updated_at timestamptz default now();

alter table if exists store_analytics add column if not exists id uuid default gen_random_uuid();
alter table if exists store_analytics add column if not exists store_id uuid;
alter table if exists store_analytics add column if not exists total_rentals integer default 0;
alter table if exists store_analytics add column if not exists total_revenue numeric(12,2) default 0;
alter table if exists store_analytics add column if not exists average_order_value numeric(12,2) default 0;
alter table if exists store_analytics add column if not exists conversion_rate numeric(8,4) default 0;
alter table if exists store_analytics add column if not exists return_rate numeric(8,4) default 0;
alter table if exists store_analytics add column if not exists top_items jsonb default '[]'::jsonb;
alter table if exists store_analytics add column if not exists customer_count integer default 0;
alter table if exists store_analytics add column if not exists average_rating numeric(8,4) default 0;
alter table if exists store_analytics add column if not exists weekly_data jsonb default '[]'::jsonb;
alter table if exists store_analytics add column if not exists updated_at timestamptz default now();

alter table if exists affiliate_programs add column if not exists id uuid default gen_random_uuid();
alter table if exists affiliate_programs add column if not exists store_id uuid;
alter table if exists affiliate_programs add column if not exists user_id uuid;
alter table if exists affiliate_programs add column if not exists commission_rate numeric(8,4);
alter table if exists affiliate_programs add column if not exists max_reward numeric(12,2) default 0;
alter table if exists affiliate_programs add column if not exists platforms jsonb default '[]'::jsonb;
alter table if exists affiliate_programs add column if not exists enable_cookies boolean default true;
alter table if exists affiliate_programs add column if not exists cookie_duration integer default 30;
alter table if exists affiliate_programs add column if not exists is_active boolean default true;
alter table if exists affiliate_programs add column if not exists min_payout numeric(12,2) default 50;
alter table if exists affiliate_programs add column if not exists approval_mode text default 'manual';
alter table if exists affiliate_programs add column if not exists supported_surfaces jsonb default '["link","coupon","spotlight","pixe","seller_referral"]'::jsonb;
alter table if exists affiliate_programs add column if not exists seller_bonus_amount numeric(12,2) default 25;
alter table if exists affiliate_programs add column if not exists created_at timestamptz default now();
alter table if exists affiliate_programs add column if not exists updated_at timestamptz default now();

alter table if exists affiliate_users add column if not exists id uuid default gen_random_uuid();
alter table if exists affiliate_users add column if not exists user_id uuid;
alter table if exists affiliate_users add column if not exists store_id uuid;
alter table if exists affiliate_users add column if not exists program_id uuid;
alter table if exists affiliate_users add column if not exists name text;
alter table if exists affiliate_users add column if not exists email text;
alter table if exists affiliate_users add column if not exists platform text;
alter table if exists affiliate_users add column if not exists audience text;
alter table if exists affiliate_users add column if not exists status text default 'new';
alter table if exists affiliate_users add column if not exists joined_at timestamptz default now();
alter table if exists affiliate_users add column if not exists updated_at timestamptz default now();
alter table if exists affiliate_users add column if not exists commission_rate numeric(8,4) default 10;
alter table if exists affiliate_users add column if not exists min_payout numeric(12,2) default 50;
alter table if exists affiliate_users add column if not exists approval_mode text default 'manual';
alter table if exists affiliate_users add column if not exists supported_surfaces jsonb default '["link","coupon","spotlight","pixe","seller_referral"]'::jsonb;
alter table if exists affiliate_users add column if not exists last_click_at timestamptz;
alter table if exists affiliate_users add column if not exists last_conversion_at timestamptz;
alter table if exists affiliate_users add column if not exists last_payout_at timestamptz;

alter table if exists affiliate_links add column if not exists id uuid default gen_random_uuid();
alter table if exists affiliate_links add column if not exists user_id uuid;
alter table if exists affiliate_links add column if not exists affiliate_id uuid;
alter table if exists affiliate_links add column if not exists store_id uuid;
alter table if exists affiliate_links add column if not exists item_id text;
alter table if exists affiliate_links add column if not exists original_url text;
alter table if exists affiliate_links add column if not exists destination_url text;
alter table if exists affiliate_links add column if not exists short_code text;
alter table if exists affiliate_links add column if not exists tracking_code text;
alter table if exists affiliate_links add column if not exists clicks integer default 0;
alter table if exists affiliate_links add column if not exists source_surface text default 'link';
alter table if exists affiliate_links add column if not exists status text default 'active';
alter table if exists affiliate_links add column if not exists created_at timestamptz default now();

alter table if exists affiliate_coupons add column if not exists id uuid default gen_random_uuid();
alter table if exists affiliate_coupons add column if not exists user_id uuid;
alter table if exists affiliate_coupons add column if not exists affiliate_id uuid;
alter table if exists affiliate_coupons add column if not exists store_id uuid;
alter table if exists affiliate_coupons add column if not exists code text;
alter table if exists affiliate_coupons add column if not exists discount_percentage numeric(8,2) default 10;
alter table if exists affiliate_coupons add column if not exists uses integer default 0;
alter table if exists affiliate_coupons add column if not exists commission_rate numeric(8,4) default 0.10;
alter table if exists affiliate_coupons add column if not exists status text default 'active';
alter table if exists affiliate_coupons add column if not exists created_at timestamptz default now();

alter table if exists affiliate_clicks add column if not exists id uuid default gen_random_uuid();
alter table if exists affiliate_clicks add column if not exists user_id uuid;
alter table if exists affiliate_clicks add column if not exists affiliate_id uuid;
alter table if exists affiliate_clicks add column if not exists link_id uuid;
alter table if exists affiliate_clicks add column if not exists tracking_code text;
alter table if exists affiliate_clicks add column if not exists store_id uuid;
alter table if exists affiliate_clicks add column if not exists item_id text;
alter table if exists affiliate_clicks add column if not exists source_surface text default 'link';
alter table if exists affiliate_clicks add column if not exists destination_url text;
alter table if exists affiliate_clicks add column if not exists path text;
alter table if exists affiliate_clicks add column if not exists created_at timestamptz default now();
alter table if exists affiliate_clicks add column if not exists expires_at timestamptz;
alter table if exists affiliate_clicks add column if not exists referrer text;

alter table if exists affiliate_commissions add column if not exists id uuid default gen_random_uuid();
alter table if exists affiliate_commissions add column if not exists user_id uuid;
alter table if exists affiliate_commissions add column if not exists affiliate_id uuid;
alter table if exists affiliate_commissions add column if not exists order_id text;
alter table if exists affiliate_commissions add column if not exists booking_id text;
alter table if exists affiliate_commissions add column if not exists order_item_id text;
alter table if exists affiliate_commissions add column if not exists item_id text;
alter table if exists affiliate_commissions add column if not exists store_id uuid;
alter table if exists affiliate_commissions add column if not exists program_id uuid;
alter table if exists affiliate_commissions add column if not exists source_surface text;
alter table if exists affiliate_commissions add column if not exists event_type text;
alter table if exists affiliate_commissions add column if not exists amount numeric(12,2) default 0;
alter table if exists affiliate_commissions add column if not exists commission_rate numeric(8,4) default 0;
alter table if exists affiliate_commissions add column if not exists commission_amount numeric(12,2) default 0;
alter table if exists affiliate_commissions add column if not exists status text default 'pending';
alter table if exists affiliate_commissions add column if not exists description text;
alter table if exists affiliate_commissions add column if not exists link_id uuid;
alter table if exists affiliate_commissions add column if not exists coupon_id uuid;
alter table if exists affiliate_commissions add column if not exists tracking_code text;
alter table if exists affiliate_commissions add column if not exists wallet_transaction_id text;
alter table if exists affiliate_commissions add column if not exists created_at timestamptz default now();
alter table if exists affiliate_commissions add column if not exists released_at timestamptz;
alter table if exists affiliate_commissions add column if not exists reversal_reason text;

alter table if exists affiliate_submissions add column if not exists id uuid default gen_random_uuid();
alter table if exists affiliate_submissions add column if not exists user_id uuid;
alter table if exists affiliate_submissions add column if not exists url text;
alter table if exists affiliate_submissions add column if not exists type text;
alter table if exists affiliate_submissions add column if not exists status text default 'pending';
alter table if exists affiliate_submissions add column if not exists created_at timestamptz default now();

-- Relax legacy constraints from older affiliate schema versions where optional
-- relationship columns were created as NOT NULL.
alter table if exists affiliate_users alter column store_id drop not null;
alter table if exists affiliate_users alter column program_id drop not null;
alter table if exists affiliate_users alter column email drop not null;
alter table if exists affiliate_users alter column platform drop not null;
alter table if exists affiliate_users alter column audience drop not null;
alter table if exists affiliate_links alter column affiliate_id drop not null;
alter table if exists affiliate_links alter column store_id drop not null;
alter table if exists affiliate_links alter column item_id drop not null;
alter table if exists affiliate_coupons alter column affiliate_id drop not null;
alter table if exists affiliate_coupons alter column store_id drop not null;
alter table if exists affiliate_clicks alter column affiliate_id drop not null;
alter table if exists affiliate_clicks alter column link_id drop not null;
alter table if exists affiliate_clicks alter column tracking_code drop not null;
alter table if exists affiliate_clicks alter column store_id drop not null;
alter table if exists affiliate_clicks alter column item_id drop not null;
alter table if exists affiliate_clicks alter column destination_url drop not null;
alter table if exists affiliate_clicks alter column path drop not null;
alter table if exists affiliate_clicks alter column expires_at drop not null;
alter table if exists affiliate_clicks alter column referrer drop not null;
alter table if exists affiliate_commissions alter column affiliate_id drop not null;
alter table if exists affiliate_commissions alter column booking_id drop not null;
alter table if exists affiliate_commissions alter column order_item_id drop not null;
alter table if exists affiliate_commissions alter column item_id drop not null;
alter table if exists affiliate_commissions alter column store_id drop not null;
alter table if exists affiliate_commissions alter column program_id drop not null;
alter table if exists affiliate_commissions alter column source_surface drop not null;
alter table if exists affiliate_commissions alter column link_id drop not null;
alter table if exists affiliate_commissions alter column coupon_id drop not null;
alter table if exists affiliate_commissions alter column tracking_code drop not null;
alter table if exists affiliate_commissions alter column wallet_transaction_id drop not null;
alter table if exists affiliate_commissions alter column released_at drop not null;
alter table if exists affiliate_commissions alter column reversal_reason drop not null;

update affiliate_profiles
set is_affiliate = coalesce(is_affiliate, false),
    onboarding_completed = coalesce(onboarding_completed, false),
    wallet_balance = coalesce(wallet_balance, 0),
    processing_balance = coalesce(processing_balance, 0),
    held_deposits = coalesce(held_deposits, 0),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now())
where is_affiliate is null
   or onboarding_completed is null
   or wallet_balance is null
   or processing_balance is null
   or held_deposits is null
   or created_at is null
   or updated_at is null;

update stores_v2
set is_published = coalesce(is_published, false),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now())
where is_published is null
   or created_at is null
   or updated_at is null;

update store_layouts
set sections = coalesce(sections, '[]'::jsonb),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now())
where sections is null
   or created_at is null
   or updated_at is null;

update store_analytics
set total_rentals = coalesce(total_rentals, 0),
    total_revenue = coalesce(total_revenue, 0),
    average_order_value = coalesce(average_order_value, 0),
    conversion_rate = coalesce(conversion_rate, 0),
    return_rate = coalesce(return_rate, 0),
    top_items = coalesce(top_items, '[]'::jsonb),
    customer_count = coalesce(customer_count, 0),
    average_rating = coalesce(average_rating, 0),
    weekly_data = coalesce(weekly_data, '[]'::jsonb),
    updated_at = coalesce(updated_at, now())
where total_rentals is null
   or total_revenue is null
   or average_order_value is null
   or conversion_rate is null
   or return_rate is null
   or top_items is null
   or customer_count is null
   or average_rating is null
   or weekly_data is null
   or updated_at is null;

update affiliate_programs
set max_reward = coalesce(max_reward, 0),
    platforms = coalesce(platforms, '[]'::jsonb),
    enable_cookies = coalesce(enable_cookies, true),
    cookie_duration = coalesce(cookie_duration, 30),
    is_active = coalesce(is_active, true),
    min_payout = coalesce(min_payout, 50),
    approval_mode = coalesce(nullif(approval_mode, ''), 'manual'),
    supported_surfaces = coalesce(supported_surfaces, '["link","coupon","spotlight","pixe","seller_referral"]'::jsonb),
    seller_bonus_amount = coalesce(seller_bonus_amount, 25),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now())
where max_reward is null
   or platforms is null
   or enable_cookies is null
   or cookie_duration is null
   or is_active is null
   or min_payout is null
   or approval_mode is null
   or approval_mode = ''
   or supported_surfaces is null
   or seller_bonus_amount is null
   or created_at is null
   or updated_at is null;

update affiliate_users
set status = coalesce(nullif(status, ''), 'new'),
    joined_at = coalesce(joined_at, now()),
    updated_at = coalesce(updated_at, now()),
    commission_rate = coalesce(commission_rate, 10),
    min_payout = coalesce(min_payout, 50),
    approval_mode = coalesce(nullif(approval_mode, ''), 'manual'),
    supported_surfaces = coalesce(supported_surfaces, '["link","coupon","spotlight","pixe","seller_referral"]'::jsonb)
where status is null
   or status = ''
   or joined_at is null
   or updated_at is null
   or commission_rate is null
   or min_payout is null
   or approval_mode is null
   or approval_mode = ''
   or supported_surfaces is null;

update affiliate_links
set original_url = coalesce(nullif(original_url, ''), destination_url),
    destination_url = coalesce(nullif(destination_url, ''), original_url),
    short_code = coalesce(
      nullif(short_code, ''),
      upper('AF' || substr(md5(coalesce(id::text, '') || coalesce(original_url, '') || coalesce(created_at::text, now()::text)), 1, 10))
    ),
    tracking_code = coalesce(
      nullif(tracking_code, ''),
      nullif(short_code, ''),
      upper('AF' || substr(md5(coalesce(id::text, '') || coalesce(destination_url, '') || coalesce(created_at::text, now()::text) || 'tracking'), 1, 10))
    ),
    clicks = coalesce(clicks, 0),
    source_surface = coalesce(nullif(source_surface, ''), 'link'),
    status = coalesce(nullif(status, ''), 'active'),
    created_at = coalesce(created_at, now())
where original_url is null
   or original_url = ''
   or destination_url is null
   or destination_url = ''
   or short_code is null
   or short_code = ''
   or tracking_code is null
   or tracking_code = ''
   or clicks is null
   or source_surface is null
   or source_surface = ''
   or status is null
   or status = ''
   or created_at is null;

update affiliate_coupons
set code = coalesce(
      nullif(code, ''),
      upper('UP' || substr(md5(coalesce(id::text, '') || coalesce(created_at::text, now()::text)), 1, 8))
    ),
    discount_percentage = coalesce(discount_percentage, 10),
    uses = coalesce(uses, 0),
    commission_rate = coalesce(commission_rate, 0.10),
    status = coalesce(nullif(status, ''), 'active'),
    created_at = coalesce(created_at, now())
where code is null
   or code = ''
   or discount_percentage is null
   or uses is null
   or commission_rate is null
   or status is null
   or status = ''
   or created_at is null;

update affiliate_clicks
set source_surface = coalesce(nullif(source_surface, ''), 'link'),
    created_at = coalesce(created_at, now())
where source_surface is null
   or source_surface = ''
   or created_at is null;

update affiliate_commissions
set amount = coalesce(amount, 0),
    commission_rate = coalesce(commission_rate, 0),
    commission_amount = coalesce(commission_amount, 0),
    status = coalesce(nullif(status, ''), 'pending'),
    created_at = coalesce(created_at, now())
where amount is null
   or commission_rate is null
   or commission_amount is null
   or status is null
   or status = ''
   or created_at is null;

update affiliate_submissions
set status = coalesce(nullif(status, ''), 'pending'),
    created_at = coalesce(created_at, now())
where status is null
   or status = ''
   or created_at is null;

create unique index if not exists affiliate_profiles_user_id_uidx
  on affiliate_profiles (user_id);

create unique index if not exists stores_v2_user_id_uidx
  on stores_v2 (user_id);

create unique index if not exists store_layouts_store_id_uidx
  on store_layouts (store_id);

create unique index if not exists store_analytics_store_id_uidx
  on store_analytics (store_id);

create unique index if not exists affiliate_programs_store_id_uidx
  on affiliate_programs (store_id);

create index if not exists affiliate_users_user_id_idx
  on affiliate_users (user_id);

create index if not exists affiliate_users_store_id_idx
  on affiliate_users (store_id);

create unique index if not exists affiliate_links_short_code_uidx
  on affiliate_links (short_code);

create unique index if not exists affiliate_links_tracking_code_uidx
  on affiliate_links (tracking_code);

create index if not exists affiliate_links_user_id_idx
  on affiliate_links (user_id);

create unique index if not exists affiliate_coupons_code_uidx
  on affiliate_coupons (upper(code));

create index if not exists affiliate_coupons_user_id_idx
  on affiliate_coupons (user_id);

create index if not exists affiliate_clicks_user_id_idx
  on affiliate_clicks (user_id);

create index if not exists affiliate_clicks_store_id_idx
  on affiliate_clicks (store_id);

create index if not exists affiliate_commissions_user_id_idx
  on affiliate_commissions (user_id);

create index if not exists affiliate_commissions_order_id_idx
  on affiliate_commissions (order_id);

create unique index if not exists affiliate_commissions_dedupe_uidx
  on affiliate_commissions (
    user_id,
    order_id,
    coalesce(booking_id, ''),
    coalesce(item_id, ''),
    event_type
  );

create index if not exists affiliate_submissions_user_id_idx
  on affiliate_submissions (user_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_affiliate_profiles on affiliate_profiles;
create trigger set_updated_at_affiliate_profiles
before update on affiliate_profiles
for each row execute function set_updated_at();

drop trigger if exists set_updated_at_stores_v2 on stores_v2;
create trigger set_updated_at_stores_v2
before update on stores_v2
for each row execute function set_updated_at();

drop trigger if exists set_updated_at_store_layouts on store_layouts;
create trigger set_updated_at_store_layouts
before update on store_layouts
for each row execute function set_updated_at();

drop trigger if exists set_updated_at_affiliate_programs on affiliate_programs;
create trigger set_updated_at_affiliate_programs
before update on affiliate_programs
for each row execute function set_updated_at();

drop trigger if exists set_updated_at_affiliate_users on affiliate_users;
create trigger set_updated_at_affiliate_users
before update on affiliate_users
for each row execute function set_updated_at();
