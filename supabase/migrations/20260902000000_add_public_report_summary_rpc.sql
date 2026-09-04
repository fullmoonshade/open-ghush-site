-- Compute the public ledger summary inside Postgres and return one compact row.
-- SECURITY INVOKER preserves RLS; the explicit publication predicate is defense in depth.
create or replace function public.get_public_report_summary()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  with published as materialized (
    select
      created_at,
      district,
      department,
      amount,
      outcome
    from public.bribe_reports
    where is_published = true
  ),
  totals as (
    select
      count(*)::integer as report_count,
      coalesce(sum(amount), 0)::bigint as reported_amount,
      coalesce(min(amount), 0)::integer as minimum_amount,
      coalesce(max(amount), 0)::integer as maximum_amount,
      count(*) filter (where amount <= 5000)::integer as up_to_five_thousand_count,
      count(*) filter (where outcome = 'paid')::integer as paid_count,
      count(*) filter (where outcome = 'refused')::integer as refused_count,
      count(*) filter (where outcome = 'pending')::integer as pending_count,
      count(distinct district)::integer as district_count,
      coalesce(
        greatest(
          0,
          floor(extract(epoch from (statement_timestamp() - min(created_at))) / 86400)
        ),
        0
      )::integer as span_days
    from published
  ),
  amount_bands as (
    select
      case
        when amount <= 1000 then 'upTo1000'
        when amount <= 5000 then 'from1001To5000'
        when amount <= 10000 then 'from5001To10000'
        else 'above10000'
      end as band,
      count(*)::integer as reports
    from published
    group by 1
  ),
  district_groups as (
    select district as name, count(*)::integer as reports, sum(amount)::bigint as amount
    from published
    group by district
  ),
  department_groups as (
    select department as name, count(*)::integer as reports, sum(amount)::bigint as amount
    from published
    group by department
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'count', totals.report_count,
      'amount', totals.reported_amount,
      'minimumAmount', totals.minimum_amount,
      'maximumAmount', totals.maximum_amount,
      'underFiveThousandRate', case
        when totals.report_count = 0 then 0
        else round(totals.up_to_five_thousand_count * 100.0 / totals.report_count)::integer
      end,
      'refusalRate', case
        when totals.paid_count + totals.refused_count = 0 then 0
        else round(
          totals.refused_count * 100.0 / (totals.paid_count + totals.refused_count)
        )::integer
      end,
      'paidCount', totals.paid_count,
      'refusedCount', totals.refused_count,
      'pendingCount', totals.pending_count,
      'districts', totals.district_count,
      'spanDays', totals.span_days
    ),
    'amountBands', jsonb_build_object(
      'upTo1000', coalesce((select reports from amount_bands where band = 'upTo1000'), 0),
      'from1001To5000', coalesce((select reports from amount_bands where band = 'from1001To5000'), 0),
      'from5001To10000', coalesce((select reports from amount_bands where band = 'from5001To10000'), 0),
      'above10000', coalesce((select reports from amount_bands where band = 'above10000'), 0)
    ),
    'districtRows', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('name', name, 'reports', reports, 'amount', amount)
          order by reports desc, amount desc
        )
        from district_groups
      ),
      '[]'::jsonb
    ),
    'departmentRows', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('name', name, 'reports', reports, 'amount', amount)
          order by reports desc, amount desc
        )
        from department_groups
      ),
      '[]'::jsonb
    ),
    'latestReport', (
      select jsonb_build_object(
        'id', id,
        'created_at', created_at,
        'department', department,
        'city', city,
        'outcome', outcome
      )
      from public.bribe_reports
      where is_published = true
      order by created_at desc
      limit 1
    )
  )
  from totals;
$function$;

revoke all on function public.get_public_report_summary() from public;
grant execute on function public.get_public_report_summary() to anon, authenticated;
