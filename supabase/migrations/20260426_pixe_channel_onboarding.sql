begin;

alter table public.pixe_channels
  add column if not exists onboarding_completed boolean not null default false;

update public.pixe_channels
set onboarding_completed = true
where onboarding_completed = false;

commit;
