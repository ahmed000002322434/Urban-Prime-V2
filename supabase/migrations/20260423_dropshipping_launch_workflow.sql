begin;

create extension if not exists pgcrypto;

alter table if exists public.shipments add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.shipments add column if not exists updated_at timestamptz not null default now();
drop trigger if exists set_shipments_updated_at on public.shipments;
create trigger set_shipments_updated_at before update on public.shipments
for each row execute function public.set_updated_at();

do $$ begin
  alter type public.supplier_order_status add value if not exists 'pending_review';
exception when duplicate_object then null;
end $$;
do $$ begin
  alter type public.supplier_order_status add value if not exists 'approved';
exception when duplicate_object then null;
end $$;
do $$ begin
  alter type public.supplier_order_status add value if not exists 'submitted';
exception when duplicate_object then null;
end $$;
do $$ begin
  alter type public.supplier_order_status add value if not exists 'accepted';
exception when duplicate_object then null;
end $$;
do $$ begin
  alter type public.supplier_order_status add value if not exists 'failed';
exception when duplicate_object then null;
end $$;
do $$ begin
  alter type public.supplier_order_status add value if not exists 'returned';
exception when duplicate_object then null;
end $$;

alter table public.suppliers add column if not exists status text;
alter table public.suppliers add column if not exists fulfillment_mode text;
alter table public.suppliers add column if not exists default_routing_mode text;
alter table public.suppliers add column if not exists sla_days integer;
alter table public.suppliers add column if not exists blind_dropship boolean not null default true;
alter table public.suppliers add column if not exists shipping_profile jsonb not null default '{}'::jsonb;
alter table public.suppliers add column if not exists return_policy jsonb not null default '{}'::jsonb;
alter table public.suppliers add column if not exists branding_options jsonb not null default '{}'::jsonb;
alter table public.suppliers add column if not exists settlement_terms jsonb not null default '{}'::jsonb;
alter table public.suppliers add column if not exists contact_channels jsonb not null default '{}'::jsonb;
alter table public.suppliers add column if not exists api_config jsonb not null default '{}'::jsonb;
alter table public.suppliers add column if not exists admin_notes text;
alter table public.suppliers add column if not exists updated_at timestamptz not null default now();

update public.suppliers
set status = coalesce(nullif(status, ''), 'draft'),
    fulfillment_mode = coalesce(nullif(fulfillment_mode, ''), 'manual_panel'),
    default_routing_mode = coalesce(nullif(default_routing_mode, ''), 'seller_approve'),
    shipping_profile = coalesce(shipping_profile, '{}'::jsonb),
    return_policy = coalesce(return_policy, '{}'::jsonb),
    branding_options = coalesce(branding_options, '{}'::jsonb),
    settlement_terms = coalesce(settlement_terms, '{}'::jsonb),
    contact_channels = coalesce(contact_channels, '{}'::jsonb),
    api_config = coalesce(api_config, '{}'::jsonb),
    blind_dropship = coalesce(blind_dropship, true)
where true;

alter table public.suppliers alter column status set default 'draft';
alter table public.suppliers alter column fulfillment_mode set default 'manual_panel';
alter table public.suppliers alter column default_routing_mode set default 'seller_approve';
alter table public.suppliers alter column shipping_profile set default '{}'::jsonb;
alter table public.suppliers alter column return_policy set default '{}'::jsonb;
alter table public.suppliers alter column branding_options set default '{}'::jsonb;
alter table public.suppliers alter column settlement_terms set default '{}'::jsonb;
alter table public.suppliers alter column contact_channels set default '{}'::jsonb;
alter table public.suppliers alter column api_config set default '{}'::jsonb;
alter table public.suppliers alter column updated_at set default now();
alter table public.suppliers alter column updated_at set not null;

alter table if exists public.suppliers drop constraint if exists suppliers_status_check;
alter table if exists public.suppliers drop constraint if exists suppliers_fulfillment_mode_check;
alter table if exists public.suppliers drop constraint if exists suppliers_default_routing_mode_check;
alter table public.suppliers add constraint suppliers_status_check check (status in ('draft', 'active', 'paused', 'blocked'));
alter table public.suppliers add constraint suppliers_fulfillment_mode_check check (fulfillment_mode in ('manual_email', 'manual_panel', 'api'));
alter table public.suppliers add constraint suppliers_default_routing_mode_check check (default_routing_mode in ('manual_review', 'seller_approve', 'auto_submit'));

