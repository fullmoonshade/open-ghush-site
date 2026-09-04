create or replace function public.confirm_bribe_report(report_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
begin
  update public.bribe_reports
  set confirmation_count = confirmation_count + 1
  where id = report_id
    and is_published = true
  returning confirmation_count into updated_count;

  if updated_count is null then
    raise exception 'Published report not found';
  end if;

  return updated_count;
end;
$$;

revoke all on function public.confirm_bribe_report(uuid)
  from public, anon, authenticated;
grant execute on function public.confirm_bribe_report(uuid) to service_role;
