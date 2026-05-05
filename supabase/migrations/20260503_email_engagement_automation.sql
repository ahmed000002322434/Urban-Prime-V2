-- Urban Prime email engagement automation
-- Tracks last site activity and throttles indirect re-engagement emails.

create table if not exists public.email_engagement_state (
  user_id uuid primary key references public.users(id) on delete cascade,
  last_seen_at timestamptz,
  last_reengagement_at timestamptz,
  last_message_email_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_engagement_state_last_seen_idx
  on public.email_engagement_state (last_seen_at);

create index if not exists email_engagement_state_last_reengagement_idx
  on public.email_engagement_state (last_reengagement_at);

create index if not exists email_engagement_state_updated_at_idx
  on public.email_engagement_state (updated_at);

alter table public.email_engagement_state enable row level security;

drop policy if exists "Users can read own email engagement state"
  on public.email_engagement_state;

create policy "Users can read own email engagement state"
  on public.email_engagement_state
  for select
  using (auth.uid()::text = (
    select firebase_uid from public.users where users.id = email_engagement_state.user_id
  ));

drop policy if exists "Users can upsert own email engagement state"
  on public.email_engagement_state;

create policy "Users can upsert own email engagement state"
  on public.email_engagement_state
  for all
  using (auth.uid()::text = (
    select firebase_uid from public.users where users.id = email_engagement_state.user_id
  ))
  with check (auth.uid()::text = (
    select firebase_uid from public.users where users.id = email_engagement_state.user_id
  ));
