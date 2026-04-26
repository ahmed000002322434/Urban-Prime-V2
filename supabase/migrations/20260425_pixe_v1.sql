begin;

create extension if not exists pgcrypto;

do $$ begin
  create type public.pixe_video_status as enum ('draft', 'uploading', 'processing', 'ready', 'published', 'failed', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.pixe_video_visibility as enum ('public', 'followers', 'private');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.pixe_comment_status as enum ('active', 'hidden', 'deleted', 'flagged');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.pixe_membership_status as enum ('active', 'paused', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.pixe_ledger_status as enum ('pending', 'available', 'paid', 'void');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.pixe_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  handle text not null unique,
  display_name text not null default '',
  avatar_url text,
  banner_url text,
  bio text not null default '',
  hidden_words jsonb not null default '[]'::jsonb,
  brand_palette jsonb not null default '{}'::jsonb,
  tip_enabled boolean not null default true,
  membership_enabled boolean not null default false,
  payout_status text not null default 'inactive',
  subscriber_count integer not null default 0,
  video_count integer not null default 0,
  published_video_count integer not null default 0,
  total_watch_time_ms bigint not null default 0,
  total_impressions bigint not null default 0,
  total_qualified_views bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pixe_channels_hidden_words_array check (jsonb_typeof(hidden_words) = 'array'),
  constraint pixe_channels_brand_palette_object check (jsonb_typeof(brand_palette) = 'object')
);

create unique index if not exists idx_pixe_channels_user on public.pixe_channels(user_id);
create index if not exists idx_pixe_channels_handle on public.pixe_channels(handle);
drop trigger if exists set_pixe_channels_updated_at on public.pixe_channels;
create trigger set_pixe_channels_updated_at
before update on public.pixe_channels
for each row execute function public.set_updated_at();

create table if not exists public.pixe_videos (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.pixe_channels(id) on delete cascade,
  creator_user_id uuid not null references public.users(id) on delete cascade,
  mux_upload_id text unique,
  mux_asset_id text unique,
  playback_id text unique,
  mux_upload_status text not null default 'draft',
  status public.pixe_video_status not null default 'draft',
  visibility public.pixe_video_visibility not null default 'public',
  moderation_state text not null default 'clean',
  title text not null default '',
  caption text not null default '',
  hashtags jsonb not null default '[]'::jsonb,
  commerce_links jsonb not null default '[]'::jsonb,
  thumbnail_url text,
  preview_url text,
  manifest_url text,
  duration_ms integer not null default 0,
  width integer not null default 0,
  height integer not null default 0,
  fps numeric(8, 2) not null default 0,
  source_size_bytes bigint not null default 0,
  allow_comments boolean not null default true,
  scheduled_for timestamptz,
  published_at timestamptz,
  processing_error text,
  impression_count bigint not null default 0,
  qualified_view_count bigint not null default 0,
  watch_time_total_ms bigint not null default 0,
  completion_count bigint not null default 0,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  save_count integer not null default 0,
  share_count integer not null default 0,
  product_click_count integer not null default 0,
  product_revenue_amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pixe_videos_hashtags_array check (jsonb_typeof(hashtags) = 'array'),
  constraint pixe_videos_commerce_links_array check (jsonb_typeof(commerce_links) = 'array')
);

create index if not exists idx_pixe_videos_channel on public.pixe_videos(channel_id, created_at desc);
create index if not exists idx_pixe_videos_creator on public.pixe_videos(creator_user_id, created_at desc);
create index if not exists idx_pixe_videos_status on public.pixe_videos(status, published_at desc, created_at desc);
create index if not exists idx_pixe_videos_feed on public.pixe_videos(status, visibility, published_at desc, id desc);
create index if not exists idx_pixe_videos_schedule on public.pixe_videos(status, scheduled_for);
drop trigger if exists set_pixe_videos_updated_at on public.pixe_videos;
create trigger set_pixe_videos_updated_at
before update on public.pixe_videos
for each row execute function public.set_updated_at();

create table if not exists public.pixe_video_assets (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.pixe_videos(id) on delete cascade,
  asset_kind text not null,
  mux_asset_id text,
  playback_id text,
  url text not null,
  mime_type text,
  width integer,
  height integer,
  bitrate integer,
  size_bytes bigint,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_pixe_video_assets_unique_kind on public.pixe_video_assets(video_id, asset_kind);
create index if not exists idx_pixe_video_assets_video on public.pixe_video_assets(video_id, created_at desc);

create table if not exists public.pixe_video_product_tags (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.pixe_videos(id) on delete cascade,
  item_id text,
  title text not null default '',
  image_url text,
  href text,
  cta_label text not null default 'Shop',
  price_amount numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_pixe_video_product_tags_video on public.pixe_video_product_tags(video_id, sort_order asc, created_at asc);

create table if not exists public.pixe_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.pixe_videos(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  parent_comment_id uuid references public.pixe_comments(id) on delete cascade,
  body text not null,
  status public.pixe_comment_status not null default 'active',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pixe_comments_video on public.pixe_comments(video_id, created_at desc);
create index if not exists idx_pixe_comments_parent on public.pixe_comments(parent_comment_id, created_at asc);
create index if not exists idx_pixe_comments_status on public.pixe_comments(status, created_at desc);
drop trigger if exists set_pixe_comments_updated_at on public.pixe_comments;
create trigger set_pixe_comments_updated_at
before update on public.pixe_comments
for each row execute function public.set_updated_at();

create table if not exists public.pixe_subscriptions (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.pixe_channels(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_pixe_subscriptions_unique on public.pixe_subscriptions(channel_id, user_id);
create index if not exists idx_pixe_subscriptions_user on public.pixe_subscriptions(user_id, created_at desc);

create table if not exists public.pixe_saved_videos (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.pixe_videos(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_pixe_saved_videos_unique on public.pixe_saved_videos(video_id, user_id);
create index if not exists idx_pixe_saved_videos_user on public.pixe_saved_videos(user_id, created_at desc);

create table if not exists public.pixe_video_likes (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.pixe_videos(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_pixe_video_likes_unique on public.pixe_video_likes(video_id, user_id);
create index if not exists idx_pixe_video_likes_user on public.pixe_video_likes(user_id, created_at desc);

create table if not exists public.pixe_tips (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.pixe_channels(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  video_id uuid references public.pixe_videos(id) on delete set null,
  amount numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_pixe_tips_channel on public.pixe_tips(channel_id, created_at desc);

create table if not exists public.pixe_memberships (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.pixe_channels(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  tier_name text not null default 'Supporter',
  amount numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  status public.pixe_membership_status not null default 'active',
  renews_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_pixe_memberships_unique on public.pixe_memberships(channel_id, user_id);
create index if not exists idx_pixe_memberships_channel on public.pixe_memberships(channel_id, status, created_at desc);
drop trigger if exists set_pixe_memberships_updated_at on public.pixe_memberships;
create trigger set_pixe_memberships_updated_at
before update on public.pixe_memberships
for each row execute function public.set_updated_at();

create table if not exists public.pixe_payout_ledger (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.pixe_channels(id) on delete cascade,
  source_type text not null default 'manual',
  source_id text,
  entry_type text not null default 'credit',
  amount numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  status public.pixe_ledger_status not null default 'pending',
  available_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_pixe_payout_ledger_channel on public.pixe_payout_ledger(channel_id, created_at desc);
create index if not exists idx_pixe_payout_ledger_status on public.pixe_payout_ledger(channel_id, status, created_at desc);

create table if not exists public.pixe_video_stats_hourly (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.pixe_videos(id) on delete cascade,
  bucket_start timestamptz not null,
  impressions bigint not null default 0,
  views_3s bigint not null default 0,
  views_50 bigint not null default 0,
  views_95 bigint not null default 0,
  completions bigint not null default 0,
  qualified_views bigint not null default 0,
  watch_time_ms bigint not null default 0,
  likes integer not null default 0,
  comments integer not null default 0,
  saves integer not null default 0,
  shares integer not null default 0,
  product_clicks integer not null default 0,
  new_subscribers integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_pixe_video_stats_hourly_unique on public.pixe_video_stats_hourly(video_id, bucket_start);
create index if not exists idx_pixe_video_stats_hourly_bucket on public.pixe_video_stats_hourly(bucket_start desc);

create table if not exists public.pixe_video_stats_daily (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.pixe_videos(id) on delete cascade,
  bucket_date date not null,
  impressions bigint not null default 0,
  views_3s bigint not null default 0,
  views_50 bigint not null default 0,
  views_95 bigint not null default 0,
  completions bigint not null default 0,
  qualified_views bigint not null default 0,
  watch_time_ms bigint not null default 0,
  likes integer not null default 0,
  comments integer not null default 0,
  saves integer not null default 0,
  shares integer not null default 0,
  product_clicks integer not null default 0,
  new_subscribers integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_pixe_video_stats_daily_unique on public.pixe_video_stats_daily(video_id, bucket_date);
create index if not exists idx_pixe_video_stats_daily_bucket on public.pixe_video_stats_daily(bucket_date desc);

create table if not exists public.pixe_event_keys (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  event_name text not null,
  video_id uuid references public.pixe_videos(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pixe_event_keys_expires on public.pixe_event_keys(expires_at asc);

commit;
