create table if not exists public.pixe_user_video_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  video_id uuid not null references public.pixe_videos(id) on delete cascade,
  first_watched_at timestamptz,
  last_watched_at timestamptz,
  view_count bigint not null default 0,
  completed_count bigint not null default 0,
  watch_time_ms bigint not null default 0,
  liked boolean not null default false,
  liked_at timestamptz,
  saved boolean not null default false,
  saved_at timestamptz,
  comment_count bigint not null default 0,
  last_commented_at timestamptz,
  last_comment_excerpt text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_pixe_user_video_activity_unique
  on public.pixe_user_video_activity(user_id, video_id);
create index if not exists idx_pixe_user_video_activity_last_watched
  on public.pixe_user_video_activity(user_id, last_watched_at desc);
create index if not exists idx_pixe_user_video_activity_liked
  on public.pixe_user_video_activity(user_id, liked, liked_at desc);
create index if not exists idx_pixe_user_video_activity_saved
  on public.pixe_user_video_activity(user_id, saved, saved_at desc);
create index if not exists idx_pixe_user_video_activity_commented
  on public.pixe_user_video_activity(user_id, last_commented_at desc);

drop trigger if exists set_pixe_user_video_activity_updated_at on public.pixe_user_video_activity;
create trigger set_pixe_user_video_activity_updated_at
before update on public.pixe_user_video_activity
for each row execute function public.set_updated_at();

create table if not exists public.pixe_user_daily_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  bucket_date date not null,
  watched_count bigint not null default 0,
  watch_time_ms bigint not null default 0,
  liked_count bigint not null default 0,
  commented_count bigint not null default 0,
  saved_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_pixe_user_daily_activity_unique
  on public.pixe_user_daily_activity(user_id, bucket_date);
create index if not exists idx_pixe_user_daily_activity_bucket
  on public.pixe_user_daily_activity(user_id, bucket_date desc);

drop trigger if exists set_pixe_user_daily_activity_updated_at on public.pixe_user_daily_activity;
create trigger set_pixe_user_daily_activity_updated_at
before update on public.pixe_user_daily_activity
for each row execute function public.set_updated_at();
