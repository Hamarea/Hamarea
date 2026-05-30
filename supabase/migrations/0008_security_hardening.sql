-- 0008_security_hardening.sql
-- Hardening based on Supabase security advisors.
--
-- Supabase grants EXECUTE on public-schema functions to the `anon` and
-- `authenticated` roles via default privileges, so the earlier
-- `revoke all ... from public` statements were NOT enough to keep these
-- SECURITY DEFINER functions off the public REST API. We revoke the implicit
-- grants explicitly here so each function is only reachable by its intended
-- role. (Trigger execution does not require EXECUTE, so the auth/updated_at/
-- search triggers keep working.)

-- service_role-only RPCs: must not be reachable from the public API at all.
revoke execute on function public.decrement_stock_for_order(uuid) from anon, authenticated;
revoke execute on function public.release_expired_reservations(int) from anon, authenticated;

-- Trigger-only function: never meant to be invoked via RPC. Its EXECUTE grant
-- comes from the PUBLIC pseudo-role (0002 never revoked it), so we must revoke
-- from PUBLIC as well, not just anon/authenticated.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Authenticated-only RPCs: keep `authenticated` (they role/auth-check inside),
-- but drop the implicit `anon` grant.
revoke execute on function public.moderate_review(uuid, public.review_status, text) from anon;
revoke execute on function public.flag_review(uuid, text) from anon;

-- Pin search_path on the two remaining mutable trigger functions.
alter function public.set_updated_at() set search_path = public;
alter function public.products_search_trigger() set search_path = public;
