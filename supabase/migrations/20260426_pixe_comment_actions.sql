create table if not exists public.pixe_comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.pixe_comments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_pixe_comment_likes_unique on public.pixe_comment_likes(comment_id, user_id);
create index if not exists idx_pixe_comment_likes_comment on public.pixe_comment_likes(comment_id, created_at desc);
create index if not exists idx_pixe_comment_likes_user on public.pixe_comment_likes(user_id, created_at desc);

create table if not exists public.pixe_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.pixe_comments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reason text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists idx_pixe_comment_reports_unique on public.pixe_comment_reports(comment_id, user_id);
create index if not exists idx_pixe_comment_reports_comment on public.pixe_comment_reports(comment_id, created_at desc);
create index if not exists idx_pixe_comment_reports_user on public.pixe_comment_reports(user_id, created_at desc);