create index if not exists idx_suppliers_status on public.suppliers(status);
drop trigger if exists set_suppliers_updated_at on public.suppliers;
create trigger set_suppliers_updated_at before update on public.suppliers
for each row execute function public.set_updated_at();

alter table public.supplier_products add column if not exists status text;
alter table public.supplier_products add column if not exists currency text;
alter table public.supplier_products add column if not exists wholesale_price numeric(12,2);
alter table public.supplier_products add column if not exists shipping_cost numeric(12,2);
alter table public.supplier_products add column if not exists min_order_quantity integer;
alter table public.supplier_products add column if not exists processing_time_days integer;
alter table public.supplier_products add column if not exists attributes jsonb not null default '{}'::jsonb;
alter table public.supplier_products add column if not exists image_urls jsonb not null default '[]'::jsonb;
alter table public.supplier_products add column if not exists category text;
alter table public.supplier_products add column if not exists seller_visibility text;
alter table public.supplier_products add column if not exists sync_mode text;
alter table public.supplier_products add column if not exists legacy_source_ref text;
alter table public.supplier_products add column if not exists description text;
alter table public.supplier_products add column if not exists last_synced_at timestamptz;
alter table public.supplier_products add column if not exists updated_at timestamptz not null default now();

update public.supplier_products
set status = coalesce(nullif(status, ''), 'active'),
    currency = coalesce(nullif(currency, ''), 'USD'),
    wholesale_price = coalesce(wholesale_price, price, 0),
    shipping_cost = coalesce(shipping_cost, ((coalesce(data, '{}'::jsonb) -> 'shippingInfo' ->> 'cost')::numeric), 0),
    min_order_quantity = coalesce(min_order_quantity, 1),
    processing_time_days = coalesce(processing_time_days, 0),
    attributes = coalesce(attributes, '{}'::jsonb),
    image_urls = case when image_urls is null or jsonb_typeof(image_urls) <> 'array' then coalesce(data -> 'imageUrls', '[]'::jsonb) else image_urls end,
    category = coalesce(category, nullif(data ->> 'category', ''), ''),
    seller_visibility = coalesce(nullif(seller_visibility, ''), 'approved_only'),
    sync_mode = coalesce(nullif(sync_mode, ''), 'managed'),
    updated_at = coalesce(updated_at, now())
where true;

alter table public.supplier_products alter column status set default 'active';
alter table public.supplier_products alter column currency set default 'USD';
alter table public.supplier_products alter column wholesale_price set default 0;
alter table public.supplier_products alter column shipping_cost set default 0;
alter table public.supplier_products alter column min_order_quantity set default 1;
alter table public.supplier_products alter column processing_time_days set default 0;
alter table public.supplier_products alter column attributes set default '{}'::jsonb;
alter table public.supplier_products alter column image_urls set default '[]'::jsonb;
alter table public.supplier_products alter column seller_visibility set default 'approved_only';
alter table public.supplier_products alter column sync_mode set default 'managed';
alter table public.supplier_products alter column updated_at set default now();

alter table if exists public.supplier_products drop constraint if exists supplier_products_status_check;
alter table if exists public.supplier_products drop constraint if exists supplier_products_visibility_check;
alter table if exists public.supplier_products drop constraint if exists supplier_products_sync_mode_check;
alter table public.supplier_products add constraint supplier_products_status_check check (status in ('draft', 'active', 'paused', 'archived'));
alter table public.supplier_products add constraint supplier_products_visibility_check check (seller_visibility in ('approved_only', 'all_sellers', 'hidden'));
alter table public.supplier_products add constraint supplier_products_sync_mode_check check (sync_mode in ('managed', 'api', 'csv'));

create index if not exists idx_supplier_products_status on public.supplier_products(status);
create index if not exists idx_supplier_products_legacy_ref on public.supplier_products(legacy_source_ref);
create index if not exists idx_supplier_products_supplier_status on public.supplier_products(supplier_id, status);
drop trigger if exists set_supplier_products_updated_at on public.supplier_products;
create trigger set_supplier_products_updated_at before update on public.supplier_products
for each row execute function public.set_updated_at();

