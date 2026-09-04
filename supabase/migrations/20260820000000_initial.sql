-- GhushSite stores report content only. Do not add IP, user-agent, email,
-- phone, fingerprint, or advertising identifiers to this table.
create extension if not exists pgcrypto;

create table public.bribe_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  department text not null check (char_length(department) between 2 and 80),
  service text not null check (char_length(service) between 3 and 100),
  city text not null check (char_length(city) between 2 and 60),
  district text not null check (char_length(district) between 2 and 60),
  amount integer not null check (amount between 1 and 100000000),
  outcome text not null check (outcome in ('paid', 'refused', 'pending')),
  description text not null check (char_length(description) between 20 and 700),
  confirmation_count integer not null default 0 check (confirmation_count >= 0),
  is_published boolean not null default false,
  review_status text not null default 'pending',
  is_sample boolean not null default false,
  constraint bribe_reports_review_status_check
    check (review_status in ('pending', 'approved', 'held', 'rejected')),
  constraint publish_requires_approval
    check (not is_published or review_status = 'approved')
);

create index bribe_reports_public_created_idx
  on public.bribe_reports (created_at desc)
  where is_published = true;
create index bribe_reports_public_district_idx
  on public.bribe_reports (district)
  where is_published = true;
create index bribe_reports_public_department_idx
  on public.bribe_reports (department)
  where is_published = true;

alter table public.bribe_reports enable row level security;

revoke all on table public.bribe_reports from public, anon, authenticated;
grant select on table public.bribe_reports to anon, authenticated;
grant select, insert on table public.bribe_reports to service_role;

create policy "Published reports are public"
  on public.bribe_reports
  for select
  to anon, authenticated
  using (is_published = true);

