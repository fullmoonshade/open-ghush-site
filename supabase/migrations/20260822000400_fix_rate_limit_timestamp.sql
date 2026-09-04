create or replace function public.consume_abuse_rate_limit(
  p_scope text,
  p_key_hash text,
  p_window_seconds integer,
  p_max_requests integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_bucket_start timestamptz;
  v_accepted_count integer;
  v_retry_after integer;
begin
  if p_scope !~ '^[a-z0-9-]{1,80}$'
    or p_key_hash !~ '^[0-9a-f]{64}$'
    or p_window_seconds not between 60 and 604800
    or p_max_requests not between 1 and 10000
  then
    raise exception 'Invalid rate-limit parameters';
  end if;

  v_bucket_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds)
      * p_window_seconds
  );

  with expired as (
    select limits.ctid
    from private.abuse_rate_limits as limits
    where limits.expires_at < v_now
    order by limits.expires_at
    for update skip locked
    limit 50
  )
  delete from private.abuse_rate_limits as limits
  using expired
  where limits.ctid = expired.ctid;

  insert into private.abuse_rate_limits as current_limit
    (scope, key_hash, bucket_start, request_count, expires_at)
  values
    (
      p_scope,
      p_key_hash,
      v_bucket_start,
      1,
      v_bucket_start + make_interval(secs => p_window_seconds)
    )
  on conflict (scope, key_hash, bucket_start)
  do update
    set request_count = current_limit.request_count + 1
    where current_limit.request_count < p_max_requests
  returning request_count into v_accepted_count;

  if v_accepted_count is not null then
    return 0;
  end if;

  v_retry_after := ceil(
    extract(
      epoch from (
        v_bucket_start
          + make_interval(secs => p_window_seconds)
          - v_now
      )
    )
  );
  return greatest(1, v_retry_after);
end;
$$;

revoke all on function public.consume_abuse_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_abuse_rate_limit(text, text, integer, integer)
  to service_role;
