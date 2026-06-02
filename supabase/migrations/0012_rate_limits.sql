-- 0012_rate_limits.sql
-- DB-based fixed-window rate limiter for the server-side endpoints we control
-- (checkout session creation, RGPD export…). Only the service_role calls
-- rate_limit_hit() from the app (src/lib/rate-limit.ts); the table is locked
-- (RLS on, no policies) so it is never reachable from the public REST API.
--
-- Note: Supabase Auth already rate-limits login/signup/reset at the platform
-- level (those calls go browser -> Supabase, never through our server), so this
-- limiter targets our own endpoints rather than the auth endpoints.

create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);
create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;
-- No policies on purpose: only the SECURITY DEFINER function below (run as the
-- table owner / service_role) ever touches this table.

create or replace function public.rate_limit_hit(
  p_key text,
  p_max int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  v_count int;
begin
  insert into public.rate_limits (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into v_count;

  -- true = within the limit (allowed), false = over the limit
  return v_count <= p_max;
end;
$$;

revoke all on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;

-- Optional housekeeping: purge old windows (safe to run anytime, e.g. via pg_cron).
-- delete from public.rate_limits where window_start < now() - interval '1 day';
