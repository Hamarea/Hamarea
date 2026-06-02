-- 0013_user_permissions.sql
-- Fine-grained RBAC: per-user permission grants on top of the role.
--   - admin : implicitly has every permission (super-user).
--   - staff : only the permissions listed in profiles.permissions.
--   - customer : no admin permissions.
-- Existing staff are backfilled with the full operational set so nothing
-- regresses; new staff start empty and are granted explicitly from the admin UI.

alter table public.profiles
  add column if not exists permissions text[] not null default '{}';

update public.profiles
set permissions = array[
  'orders.write','orders.refund','products.write','coupons.write',
  'suppliers.write','settings.write','moderation.write'
]
where role = 'staff'
  and (permissions is null or permissions = '{}');

-- Extend the privilege-escalation guard (0010) to also protect `permissions`:
-- a non-admin must never be able to grant themselves permissions via the REST API.
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
  if new.role is distinct from old.role
     or new.id is distinct from old.id
     or new.permissions is distinct from old.permissions then
    if v_actor is null then
      return new;
    end if;
    select exists (
      select 1 from public.profiles p
      where p.id = v_actor and p.role = 'admin'
    ) into v_is_admin;
    if not v_is_admin then
      raise exception 'Only admins may change a profile role, id or permissions'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
