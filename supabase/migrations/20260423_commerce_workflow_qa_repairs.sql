-- QA repair for canonical commerce drift discovered on 2026-04-23.
-- Safe to run after the earlier commerce launch migrations.

begin;

create extension if not exists pgcrypto;

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.webhook_events add column if not exists provider text;
alter table public.webhook_events add column if not exists idempotency_key text;
alter table public.webhook_events add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.webhook_events add column if not exists created_at timestamptz not null default now();

update public.webhook_events
set payload = '{}'::jsonb
where payload is null;

alter table public.webhook_events
  alter column provider set not null;
alter table public.webhook_events
  alter column idempotency_key set not null;
alter table public.webhook_events
  alter column payload set default '{}'::jsonb;
alter table public.webhook_events
  alter column payload set not null;
alter table public.webhook_events
  alter column created_at set default now();
alter table public.webhook_events
  alter column created_at set not null;

create unique index if not exists idx_webhook_events_provider_idempotency_unique
  on public.webhook_events(provider, idempotency_key);
create index if not exists idx_webhook_events_provider_created
  on public.webhook_events(provider, created_at desc);

create table if not exists public.auction_sessions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  status text not null default 'live',
  highest_bid_id uuid references public.auction_bids(id) on delete set null,
  winner_id uuid references public.users(id) on delete set null,
  winner_checkout_expires_at timestamptz,
  reserve_met boolean not null default false,
  closed_at timestamptz,
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
alter table public.auction_sessions add column if not exists created_at timestamptz not null default now();
alter table public.auction_sessions add column if not exists updated_at timestamptz not null default now();

update public.auction_sessions
set status = coalesce(nullif(status, ''), 'live')
where status is null or status = '';

update public.auction_sessions
set reserve_met = false
where reserve_met is null;

alter table public.auction_sessions
  alter column item_id set not null;
alter table public.auction_sessions
  alter column status set default 'live';
alter table public.auction_sessions
  alter column status set not null;
alter table public.auction_sessions
  alter column reserve_met set default false;
alter table public.auction_sessions
  alter column reserve_met set not null;
alter table public.auction_sessions
  alter column created_at set default now();
alter table public.auction_sessions
  alter column created_at set not null;
alter table public.auction_sessions
  alter column updated_at set default now();
alter table public.auction_sessions
  alter column updated_at set not null;

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

create unique index if not exists idx_rental_blocks_booking_unique
  on public.rental_blocks(rental_booking_id)
  where rental_booking_id is not null;

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'set_updated_at'
      and pg_function_is_visible(oid)
  ) then
    execute 'drop trigger if exists set_auction_sessions_updated_at on public.auction_sessions';
    execute 'create trigger set_auction_sessions_updated_at before update on public.auction_sessions for each row execute function public.set_updated_at()';
  end if;
end $$;

alter table public.webhook_events enable row level security;
alter table public.auction_sessions enable row level security;

drop policy if exists "service_role_all_webhook_events" on public.webhook_events;
create policy "service_role_all_webhook_events"
  on public.webhook_events
  for all
  using (public.is_service_role())
  with check (public.is_service_role());

drop policy if exists "service_role_all_auction_sessions" on public.auction_sessions;
create policy "service_role_all_auction_sessions"
  on public.auction_sessions
  for all
  using (public.is_service_role())
  with check (public.is_service_role());

notify pgrst, 'reload schema';

commit;

select
  to_regclass('public.webhook_events') as webhook_events,
  to_regclass('public.auction_sessions') as auction_sessions,
  (select indexname from pg_indexes where schemaname = 'public' and indexname = 'idx_rental_blocks_booking_unique' limit 1) as rental_blocks_booking_unique_index;
