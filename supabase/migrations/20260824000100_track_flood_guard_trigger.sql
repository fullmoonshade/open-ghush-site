-- Defense in depth behind the application rate limiter: reject an identical
-- description submitted within six hours and cap global insert bursts.
-- The trigger is service-role-only and uses schema-qualified identifiers.

create or replace function public.block_flood()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if exists (
    select 1 from public.bribe_reports
    where description = new.description
      and created_at > now() - interval '6 hours'
  ) then
    raise exception 'duplicate submission';
  end if;

  if (
    select count(*) from public.bribe_reports
    where created_at > now() - interval '1 minute'
  ) >= 15 then
    raise exception 'too many submissions, try again shortly';
  end if;

  return new;
end;
$function$;

revoke all on function public.block_flood() from public, anon, authenticated;

drop trigger if exists flood_guard on public.bribe_reports;
create trigger flood_guard
  before insert on public.bribe_reports
  for each row
  execute function public.block_flood();
