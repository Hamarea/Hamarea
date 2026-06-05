-- 0015_fix_rls_recursion.sql
-- 🔴 CRITICAL — infinite recursion in the `profiles` RLS policies.
--
-- `profiles_admin_all` (created in 0002, recreated in 0009) guards the table
-- with `exists (select 1 from public.profiles p where p.id = auth.uid()
-- and p.role in ('admin','staff'))`. That sub-query runs *against the very
-- table the policy protects*, so evaluating it re-enters the same policy →
-- PostgreSQL aborts with «infinite recursion detected in policy for relation
-- "profiles"» (SQLSTATE 42P17). Result: EVERY authenticated client read of
-- `profiles` returns HTTP 500 (e.g. `GET /rest/v1/profiles?select=role`).
--
-- Consequence: the whole role system was silently broken. The middleware, the
-- admin layout and the login redirect all read `profiles.role` through the
-- user's (RLS-bound) client, so the read 500'd, `role` came back empty, and an
-- actual admin was never recognised — always bounced back to /account.
--
-- Fix: a SECURITY DEFINER helper `is_staff()` that reads the role with the
-- function-owner's rights (bypassing RLS, so it never re-enters the policy),
-- and rewrite the recursive policy to call it instead of sub-querying profiles.

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
  );
$$;

-- The function reads profiles with definer rights; never expose its body to the
-- public role, but the RLS policies below (evaluated as anon/authenticated)
-- must be able to call it.
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to anon, authenticated, service_role;

-- Replace the recursive policy. `profiles_self_read` / `profiles_self_update`
-- (own row) and the `prevent_role_self_escalation` trigger from 0010/0013 are
-- unchanged — defence in depth is preserved.
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all
  using (public.is_staff())
  with check (public.is_staff());

-- Note (perf / future-proofing, optional — not required for correctness):
-- every other `<table>_admin_all` policy still does `exists (select 1 from
-- public.profiles ...)`. Those are NOT recursive (different table) and work
-- fine now that profiles is fixed, but they re-run a sub-query on each row.
-- They can be migrated to `using (public.is_staff())` in a later pass.
