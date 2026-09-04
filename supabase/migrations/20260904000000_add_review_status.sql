-- Production moderation invariant: a report cannot be public until approved.
alter table public.bribe_reports
  add column if not exists review_status text;

update public.bribe_reports
set review_status = case
  when is_published then 'approved'
  else 'pending'
end
where review_status is null
   or (is_published and review_status <> 'approved');

alter table public.bribe_reports
  alter column review_status set default 'pending',
  alter column review_status set not null;

alter table public.bribe_reports
  drop constraint if exists bribe_reports_review_status_check;
alter table public.bribe_reports
  add constraint bribe_reports_review_status_check
  check (review_status in ('pending', 'approved', 'held', 'rejected'));

alter table public.bribe_reports
  drop constraint if exists publish_requires_approval;
alter table public.bribe_reports
  add constraint publish_requires_approval
  check (not is_published or review_status = 'approved');

create index if not exists bribe_reports_moderation_queue_idx
  on public.bribe_reports (created_at)
  where is_published = false and is_sample = false;
