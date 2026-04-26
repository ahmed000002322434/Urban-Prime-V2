create table if not exists public.pixe_video_subtitles (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.pixe_videos(id) on delete cascade,
  language_code text not null default 'en',
  name text not null default 'English',
  source text not null default 'generated',
  status text not null default 'missing',
  mux_track_id text,
  transcript_text text not null default '',
  vtt_text text not null default '',
  sync_status text not null default 'local',
  last_synced_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_pixe_video_subtitles_unique on public.pixe_video_subtitles(video_id, language_code);
create index if not exists idx_pixe_video_subtitles_video on public.pixe_video_subtitles(video_id, updated_at desc);
drop trigger if exists set_pixe_video_subtitles_updated_at on public.pixe_video_subtitles;
create trigger set_pixe_video_subtitles_updated_at
before update on public.pixe_video_subtitles
for each row execute function public.set_updated_at();

create table if not exists public.pixe_video_reviews (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.pixe_videos(id) on delete cascade,
  review_type text not null default 'copyright',
  status text not null default 'needs_review',
  severity text not null default 'low',
  summary text not null default '',
  signals jsonb not null default '[]'::jsonb,
  detected_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pixe_video_reviews_signals_array check (jsonb_typeof(signals) = 'array')
);

create unique index if not exists idx_pixe_video_reviews_unique on public.pixe_video_reviews(video_id, review_type);
create index if not exists idx_pixe_video_reviews_queue on public.pixe_video_reviews(status, severity, detected_at desc);
drop trigger if exists set_pixe_video_reviews_updated_at on public.pixe_video_reviews;
create trigger set_pixe_video_reviews_updated_at
before update on public.pixe_video_reviews
for each row execute function public.set_updated_at();

create table if not exists public.pixe_payout_requests (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.pixe_channels(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  amount numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  destination_label text not null default '',
  note text not null default '',
  status text not null default 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pixe_payout_requests_channel on public.pixe_payout_requests(channel_id, created_at desc);
create index if not exists idx_pixe_payout_requests_status on public.pixe_payout_requests(status, created_at desc);
drop trigger if exists set_pixe_payout_requests_updated_at on public.pixe_payout_requests;
create trigger set_pixe_payout_requests_updated_at
before update on public.pixe_payout_requests
for each row execute function public.set_updated_at();

alter table public.pixe_comment_reports
  add column if not exists review_status text not null default 'pending';

alter table public.pixe_comment_reports
  add column if not exists reviewed_at timestamptz;

alter table public.pixe_comment_reports
  add column if not exists reviewed_by uuid references public.users(id) on delete set null;

alter table public.pixe_comment_reports
  add column if not exists admin_note text;

create index if not exists idx_pixe_comment_reports_review_status on public.pixe_comment_reports(review_status, created_at desc);

alter table public.pixe_tips
  add column if not exists message text not null default '';
