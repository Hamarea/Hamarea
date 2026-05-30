-- 0010_fix_privilege_escalation.sql
-- 🔴 CRITICAL FIX — privilege escalation via profiles.role
--
-- `profiles_self_update` (0002/0009) only isolates the ROW (id = auth.uid()),
-- never the COLUMNS. With no WITH CHECK guarding `role` and no column REVOKE,
-- any authenticated user could PATCH /rest/v1/profiles?id=eq.<self> {"role":"admin"}
-- and self-promote to admin, then pass middleware + layout + every *_admin_all
-- RLS policy.
--
-- Fix: a BEFORE UPDATE trigger (SECURITY DEFINER so it can read profiles.role
-- regardless of RLS) that forbids changing `role` or `id` unless the actor is
-- an admin. The service_role (no JWT → auth.uid() is null) and admins keep the
-- ability to manage roles, so the admin "customers" UI still works.

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_is_admin boolean;
begin
  -- Only react when the protected columns actually change.
  if new.role is distinct from old.role or new.id is distinct from old.id then
    -- service_role / trusted server contexts have no JWT subject: allow.
    if v_actor is null then
      return new;
    end if;

    select exists (
      select 1 from public.profiles p
      where p.id = v_actor and p.role = 'admin'
    ) into v_is_admin;

    if not v_is_admin then
      raise exception 'Only admins may change a profile role or id'
        using errcode = '42501'; -- insufficient_privilege
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_role_self_escalation() from public, anon, authenticated;

drop trigger if exists trg_prevent_role_self_escalation on public.profiles;
create trigger trg_prevent_role_self_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- Make the self-update policy's intent explicit: a user may update their own
-- row, and the row must STILL belong to them afterwards (defence in depth — the
-- trigger above is what actually protects the `role`/`id` columns).
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