alter table public.supplier_orders add column if not exists order_item_id uuid references public.order_items(id) on delete set null;
alter table public.supplier_orders add column if not exists item_id uuid references public.items(id) on delete set null;
alter table public.supplier_orders add column if not exists seller_id uuid references public.users(id) on delete set null;
alter table public.supplier_orders add column if not exists buyer_id uuid references public.users(id) on delete set null;
alter table public.supplier_orders add column if not exists supplier_product_id uuid references public.supplier_products(id) on delete set null;
alter table public.supplier_orders add column if not exists routing_mode text;
alter table public.supplier_orders add column if not exists approval_state text;
alter table public.supplier_orders add column if not exists supplier_cost_snapshot numeric(12,2);
alter table public.supplier_orders add column if not exists shipping_cost_snapshot numeric(12,2);
alter table public.supplier_orders add column if not exists seller_sale_price_snapshot numeric(12,2);
alter table public.supplier_orders add column if not exists payable_total numeric(12,2);
alter table public.supplier_orders add column if not exists margin_snapshot numeric(12,2);
alter table public.supplier_orders add column if not exists currency text;
alter table public.supplier_orders add column if not exists external_order_ref text;
alter table public.supplier_orders add column if not exists external_status text;
alter table public.supplier_orders add column if not exists carrier text;
alter table public.supplier_orders add column if not exists label_url text;
alter table public.supplier_orders add column if not exists approved_at timestamptz;
alter table public.supplier_orders add column if not exists submitted_at timestamptz;
alter table public.supplier_orders add column if not exists accepted_at timestamptz;
alter table public.supplier_orders add column if not exists shipped_at timestamptz;
alter table public.supplier_orders add column if not exists delivered_at timestamptz;
alter table public.supplier_orders add column if not exists cancelled_at timestamptz;
alter table public.supplier_orders add column if not exists failed_at timestamptz;
alter table public.supplier_orders add column if not exists returned_at timestamptz;
alter table public.supplier_orders add column if not exists failure_reason text;
alter table public.supplier_orders add column if not exists cancel_reason text;
alter table public.supplier_orders add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.supplier_orders add column if not exists updated_at timestamptz not null default now();

update public.supplier_orders
set status = case when status::text = 'pending' then 'pending_review'::public.supplier_order_status else status end,
    routing_mode = coalesce(nullif(routing_mode, ''), 'seller_approve'),
    approval_state = coalesce(nullif(approval_state, ''), 'pending'),
    supplier_cost_snapshot = coalesce(supplier_cost_snapshot, 0),
    shipping_cost_snapshot = coalesce(shipping_cost_snapshot, 0),
    seller_sale_price_snapshot = coalesce(seller_sale_price_snapshot, 0),
    payable_total = coalesce(payable_total, 0),
    margin_snapshot = coalesce(margin_snapshot, 0),
    currency = coalesce(nullif(currency, ''), 'USD'),
    metadata = coalesce(metadata, '{}'::jsonb),
    updated_at = coalesce(updated_at, now())
where true;

alter table public.supplier_orders alter column routing_mode set default 'seller_approve';
alter table public.supplier_orders alter column approval_state set default 'pending';
alter table public.supplier_orders alter column supplier_cost_snapshot set default 0;
alter table public.supplier_orders alter column shipping_cost_snapshot set default 0;
alter table public.supplier_orders alter column seller_sale_price_snapshot set default 0;
alter table public.supplier_orders alter column payable_total set default 0;
alter table public.supplier_orders alter column margin_snapshot set default 0;
alter table public.supplier_orders alter column currency set default 'USD';
alter table public.supplier_orders alter column metadata set default '{}'::jsonb;
alter table public.supplier_orders alter column updated_at set default now();

alter table if exists public.supplier_orders drop constraint if exists supplier_orders_routing_mode_check;
alter table if exists public.supplier_orders drop constraint if exists supplier_orders_approval_state_check;
alter table public.supplier_orders add constraint supplier_orders_routing_mode_check check (routing_mode in ('manual_review', 'seller_approve', 'auto_submit'));
alter table public.supplier_orders add constraint supplier_orders_approval_state_check check (approval_state in ('pending', 'approved', 'rejected', 'cancelled', 'not_required'));

