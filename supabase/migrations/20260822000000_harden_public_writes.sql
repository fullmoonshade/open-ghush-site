create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.abuse_rate_limits (
  scope text not null,
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  bucket_start timestamptz not null,
  request_count integer not null check (request_count > 0),
  expires_at timestamptz not null,
  primary key (scope, key_hash, bucket_start)
);

comment on table private.abuse_rate_limits is
  'Short-lived, rotating HMAC abuse keys. Never store raw network addresses here.';

create index abuse_rate_limits_expiry_idx
  on private.abuse_rate_limits (expires_at);

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
  current_time timestamptz := clock_timestamp();
  current_bucket timestamptz;
  accepted_count integer;
  retry_after integer;
begin
  if p_scope !~ '^[a-z0-9-]{1,80}$'
    or p_key_hash !~ '^[0-9a-f]{64}$'
    or p_window_seconds not between 60 and 604800
    or p_max_requests not between 1 and 10000
  then
    raise exception 'Invalid rate-limit parameters';
  end if;

  current_bucket := to_timestamp(
    floor(extract(epoch from current_time) / p_window_seconds)
      * p_window_seconds
  );

  with expired as (
    select limits.ctid
    from private.abuse_rate_limits as limits
    where limits.expires_at < current_time
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
      current_bucket,
      1,
      current_bucket + make_interval(secs => p_window_seconds)
    )
  on conflict (scope, key_hash, bucket_start)
  do update
    set request_count = current_limit.request_count + 1
    where current_limit.request_count < p_max_requests
  returning request_count into accepted_count;

  if accepted_count is not null then
    return 0;
  end if;

  retry_after := ceil(
    extract(
      epoch from (
        current_bucket
          + make_interval(secs => p_window_seconds)
          - current_time
      )
    )
  );
  return greatest(1, retry_after);
end;
$$;

revoke all on function public.consume_abuse_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_abuse_rate_limit(text, text, integer, integer)
  to service_role;

drop policy if exists "Anonymous reports enter moderation"
  on public.bribe_reports;
revoke insert, update, delete, truncate, references, trigger
  on table public.bribe_reports from anon, authenticated;
grant select on table public.bribe_reports to anon, authenticated;
grant select, insert on table public.bribe_reports to service_role;

revoke all on function public.confirm_bribe_report(uuid)
  from public, anon, authenticated;
grant execute on function public.confirm_bribe_report(uuid)
  to service_role;
