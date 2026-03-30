begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  create type public.spotlight_media_type as enum ('image', 'video');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.spotlight_visibility as enum ('public', 'followers', 'private');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.spotlight_status as enum ('draft', 'published', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.spotlight_product_link_placement as enum ('inline_chip', 'mini_card', 'context_mode', 'hero');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.spotlight_product_link_source as enum ('creator_tagged', 'algorithmic', 'campaign');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.spotlight_product_event_type as enum ('impression', 'click', 'view_item', 'add_to_cart', 'purchase');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.spotlight_commission_status as enum ('pending', 'approved', 'paid', 'void');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if to_regtype('public.notification_type') is not null then
    alter type public.notification_type add value if not exists 'social_like';
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if to_regtype('public.notification_type') is not null then
    alter type public.notification_type add value if not exists 'social_comment';
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if to_regtype('public.notification_type') is not null then
    alter type public.notification_type add value if not exists 'social_follow';
  end if;
exception
  when duplicate_object then null;
end $$;

create table if not exists public.spotlight_content (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references public.users(id) on delete cascade,
  media_type public.spotlight_media_type not null,
  media_url text not null,
  thumbnail_url text,
  caption text not null default '',
  hashtags jsonb not null default '[]'::jsonb,
  interest_tags jsonb not null default '[]'::jsonb,
  visibility public.spotlight_visibility not null default 'public',
  allow_comments boolean not null default true,
  status public.spotlight_status not null default 'draft',
  published_at timestamptz,
  feed_score numeric(14, 4) not null default 0,
  trending_score numeric(14, 4) not null default 0,
  reposted_from_content_id uuid references public.spotlight_content(id) on delete set null,
  legacy_source text,
  legacy_source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spotlight_content_hashtags_array check (jsonb_typeof(hashtags) = 'array'),
  constraint spotlight_content_interest_tags_array check (jsonb_typeof(interest_tags) = 'array'),
  constraint spotlight_content_legacy_pair check (
    (legacy_source is null and legacy_source_id is null)
    or (legacy_source is not null and legacy_source_id is not null)
  )
);

alter table public.spotlight_content add column if not exists legacy_source text;
alter table public.spotlight_content add column if not exists legacy_source_id text;

create index if not exists idx_spotlight_content_creator on public.spotlight_content(creator_user_id, created_at desc);
create index if not exists idx_spotlight_content_status_visibility on public.spotlight_content(status, visibility, published_at desc);
create index if not exists idx_spotlight_content_feed_rank on public.spotlight_content(feed_score desc, published_at desc, id desc);
create index if not exists idx_spotlight_content_trending_rank on public.spotlight_content(trending_score desc, published_at desc, id desc);
create index if not exists idx_spotlight_content_hashtags_gin on public.spotlight_content using gin (hashtags);
create index if not exists idx_spotlight_content_interest_tags_gin on public.spotlight_content using gin (interest_tags);
create unique index if not exists idx_spotlight_content_legacy_unique on public.spotlight_content(legacy_source, legacy_source_id);

drop trigger if exists set_spotlight_content_updated_at on public.spotlight_content;
create trigger set_spotlight_content_updated_at
before update on public.spotlight_content
for each row execute function public.set_updated_at();

create table if not exists public.spotlight_metrics (
  content_id uuid primary key references public.spotlight_content(id) on delete cascade,
  impressions bigint not null default 0,
  views bigint not null default 0,
  watch_time_ms bigint not null default 0,
  likes integer not null default 0,
  comments integer not null default 0,
  saves integer not null default 0,
  shares integer not null default 0,
  dislikes integer not null default 0,
  reposts integer not null default 0,
  reports integer not null default 0,
  product_clicks integer not null default 0,
  product_item_views integer not null default 0,
  product_cart_adds integer not null default 0,
  product_purchases integer not null default 0,
  product_revenue_amount numeric(12, 2) not null default 0,
  product_ctr numeric(10, 4) not null default 0,
  product_conversion_rate numeric(10, 4) not null default 0,
  engagement_rate numeric(10, 4) not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_spotlight_metrics_updated_at on public.spotlight_metrics;
create trigger set_spotlight_metrics_updated_at
before update on public.spotlight_metrics
for each row execute function public.set_updated_at();

create table if not exists public.spotlight_feed_impressions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.spotlight_content(id) on delete cascade,
  viewer_user_id uuid references public.users(id) on delete set null,
  viewer_session_key text not null,
  surface text not null default 'feed',
  feed_mode text not null default 'for_you',
  position integer not null default 0,
  dedupe_key text not null,
  impressed_at timestamptz not null default now()
);

create unique index if not exists idx_spotlight_feed_impressions_dedupe on public.spotlight_feed_impressions(dedupe_key);
create index if not exists idx_spotlight_feed_impressions_content on public.spotlight_feed_impressions(content_id, impressed_at desc);

create table if not exists public.spotlight_views (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.spotlight_content(id) on delete cascade,
  viewer_user_id uuid references public.users(id) on delete set null,
  viewer_session_key text not null,
  view_type public.spotlight_media_type not null,
  watch_time_ms bigint not null default 0,
  dedupe_key text not null,
  viewed_at timestamptz not null default now()
);

create unique index if not exists idx_spotlight_views_dedupe on public.spotlight_views(dedupe_key);
create index if not exists idx_spotlight_views_content_time on public.spotlight_views(content_id, viewed_at desc);

create table if not exists public.spotlight_likes (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.spotlight_content(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_spotlight_likes_unique on public.spotlight_likes(content_id, user_id);
create index if not exists idx_spotlight_likes_user on public.spotlight_likes(user_id, created_at desc);

create table if not exists public.spotlight_dislikes (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.spotlight_content(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_spotlight_dislikes_unique on public.spotlight_dislikes(content_id, user_id);
create index if not exists idx_spotlight_dislikes_user on public.spotlight_dislikes(user_id, created_at desc);

create table if not exists public.spotlight_reposts (
  id uuid primary key default gen_random_uuid(),
  source_content_id uuid not null references public.spotlight_content(id) on delete cascade,
  reposted_content_id uuid references public.spotlight_content(id) on delete set null,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_spotlight_reposts_unique on public.spotlight_reposts(source_content_id, user_id);
create index if not exists idx_spotlight_reposts_user on public.spotlight_reposts(user_id, created_at desc);

create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  content_id uuid not null references public.spotlight_content(id) on delete cascade,
  content_type text not null default 'spotlight',
  saved_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists idx_saved_items_unique on public.saved_items(user_id, content_id);
create index if not exists idx_saved_items_user_time on public.saved_items(user_id, saved_at desc);

create table if not exists public.spotlight_comments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.spotlight_content(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  parent_comment_id uuid references public.spotlight_comments(id) on delete cascade,
  body text not null,
  like_count integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_spotlight_comments_content on public.spotlight_comments(content_id, created_at desc);
create index if not exists idx_spotlight_comments_parent on public.spotlight_comments(parent_comment_id, created_at asc);

drop trigger if exists set_spotlight_comments_updated_at on public.spotlight_comments;
create trigger set_spotlight_comments_updated_at
before update on public.spotlight_comments
for each row execute function public.set_updated_at();

create table if not exists public.spotlight_comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.spotlight_comments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_spotlight_comment_likes_unique on public.spotlight_comment_likes(comment_id, user_id);

create table if not exists public.spotlight_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.users(id) on delete cascade,
  content_id uuid references public.spotlight_content(id) on delete cascade,
  comment_id uuid references public.spotlight_comments(id) on delete cascade,
  reported_user_id uuid references public.users(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists idx_spotlight_reports_status on public.spotlight_reports(status, created_at desc);

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references public.users(id) on delete cascade,
  blocked_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_blocks_no_self_block check (blocker_user_id <> blocked_user_id)
);

create unique index if not exists idx_user_blocks_unique on public.user_blocks(blocker_user_id, blocked_user_id);

create table if not exists public.user_restrictions (
  id uuid primary key default gen_random_uuid(),
  restrictor_user_id uuid not null references public.users(id) on delete cascade,
  restricted_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_restrictions_no_self_restrict check (restrictor_user_id <> restricted_user_id)
);

create unique index if not exists idx_user_restrictions_unique on public.user_restrictions(restrictor_user_id, restricted_user_id);

create table if not exists public.spotlight_product_links (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.spotlight_content(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  linked_by_user_id uuid references public.users(id) on delete set null,
  placement public.spotlight_product_link_placement not null default 'inline_chip',
  cta_label text not null default 'Shop now',
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  source public.spotlight_product_link_source not null default 'creator_tagged',
  campaign_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_spotlight_product_links_unique on public.spotlight_product_links(content_id, item_id, placement);
create unique index if not exists idx_spotlight_product_links_primary on public.spotlight_product_links(content_id) where is_primary;
create index if not exists idx_spotlight_product_links_item on public.spotlight_product_links(item_id, created_at desc);
create index if not exists idx_spotlight_product_links_campaign on public.spotlight_product_links(campaign_key) where campaign_key is not null;

drop trigger if exists set_spotlight_product_links_updated_at on public.spotlight_product_links;
create trigger set_spotlight_product_links_updated_at
before update on public.spotlight_product_links
for each row execute function public.set_updated_at();

create table if not exists public.spotlight_product_events (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.spotlight_content(id) on delete cascade,
  product_link_id uuid references public.spotlight_product_links(id) on delete set null,
  item_id uuid not null references public.items(id) on delete cascade,
  creator_user_id uuid references public.users(id) on delete set null,
  viewer_user_id uuid references public.users(id) on delete set null,
  viewer_session_key text not null,
  event_name public.spotlight_product_event_type not null,
  order_id text,
  order_item_id text,
  amount numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  campaign_key text,
  dedupe_key text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create unique index if not exists idx_spotlight_product_events_dedupe on public.spotlight_product_events(dedupe_key) where dedupe_key is not null;
create index if not exists idx_spotlight_product_events_content on public.spotlight_product_events(content_id, occurred_at desc);
create index if not exists idx_spotlight_product_events_item on public.spotlight_product_events(item_id, occurred_at desc);
create index if not exists idx_spotlight_product_events_creator on public.spotlight_product_events(creator_user_id, occurred_at desc);

create table if not exists public.spotlight_commission_ledger (
  id uuid primary key default gen_random_uuid(),
  product_event_id uuid not null references public.spotlight_product_events(id) on delete cascade,
  content_id uuid not null references public.spotlight_content(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  creator_user_id uuid not null references public.users(id) on delete cascade,
  purchaser_user_id uuid references public.users(id) on delete set null,
  order_id text,
  commission_rate numeric(6, 4) not null default 0.10,
  commission_amount numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  status public.spotlight_commission_status not null default 'pending',
  eligible_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_spotlight_commission_event_unique on public.spotlight_commission_ledger(product_event_id);
create index if not exists idx_spotlight_commission_creator on public.spotlight_commission_ledger(creator_user_id, created_at desc);
create index if not exists idx_spotlight_commission_status on public.spotlight_commission_ledger(status, created_at desc);

drop trigger if exists set_spotlight_commission_ledger_updated_at on public.spotlight_commission_ledger;
create trigger set_spotlight_commission_ledger_updated_at
before update on public.spotlight_commission_ledger
for each row execute function public.set_updated_at();

do $$
begin
  if to_regclass('public.user_profiles') is not null then
    alter table public.user_profiles add column if not exists followers_count integer not null default 0;
    alter table public.user_profiles add column if not exists following_count integer not null default 0;
    alter table public.user_profiles add column if not exists posts_count integer not null default 0;
    alter table public.user_profiles add column if not exists reels_count integer not null default 0;
    alter table public.user_profiles add column if not exists is_verified boolean not null default false;
    alter table public.user_profiles add column if not exists interest_profile jsonb not null default '{}'::jsonb;
  end if;
end $$;

do $$
begin
  if to_regclass('public.user_profiles') is not null then
    create index if not exists idx_user_profiles_interest_profile_gin on public.user_profiles using gin (interest_profile);
  end if;
end $$;

create or replace function public.spotlight_time_decay_multiplier(p_published_at timestamptz)
returns numeric
language plpgsql
as $$
declare
  age_hours numeric;
begin
  if p_published_at is null then
    return 0.25;
  end if;

  age_hours := extract(epoch from (now() - p_published_at)) / 3600;
  if age_hours <= 24 then
    return 1.35;
  elsif age_hours <= 72 then
    return 1.00;
  elsif age_hours <= 168 then
    return 0.60;
  end if;

  return 0.25;
end;
$$;

create or replace function public.spotlight_engagement_points(
  p_likes integer,
  p_comments integer,
  p_saves integer,
  p_shares integer,
  p_views bigint,
  p_watch_time_ms bigint
)
returns numeric
language sql
as $$
  select (
    coalesce(p_likes, 0) * 4
    + coalesce(p_comments, 0) * 6
    + coalesce(p_saves, 0) * 5
    + coalesce(p_shares, 0) * 7
    + ln(coalesce(p_views, 0) + 1)
    + least(coalesce(p_watch_time_ms, 0)::numeric / 30000, 3)
  )::numeric;
$$;

create or replace function public.spotlight_conversion_points(
  p_product_clicks integer,
  p_product_item_views integer,
  p_product_cart_adds integer,
  p_product_purchases integer,
  p_product_revenue_amount numeric
)
returns numeric
language sql
as $$
  select (
    coalesce(p_product_clicks, 0) * 2
    + coalesce(p_product_item_views, 0) * 3
    + coalesce(p_product_cart_adds, 0) * 8
    + coalesce(p_product_purchases, 0) * 20
    + least(coalesce(p_product_revenue_amount, 0) / 50, 25)
  )::numeric;
$$;

create or replace function public.spotlight_refresh_comment_like_count(p_comment_id uuid)
returns void
language plpgsql
as $$
declare
  v_count integer := 0;
begin
  select count(*) into v_count
  from public.spotlight_comment_likes
  where comment_id = p_comment_id;

  update public.spotlight_comments
  set like_count = v_count,
      updated_at = now()
  where id = p_comment_id;
end;
$$;

create or replace function public.spotlight_recompute_metrics(p_content_id uuid)
returns void
language plpgsql
as $$
declare
  v_published_at timestamptz;
  v_age_hours numeric := 0;
  v_impressions bigint := 0;
  v_views bigint := 0;
  v_watch_time bigint := 0;
  v_likes integer := 0;
  v_comments integer := 0;
  v_saves integer := 0;
  v_shares integer := 0;
  v_dislikes integer := 0;
  v_reposts integer := 0;
  v_reports integer := 0;
  v_product_clicks integer := 0;
  v_product_item_views integer := 0;
  v_product_cart_adds integer := 0;
  v_product_purchases integer := 0;
  v_product_revenue_amount numeric(12, 2) := 0;
  v_engagement_points numeric := 0;
  v_conversion_points numeric := 0;
  v_decay numeric := 0;
  v_fatigue_multiplier numeric := 1;
  v_cold_start_boost numeric := 0;
  v_feed numeric := 0;
  v_trending numeric := 0;
  v_engagement_rate numeric := 0;
  v_ctr numeric := 0;
  v_conversion_rate numeric := 0;
begin
  select published_at
  into v_published_at
  from public.spotlight_content
  where id = p_content_id;

  if not found then
    return;
  end if;

  if v_published_at is not null then
    v_age_hours := extract(epoch from (now() - v_published_at)) / 3600;
  end if;

  select count(*) into v_impressions
  from public.spotlight_feed_impressions
  where content_id = p_content_id;

  select count(*), coalesce(sum(watch_time_ms), 0)
  into v_views, v_watch_time
  from public.spotlight_views
  where content_id = p_content_id;

  select count(*) into v_likes
  from public.spotlight_likes
  where content_id = p_content_id;

  select count(*) into v_comments
  from public.spotlight_comments
  where content_id = p_content_id and status = 'active';

  select count(*) into v_saves
  from public.saved_items
  where content_id = p_content_id and content_type = 'spotlight';

  select coalesce(shares, 0)
  into v_shares
  from public.spotlight_metrics
  where content_id = p_content_id;

  select count(*) into v_dislikes
  from public.spotlight_dislikes
  where content_id = p_content_id;

  select count(*) into v_reposts
  from public.spotlight_reposts
  where source_content_id = p_content_id;

  select count(*) into v_reports
  from public.spotlight_reports
  where content_id = p_content_id and status <> 'dismissed';

  select
    count(*) filter (where event_name = 'click'),
    count(*) filter (where event_name = 'view_item'),
    count(*) filter (where event_name = 'add_to_cart'),
    count(*) filter (where event_name = 'purchase'),
    coalesce(sum(case when event_name = 'purchase' then amount else 0 end), 0)
  into
    v_product_clicks,
    v_product_item_views,
    v_product_cart_adds,
    v_product_purchases,
    v_product_revenue_amount
  from public.spotlight_product_events
  where content_id = p_content_id;

  v_engagement_points := public.spotlight_engagement_points(v_likes, v_comments, v_saves, v_shares, v_views, v_watch_time);
  v_conversion_points := public.spotlight_conversion_points(v_product_clicks, v_product_item_views, v_product_cart_adds, v_product_purchases, v_product_revenue_amount);
  v_decay := public.spotlight_time_decay_multiplier(v_published_at);

  if v_views > 0 then
    v_engagement_rate := round((((v_likes + v_comments + v_saves + v_shares + v_reposts)::numeric) / greatest(v_views::numeric, 1)) * 100, 4);
  else
    v_engagement_rate := 0;
  end if;

  if v_impressions > 0 then
    v_ctr := round((v_product_clicks::numeric / greatest(v_impressions::numeric, 1)) * 100, 4);
  else
    v_ctr := 0;
  end if;

  if v_product_clicks > 0 then
    v_conversion_rate := round((v_product_purchases::numeric / greatest(v_product_clicks::numeric, 1)) * 100, 4);
  else
    v_conversion_rate := 0;
  end if;

  if v_age_hours <= 6 and v_impressions < 500 then
    v_cold_start_boost := 12;
  end if;

  if v_age_hours > 168 and v_impressions > 5000 and v_engagement_rate < 4 then
    v_fatigue_multiplier := 0.70;
  end if;

  v_feed := round(((v_engagement_points + v_conversion_points + v_cold_start_boost) - (v_dislikes * 4) - (v_reports * 10)) * v_decay * v_fatigue_multiplier, 4);
  v_trending := round((v_engagement_points + v_conversion_points) * case when v_age_hours <= 72 then 1.20 else 0.70 end, 4);

  insert into public.spotlight_metrics (
    content_id,
    impressions,
    views,
    watch_time_ms,
    likes,
    comments,
    saves,
    shares,
    dislikes,
    reposts,
    reports,
    product_clicks,
    product_item_views,
    product_cart_adds,
    product_purchases,
    product_revenue_amount,
    product_ctr,
    product_conversion_rate,
    engagement_rate,
    updated_at
  ) values (
    p_content_id,
    v_impressions,
    v_views,
    v_watch_time,
    v_likes,
    v_comments,
    v_saves,
    coalesce(v_shares, 0),
    v_dislikes,
    v_reposts,
    v_reports,
    v_product_clicks,
    v_product_item_views,
    v_product_cart_adds,
    v_product_purchases,
    v_product_revenue_amount,
    v_ctr,
    v_conversion_rate,
    v_engagement_rate,
    now()
  )
  on conflict (content_id)
  do update set
    impressions = excluded.impressions,
    views = excluded.views,
    watch_time_ms = excluded.watch_time_ms,
    likes = excluded.likes,
    comments = excluded.comments,
    saves = excluded.saves,
    shares = coalesce(public.spotlight_metrics.shares, excluded.shares),
    dislikes = excluded.dislikes,
    reposts = excluded.reposts,
    reports = excluded.reports,
    product_clicks = excluded.product_clicks,
    product_item_views = excluded.product_item_views,
    product_cart_adds = excluded.product_cart_adds,
    product_purchases = excluded.product_purchases,
    product_revenue_amount = excluded.product_revenue_amount,
    product_ctr = excluded.product_ctr,
    product_conversion_rate = excluded.product_conversion_rate,
    engagement_rate = excluded.engagement_rate,
    updated_at = now();

  update public.spotlight_content
  set
    feed_score = v_feed,
    trending_score = v_trending,
    updated_at = now()
  where id = p_content_id;
end;
$$;

create or replace function public.spotlight_recompute_trigger()
returns trigger
language plpgsql
as $$
declare
  v_content_id uuid;
  v_new jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  v_old jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
begin
  v_content_id := coalesce(
    nullif(v_new ->> 'content_id', '')::uuid,
    nullif(v_old ->> 'content_id', '')::uuid,
    nullif(v_new ->> 'source_content_id', '')::uuid,
    nullif(v_old ->> 'source_content_id', '')::uuid,
    nullif(v_new ->> 'id', '')::uuid,
    nullif(v_old ->> 'id', '')::uuid
  );
  if v_content_id is not null then
    perform public.spotlight_recompute_metrics(v_content_id);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.spotlight_comment_like_trigger()
returns trigger
language plpgsql
as $$
begin
  perform public.spotlight_refresh_comment_like_count(coalesce(new.comment_id, old.comment_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists spotlight_recompute_on_content_publish on public.spotlight_content;
create trigger spotlight_recompute_on_content_publish
after insert or update of published_at, status on public.spotlight_content
for each row execute function public.spotlight_recompute_trigger();

drop trigger if exists spotlight_recompute_on_impressions on public.spotlight_feed_impressions;
create trigger spotlight_recompute_on_impressions
after insert on public.spotlight_feed_impressions
for each row execute function public.spotlight_recompute_trigger();

drop trigger if exists spotlight_recompute_on_views on public.spotlight_views;
create trigger spotlight_recompute_on_views
after insert or update of watch_time_ms on public.spotlight_views
for each row execute function public.spotlight_recompute_trigger();

drop trigger if exists spotlight_recompute_on_likes on public.spotlight_likes;
create trigger spotlight_recompute_on_likes
after insert or delete on public.spotlight_likes
for each row execute function public.spotlight_recompute_trigger();

drop trigger if exists spotlight_recompute_on_dislikes on public.spotlight_dislikes;
create trigger spotlight_recompute_on_dislikes
after insert or delete on public.spotlight_dislikes
for each row execute function public.spotlight_recompute_trigger();

drop trigger if exists spotlight_recompute_on_saves on public.saved_items;
create trigger spotlight_recompute_on_saves
after insert or delete on public.saved_items
for each row execute function public.spotlight_recompute_trigger();

drop trigger if exists spotlight_recompute_on_comments on public.spotlight_comments;
create trigger spotlight_recompute_on_comments
after insert or delete or update of status on public.spotlight_comments
for each row execute function public.spotlight_recompute_trigger();

drop trigger if exists spotlight_recompute_on_reposts on public.spotlight_reposts;
create trigger spotlight_recompute_on_reposts
after insert or delete on public.spotlight_reposts
for each row execute function public.spotlight_recompute_trigger();

drop trigger if exists spotlight_recompute_on_reports on public.spotlight_reports;
create trigger spotlight_recompute_on_reports
after insert or update of status on public.spotlight_reports
for each row execute function public.spotlight_recompute_trigger();

drop trigger if exists spotlight_recompute_on_product_events on public.spotlight_product_events;
create trigger spotlight_recompute_on_product_events
after insert or update or delete on public.spotlight_product_events
for each row execute function public.spotlight_recompute_trigger();

drop trigger if exists spotlight_comment_like_count_trigger on public.spotlight_comment_likes;
create trigger spotlight_comment_like_count_trigger
after insert or delete on public.spotlight_comment_likes
for each row execute function public.spotlight_comment_like_trigger();

do $$
begin
  if to_regclass('public.posts') is not null then
    execute $sql$
      insert into public.spotlight_content (
        creator_user_id,
        media_type,
        media_url,
        thumbnail_url,
        caption,
        hashtags,
        interest_tags,
        visibility,
        allow_comments,
        status,
        published_at,
        legacy_source,
        legacy_source_id,
        created_at,
        updated_at
      )
      select
        u.id,
        'image'::public.spotlight_media_type,
        coalesce(p.image_url, ''),
        coalesce(p.image_url, ''),
        coalesce(p.caption, ''),
        '[]'::jsonb,
        '[]'::jsonb,
        'public'::public.spotlight_visibility,
        true,
        case
          when coalesce(p.status, 'published') = 'draft' then 'draft'::public.spotlight_status
          when coalesce(p.status, 'published') = 'archived' then 'archived'::public.spotlight_status
          else 'published'::public.spotlight_status
        end,
        coalesce(p.created_at, now()),
        'posts',
        p.id::text,
        coalesce(p.created_at, now()),
        coalesce(p.created_at, now())
      from public.posts p
      join public.users u on u.firebase_uid = p.creator_id
      where coalesce(p.image_url, '') <> ''
      on conflict (legacy_source, legacy_source_id) do nothing
    $sql$;
  end if;

  if to_regclass('public.reels') is not null then
    execute $sql$
      insert into public.spotlight_content (
        creator_user_id,
        media_type,
        media_url,
        thumbnail_url,
        caption,
        hashtags,
        interest_tags,
        visibility,
        allow_comments,
        status,
        published_at,
        legacy_source,
        legacy_source_id,
        created_at,
        updated_at
      )
      select
        u.id,
        'video'::public.spotlight_media_type,
        coalesce(r.video_url, ''),
        coalesce(r.cover_image_url, ''),
        coalesce(r.caption, ''),
        coalesce(r.hashtags, '[]'::jsonb),
        coalesce(r.hashtags, '[]'::jsonb),
        case
          when coalesce(r.visibility, 'public') = 'followers' then 'followers'::public.spotlight_visibility
          when coalesce(r.visibility, 'public') = 'private' then 'private'::public.spotlight_visibility
          else 'public'::public.spotlight_visibility
        end,
        coalesce(r.allow_comments, true),
        case
          when coalesce(r.status, 'published') = 'draft' then 'draft'::public.spotlight_status
          when coalesce(r.status, 'published') = 'archived' then 'archived'::public.spotlight_status
          else 'published'::public.spotlight_status
        end,
        coalesce(r.created_at, now()),
        'reels',
        r.id::text,
        coalesce(r.created_at, now()),
        coalesce(r.created_at, now())
      from public.reels r
      join public.users u on u.firebase_uid = r.creator_id
      where coalesce(r.video_url, '') <> ''
      on conflict (legacy_source, legacy_source_id) do nothing
    $sql$;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.saved_posts') is not null then
    execute $sql$
      insert into public.saved_items (user_id, content_id, content_type, saved_at)
      select
        sp.user_id,
        sc.id,
        'spotlight',
        now()
      from public.saved_posts sp
      join public.spotlight_content sc on sc.legacy_source = 'posts' and sc.legacy_source_id = sp.content_id::text
      on conflict (user_id, content_id) do nothing
    $sql$;
  end if;

  if to_regclass('public.saved_reels') is not null then
    execute $sql$
      insert into public.saved_items (user_id, content_id, content_type, saved_at)
      select
        sr.user_id,
        sc.id,
        'spotlight',
        now()
      from public.saved_reels sr
      join public.spotlight_content sc on sc.legacy_source = 'reels' and sc.legacy_source_id = sr.content_id::text
      on conflict (user_id, content_id) do nothing
    $sql$;
  end if;
end
$$;

insert into public.spotlight_metrics (content_id)
select sc.id
from public.spotlight_content sc
left join public.spotlight_metrics sm on sm.content_id = sc.id
where sm.content_id is null;

create or replace view public.spotlight_product_performance_v as
select
  sc.id as content_id,
  sc.creator_user_id,
  spl.item_id,
  spl.campaign_key,
  count(*) filter (where spe.event_name = 'impression') as impressions,
  count(*) filter (where spe.event_name = 'click') as clicks,
  count(*) filter (where spe.event_name = 'view_item') as item_views,
  count(*) filter (where spe.event_name = 'add_to_cart') as cart_adds,
  count(*) filter (where spe.event_name = 'purchase') as purchases,
  coalesce(sum(case when spe.event_name = 'purchase' then spe.amount else 0 end), 0)::numeric(12, 2) as revenue,
  case
    when count(*) filter (where spe.event_name = 'impression') > 0
      then round((count(*) filter (where spe.event_name = 'click'))::numeric / greatest((count(*) filter (where spe.event_name = 'impression'))::numeric, 1) * 100, 4)
    else 0
  end as ctr,
  case
    when count(*) filter (where spe.event_name = 'click') > 0
      then round((count(*) filter (where spe.event_name = 'purchase'))::numeric / greatest((count(*) filter (where spe.event_name = 'click'))::numeric, 1) * 100, 4)
    else 0
  end as purchase_rate
from public.spotlight_content sc
left join public.spotlight_product_links spl on spl.content_id = sc.id
left join public.spotlight_product_events spe on spe.content_id = sc.id and (spl.id is null or spe.product_link_id = spl.id)
group by sc.id, sc.creator_user_id, spl.item_id, spl.campaign_key;

create or replace view public.spotlight_creator_conversion_v as
select
  creator_user_id,
  count(distinct content_id) as content_count,
  sum(clicks) as total_clicks,
  sum(cart_adds) as total_cart_adds,
  sum(purchases) as total_purchases,
  sum(revenue)::numeric(12, 2) as total_revenue,
  case when sum(clicks) > 0 then round(sum(purchases)::numeric / greatest(sum(clicks)::numeric, 1) * 100, 4) else 0 end as conversion_rate
from public.spotlight_product_performance_v
group by creator_user_id;

create or replace view public.spotlight_tag_conversion_v as
select
  lower(trim(both '"' from tag.value::text)) as tag,
  count(distinct sc.id) as content_count,
  sum(coalesce(sm.product_clicks, 0)) as total_clicks,
  sum(coalesce(sm.product_purchases, 0)) as total_purchases,
  sum(coalesce(sm.product_revenue_amount, 0))::numeric(12, 2) as total_revenue
from public.spotlight_content sc
join lateral jsonb_array_elements(sc.hashtags) as tag(value) on true
left join public.spotlight_metrics sm on sm.content_id = sc.id
group by lower(trim(both '"' from tag.value::text));

alter table public.spotlight_content enable row level security;
alter table public.spotlight_metrics enable row level security;
alter table public.spotlight_comments enable row level security;
alter table public.spotlight_product_links enable row level security;
alter table public.spotlight_views enable row level security;
alter table public.spotlight_likes enable row level security;
alter table public.spotlight_dislikes enable row level security;
alter table public.spotlight_reposts enable row level security;
alter table public.saved_items enable row level security;
alter table public.spotlight_comment_likes enable row level security;
alter table public.spotlight_reports enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_restrictions enable row level security;
alter table public.spotlight_feed_impressions enable row level security;
alter table public.spotlight_product_events enable row level security;
alter table public.spotlight_commission_ledger enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'spotlight_content'
      and policyname = 'spotlight_content_public_read'
  ) then
    create policy spotlight_content_public_read
      on public.spotlight_content
      for select
      using (status = 'published' and visibility = 'public');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'spotlight_metrics'
      and policyname = 'spotlight_metrics_public_read'
  ) then
    create policy spotlight_metrics_public_read
      on public.spotlight_metrics
      for select
      using (
        exists (
          select 1
          from public.spotlight_content sc
          where sc.id = spotlight_metrics.content_id
            and sc.status = 'published'
            and sc.visibility = 'public'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'spotlight_comments'
      and policyname = 'spotlight_comments_public_read'
  ) then
    create policy spotlight_comments_public_read
      on public.spotlight_comments
      for select
      using (
        status = 'active'
        and exists (
          select 1
          from public.spotlight_content sc
          where sc.id = spotlight_comments.content_id
            and sc.status = 'published'
            and sc.visibility = 'public'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'spotlight_product_links'
      and policyname = 'spotlight_product_links_public_read'
  ) then
    create policy spotlight_product_links_public_read
      on public.spotlight_product_links
      for select
      using (
        exists (
          select 1
          from public.spotlight_content sc
          where sc.id = spotlight_product_links.content_id
            and sc.status = 'published'
            and sc.visibility = 'public'
        )
      );
  end if;
end $$;

do $$
declare
  r record;
begin
  for r in select id from public.spotlight_content loop
    perform public.spotlight_recompute_metrics(r.id);
  end loop;
end
$$;

commit;