create index if not exists idx_supplier_orders_order_item on public.supplier_orders(order_item_id);
create index if not exists idx_supplier_orders_seller_status on public.supplier_orders(seller_id, status, created_at desc);
create index if not exists idx_supplier_orders_supplier_status on public.supplier_orders(supplier_id, status, created_at desc);
create index if not exists idx_supplier_orders_external_ref on public.supplier_orders(external_order_ref);
drop trigger if exists set_supplier_orders_updated_at on public.supplier_orders;
create trigger set_supplier_orders_updated_at before update on public.supplier_orders
for each row execute function public.set_updated_at();

create table if not exists public.seller_dropship_profiles (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  seller_persona_id uuid references public.personas(id) on delete set null,
  status text not null default 'draft',
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  risk_notes text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_seller_dropship_profiles_seller on public.seller_dropship_profiles(seller_id);
drop trigger if exists set_seller_dropship_profiles_updated_at on public.seller_dropship_profiles;
create trigger set_seller_dropship_profiles_updated_at before update on public.seller_dropship_profiles
for each row execute function public.set_updated_at();
alter table if exists public.seller_dropship_profiles drop constraint if exists seller_dropship_profiles_status_check;
alter table public.seller_dropship_profiles add constraint seller_dropship_profiles_status_check check (status in ('draft', 'pending', 'approved', 'suspended', 'rejected'));

create table if not exists public.supplier_settlements (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  status text not null default 'draft',
  amount_total numeric(12,2) not null default 0,
  currency text not null default 'USD',
  external_ref text,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  settled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_supplier_settlements_supplier on public.supplier_settlements(supplier_id, status, created_at desc);
drop trigger if exists set_supplier_settlements_updated_at on public.supplier_settlements;
create trigger set_supplier_settlements_updated_at before update on public.supplier_settlements
for each row execute function public.set_updated_at();
alter table if exists public.supplier_settlements drop constraint if exists supplier_settlements_status_check;
alter table public.supplier_settlements add constraint supplier_settlements_status_check check (status in ('draft', 'ready', 'settled', 'reversed'));

create table if not exists public.supplier_settlement_lines (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.supplier_settlements(id) on delete cascade,
  supplier_order_id uuid not null references public.supplier_orders(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_supplier_settlement_lines_unique on public.supplier_settlement_lines(settlement_id, supplier_order_id);
create index if not exists idx_supplier_settlement_lines_order on public.supplier_settlement_lines(supplier_order_id);

alter table public.seller_dropship_profiles enable row level security;
alter table public.supplier_settlements enable row level security;
alter table public.supplier_settlement_lines enable row level security;

drop policy if exists "service_role_all_seller_dropship_profiles" on public.seller_dropship_profiles;
create policy "service_role_all_seller_dropship_profiles" on public.seller_dropship_profiles for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_supplier_settlements" on public.supplier_settlements;
create policy "service_role_all_supplier_settlements" on public.supplier_settlements for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "service_role_all_supplier_settlement_lines" on public.supplier_settlement_lines;
create policy "service_role_all_supplier_settlement_lines" on public.supplier_settlement_lines for all using (public.is_service_role()) with check (public.is_service_role());

insert into public.site_settings (key, value)
values (
  'platform',
  jsonb_build_object(
    'dropshipping',
    jsonb_build_object(
      'enabled', true,
      'requireApproval', true,
      'allowAutoSubmit', true,
      'catalogMode', 'managed',
      'buyerRelationship', 'seller_only'
    )
  )
)
on conflict (key) do update
set value = coalesce(public.site_settings.value, '{}'::jsonb) || jsonb_build_object(
  'dropshipping',
  coalesce(public.site_settings.value -> 'dropshipping', '{}'::jsonb) || jsonb_build_object(
    'enabled', true,
    'requireApproval', true,
    'allowAutoSubmit', true,
    'catalogMode', 'managed',
    'buyerRelationship', 'seller_only'
  )
);

notify pgrst, 'reload schema';

commit;
