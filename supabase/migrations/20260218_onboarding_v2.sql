-- Urban Prime Onboarding V2 migration
-- Date: 2026-02-18

begin;

-- Extend user_profiles with onboarding-critical fields.
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

-- Persist resumable onboarding state.
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

-- RLS + policies.
alter table public.user_onboarding_state enable row level security;
drop policy if exists "service_role_all_user_onboarding_state" on public.user_onboarding_state;
create policy "service_role_all_user_onboarding_state" on public.user_onboarding_state
for all using (public.is_service_role()) with check (public.is_service_role());
drop policy if exists "user_onboarding_state_owner" on public.user_onboarding_state;
create policy "user_onboarding_state_owner" on public.user_onboarding_state
for all using (public.is_service_role() or user_id = auth.uid())
with check (public.is_service_role() or user_id = auth.uid());

-- Ensure each user has a profile row.
insert into public.user_profiles (user_id)
select u.id
from public.users u
left join public.user_profiles p on p.user_id = u.id
where p.user_id is null;

-- Normalize interests column shape.
update public.user_profiles
set interests = '[]'::jsonb
where interests is null or jsonb_typeof(interests) <> 'array';

-- Backfill completion markers and onboarding state.
with normalized as (
  select
    u.id as user_id,
    u.name,
    u.phone,
    u.avatar_url,
    p.country,
    p.city,
    p.currency_preference,
    p.purpose,
    p.interests,
    p.business_name,
    p.business_description,
    p.about,
    case
      when lower(coalesce(trim(p.purpose), '')) = 'both' then '["buy","sell"]'::jsonb
      when lower(coalesce(trim(p.purpose), '')) = 'list' then '["sell"]'::jsonb
      when lower(coalesce(trim(p.purpose), '')) = 'rent' then '["rent"]'::jsonb
      when coalesce(trim(p.purpose), '') = '' then '[]'::jsonb
      else to_jsonb(array_remove(regexp_split_to_array(lower(p.purpose), '\s*,\s*'), ''))
    end as selected_intents
  from public.users u
  join public.user_profiles p on p.user_id = u.id
), completion as (
  select
    n.*,
    (
      coalesce(trim(n.name), '') <> ''
      and coalesce(trim(n.phone), '') ~ '^\+[1-9][0-9]{6,14}$'
      and coalesce(trim(n.country), '') <> ''
      and coalesce(trim(n.city), '') <> ''
      and coalesce(trim(n.currency_preference), '') <> ''
      and jsonb_array_length(coalesce(n.interests, '[]'::jsonb)) > 0
      and jsonb_array_length(n.selected_intents) > 0
    ) as is_complete
  from normalized n
)
update public.user_profiles p
set onboarding_required = not c.is_complete,
    onboarding_completed_at = case
      when c.is_complete then coalesce(p.onboarding_completed_at, now())
      else null
    end,
    profile_version = greatest(coalesce(p.profile_version, 1), 1)
from completion c
where p.user_id = c.user_id;

with normalized as (
  select
    u.id as user_id,
    u.name,
    u.phone,
    u.avatar_url,
    p.country,
    p.city,
    p.currency_preference,
    p.purpose,
    p.interests,
    p.business_name,
    p.business_description,
    p.about,
    case
      when lower(coalesce(trim(p.purpose), '')) = 'both' then '["buy","sell"]'::jsonb
      when lower(coalesce(trim(p.purpose), '')) = 'list' then '["sell"]'::jsonb
      when lower(coalesce(trim(p.purpose), '')) = 'rent' then '["rent"]'::jsonb
      when coalesce(trim(p.purpose), '') = '' then '[]'::jsonb
      else to_jsonb(array_remove(regexp_split_to_array(lower(p.purpose), '\s*,\s*'), ''))
    end as selected_intents
  from public.users u
  join public.user_profiles p on p.user_id = u.id
), completion as (
  select
    n.*,
    (
      coalesce(trim(n.name), '') <> ''
      and coalesce(trim(n.phone), '') ~ '^\+[1-9][0-9]{6,14}$'
      and coalesce(trim(n.country), '') <> ''
      and coalesce(trim(n.city), '') <> ''
      and coalesce(trim(n.currency_preference), '') <> ''
      and jsonb_array_length(coalesce(n.interests, '[]'::jsonb)) > 0
      and jsonb_array_length(n.selected_intents) > 0
    ) as is_complete
  from normalized n
)
insert into public.user_onboarding_state (
  user_id,
  current_step,
  flow_version,
  selected_intents,
  draft,
  started_at,
  updated_at
)
select
  c.user_id,
  case when c.is_complete then 'completed' else 'intent' end as current_step,
  1,
  c.selected_intents,
  jsonb_build_object(
    'intent', jsonb_build_object('selectedIntents', c.selected_intents),
    'identity', jsonb_build_object(
      'name', coalesce(c.name, ''),
      'phone', coalesce(c.phone, ''),
      'country', coalesce(c.country, ''),
      'city', coalesce(c.city, ''),
      'currencyPreference', coalesce(c.currency_preference, ''),
      'avatarUrl', coalesce(c.avatar_url, '')
    ),
    'preferences', jsonb_build_object('interests', coalesce(c.interests, '[]'::jsonb)),
    'roleSetup', jsonb_build_object(
      'businessName', coalesce(c.business_name, ''),
      'businessDescription', coalesce(c.business_description, ''),
      'about', coalesce(c.about, '')
    )
  ),
  now(),
  now()
from completion c
on conflict (user_id) do update
set
  selected_intents = excluded.selected_intents,
  current_step = case
    when public.user_onboarding_state.current_step = 'completed' then 'completed'
    when excluded.current_step = 'completed' then 'completed'
    else public.user_onboarding_state.current_step
  end,
  draft = public.user_onboarding_state.draft || excluded.draft,
  flow_version = greatest(public.user_onboarding_state.flow_version, excluded.flow_version),
  updated_at = now();

commit;
