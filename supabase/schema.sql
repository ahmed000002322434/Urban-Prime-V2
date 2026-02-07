-- Mirror table for dual-write: Firestore + Supabase
create table if not exists public.mirror_documents (
  collection text not null,
  doc_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (collection, doc_id)
);

create index if not exists idx_mirror_collection on public.mirror_documents (collection);
create index if not exists idx_mirror_updated_at on public.mirror_documents (updated_at desc);

alter table public.mirror_documents enable row level security;

-- Open policies (adjust for production)
create policy "mirror_select_all"
  on public.mirror_documents for select
  using (true);

create policy "mirror_insert_all"
  on public.mirror_documents for insert
  with check (true);

create policy "mirror_update_all"
  on public.mirror_documents for update
  using (true);

create policy "mirror_delete_all"
  on public.mirror_documents for delete
  using (true);
