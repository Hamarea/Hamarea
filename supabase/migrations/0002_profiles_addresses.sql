-- 0002_profiles_addresses.sql
-- User profiles linked 1-1 with auth.users + addresses

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext unique,
  full_name text,
  phone text,
  locale text not null default 'fr',
  currency text not null default 'EUR',
  marketing_opt_in boolean not null default false,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles (role);

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Addresses
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.address_type not null default 'shipping',
  full_name text not null,
  line1 text not null,
  line2 text,
  city text not null,
  zip text not null,
  state text,
  country char(2) not null,
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses (user_id);
create trigger trg_addresses_updated_at before update on public.addresses
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id);

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff'))
  );

drop policy if exists addresses_self_all on public.addresses;
create policy addresses_self_all on public.addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists addresses_admin_all on public.addresses;
create policy addresses_admin_all on public.addresses
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff'))
  );
