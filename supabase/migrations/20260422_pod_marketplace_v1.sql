-- POD marketplace v1
-- Manual print-on-demand jobs and seller production queue.

create table if not exists public.pod_jobs (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  buyer_id uuid not null references public.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  status text not null default 'queued' check (
    status in (
      'queued',
      'reviewing',
      'in_production',
      'printed',
      'packed',
      'shipped',
      'completed',
      'cancelled'
    )
  ),
  variant_snapshot jsonb not null default '{}'::jsonb,
  design_snapshot jsonb not null default '{}'::jsonb,
  shipping_snapshot jsonb not null default '{}'::jsonb,
  tracking_number text,
  carrier text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_item_id)
);

create index if not exists idx_pod_jobs_seller_created on public.pod_jobs(seller_id, created_at desc);
create index if not exists idx_pod_jobs_buyer_created on public.pod_jobs(buyer_id, created_at desc);
create index if not exists idx_pod_jobs_status_created on public.pod_jobs(status, created_at desc);
create index if not exists idx_pod_jobs_item_created on public.pod_jobs(item_id, created_at desc);

drop trigger if exists set_pod_jobs_updated_at on public.pod_jobs;
create trigger set_pod_jobs_updated_at before update on public.pod_jobs
for each row execute function public.set_updated_at();

alter table public.pod_jobs enable row level security;

drop policy if exists "service_role_all_pod_jobs" on public.pod_jobs;
create policy "service_role_all_pod_jobs" on public.pod_jobs for all
using (public.is_service_role())
with check (public.is_service_role());
