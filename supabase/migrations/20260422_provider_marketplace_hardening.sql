-- Provider marketplace hardening
-- Adds review-queue indexes and RLS policies for provider applications.

create index if not exists idx_work_listings_review_queue
  on public.work_listings(status, submitted_at desc);

create index if not exists idx_work_requests_provider_type_status
  on public.work_requests(target_provider_id, request_type, status, scheduled_at desc);

create index if not exists idx_work_provider_applications_review_queue
  on public.work_provider_applications(status, submitted_at desc);

alter table if exists public.work_provider_applications enable row level security;

drop policy if exists "service_role_all_work_provider_applications" on public.work_provider_applications;
create policy "service_role_all_work_provider_applications"
  on public.work_provider_applications
  for all
  using (public.is_service_role())
  with check (public.is_service_role());

drop policy if exists "work_provider_applications_owner_select" on public.work_provider_applications;
create policy "work_provider_applications_owner_select"
  on public.work_provider_applications
  for select
  using (
    public.is_service_role() or user_id = auth.uid()
  );

drop policy if exists "work_provider_applications_owner_insert" on public.work_provider_applications;
create policy "work_provider_applications_owner_insert"
  on public.work_provider_applications
  for insert
  with check (
    public.is_service_role() or user_id = auth.uid()
  );

drop policy if exists "work_provider_applications_owner_update" on public.work_provider_applications;
create policy "work_provider_applications_owner_update"
  on public.work_provider_applications
  for update
  using (
    public.is_service_role() or user_id = auth.uid()
  )
  with check (
    public.is_service_role() or user_id = auth.uid()
  );
