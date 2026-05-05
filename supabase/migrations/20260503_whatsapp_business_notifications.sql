-- WhatsApp Business notification/outbox tables for Urban Prime.
-- Run this in Supabase SQL editor before enabling WHATSAPP_ENABLED=true.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.message_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  channel text not null,
  phone_e164 text,
  category text not null,
  status text not null default 'opted_in',
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_consents_channel_check check (channel in ('whatsapp', 'email', 'push', 'in_app')),
  constraint message_consents_category_check check (category in ('authentication', 'security', 'utility', 'marketing')),
  constraint message_consents_status_check check (status in ('opted_in', 'opted_out', 'pending', 'revoked'))
);

create unique index if not exists message_consents_user_channel_category_idx
  on public.message_consents(user_id, channel, category);
create index if not exists message_consents_user_id_idx on public.message_consents(user_id);
create index if not exists message_consents_phone_e164_idx on public.message_consents(phone_e164);
create index if not exists message_consents_status_idx on public.message_consents(status);
create index if not exists message_consents_created_at_idx on public.message_consents(created_at desc);

drop trigger if exists set_message_consents_updated_at on public.message_consents;
create trigger set_message_consents_updated_at
before update on public.message_consents
for each row execute function public.set_updated_at();

create table if not exists public.message_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  channel text not null,
  category text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_preferences_channel_check check (channel in ('whatsapp', 'email', 'push', 'in_app')),
  constraint message_preferences_category_check check (category in ('authentication', 'security', 'utility', 'marketing'))
);

create unique index if not exists message_preferences_user_channel_category_idx
  on public.message_preferences(user_id, channel, category);
create index if not exists message_preferences_user_id_idx on public.message_preferences(user_id);
create index if not exists message_preferences_created_at_idx on public.message_preferences(created_at desc);

drop trigger if exists set_message_preferences_updated_at on public.message_preferences;
create trigger set_message_preferences_updated_at
before update on public.message_preferences
for each row execute function public.set_updated_at();

create table if not exists public.message_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  channel text not null,
  event_type text not null,
  template_name text,
  recipient text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  dedupe_key text,
  attempt_count integer not null default 0,
  last_error text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint message_outbox_channel_check check (channel in ('whatsapp', 'email', 'push', 'in_app')),
  constraint message_outbox_attempt_count_check check (attempt_count >= 0)
);

create index if not exists message_outbox_user_id_idx on public.message_outbox(user_id);
create index if not exists message_outbox_status_idx on public.message_outbox(status);
create index if not exists message_outbox_dedupe_key_idx on public.message_outbox(dedupe_key);
create index if not exists message_outbox_provider_message_id_idx on public.message_outbox(provider_message_id);
create index if not exists message_outbox_created_at_idx on public.message_outbox(created_at desc);
create index if not exists message_outbox_event_type_idx on public.message_outbox(event_type);

drop trigger if exists set_message_outbox_updated_at on public.message_outbox;
create trigger set_message_outbox_updated_at
before update on public.message_outbox
for each row execute function public.set_updated_at();

create table if not exists public.message_deliveries (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid references public.message_outbox(id) on delete set null,
  provider text not null,
  provider_message_id text,
  status text not null,
  raw_event jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists message_deliveries_outbox_id_idx on public.message_deliveries(outbox_id);
create index if not exists message_deliveries_provider_message_id_idx on public.message_deliveries(provider_message_id);
create index if not exists message_deliveries_status_idx on public.message_deliveries(status);
create index if not exists message_deliveries_created_at_idx on public.message_deliveries(created_at desc);
