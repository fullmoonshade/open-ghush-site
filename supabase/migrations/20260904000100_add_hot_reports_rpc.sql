-- Rank and page hot reports inside Postgres. This replaces downloading every
-- matching report into the application process for each uncached request.
create or replace function public.list_hot_reports(
  p_offset integer default 0,
  p_limit integer default 5,
  p_outcome text default null,
  p_department text default null,
  p_search text default null,
  p_aliases text[] default '{}'::text[]
)
returns table (
  id uuid,
  created_at timestamptz,
  department text,
  service text,
  city text,
  district text,
  amount integer,
  outcome text,
  description text,
  confirmation_count integer,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with filtered as materialized (
    select
      report.id,
      report.created_at,
      report.department,
      report.service,
      report.city,
      report.district,
      report.amount,
      report.outcome,
      report.description,
      report.confirmation_count,
      (report.confirmation_count + 1)::double precision /
        power(
          greatest(
            0::double precision,
            extract(epoch from (statement_timestamp() - report.created_at)) /
              3600
          ) + 2,
          1.5
        ) as hot_score
    from public.bribe_reports as report
    where report.is_published = true
      and (p_outcome is null or report.outcome = p_outcome)
      and (p_department is null or report.department = p_department)
      and (
        (
          nullif(btrim(p_search), '') is null
          and coalesce(cardinality(p_aliases), 0) = 0
        )
        or report.department ilike '%' || btrim(p_search) || '%'
        or report.service ilike '%' || btrim(p_search) || '%'
        or report.city ilike '%' || btrim(p_search) || '%'
        or report.district ilike '%' || btrim(p_search) || '%'
        or report.department = any(coalesce(p_aliases, '{}'::text[]))
        or report.district = any(coalesce(p_aliases, '{}'::text[]))
      )
  )
  select
    filtered.id,
    filtered.created_at,
    filtered.department,
    filtered.service,
    filtered.city,
    filtered.district,
    filtered.amount,
    filtered.outcome,
    filtered.description,
    filtered.confirmation_count,
    count(*) over () as total_count
  from filtered
  order by filtered.hot_score desc, filtered.created_at desc
  limit least(greatest(p_limit, 1), 20)
  offset greatest(p_offset, 0);
$function$;

revoke all on function public.list_hot_reports(integer, integer, text, text, text, text[])
  from public;
grant execute on function public.list_hot_reports(integer, integer, text, text, text, text[])
  to anon, authenticated;
