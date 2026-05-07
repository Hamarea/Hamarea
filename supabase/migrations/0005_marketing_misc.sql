-- 0005_marketing_misc.sql
-- Reviews, wishlists, newsletter, audit log, exchange rates, pages, settings

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  verified_purchase boolean not null default false,
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reviews_product_idx on public.reviews (product_id);
create trigger trg_reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Mes favoris',
  created_at timestamptz not null default now()
);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (wishlist_id, product_id)
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email citext unique not null,
  locale text not null default 'fr',
  consent_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  data jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity, entity_id);

create table if not exists public.exchange_rates (
  base char(3) not null,
  quote char(3) not null,
  rate numeric(20,8) not null,
  fetched_at timestamptz not null default now(),
  primary key (base, quote)
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_i18n jsonb not null default '{}'::jsonb,
  content_i18n jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger trg_pages_updated_at before update on public.pages
  for each row execute function public.set_updated_at();

create table if not exists public.shop_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
create trigger trg_settings_updated_at before update on public.shop_settings
  for each row execute function public.set_updated_at();

-- RLS
alter table public.reviews enable row level security;
alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.audit_logs enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.pages enable row level security;
alter table public.shop_settings enable row level security;

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select using (status = 'approved');

drop policy if exists reviews_self_write on public.reviews;
create policy reviews_self_write on public.reviews
  for insert with check (auth.uid() = user_id);

drop policy if exists wishlists_owner_all on public.wishlists;
create policy wishlists_owner_all on public.wishlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists wishlist_items_owner_all on public.wishlist_items;
create policy wishlist_items_owner_all on public.wishlist_items
  for all using (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()))
  with check (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()));

drop policy if exists newsletter_public_insert on public.newsletter_subscribers;
create policy newsletter_public_insert on public.newsletter_subscribers
  for insert with check (true);

drop policy if exists exchange_rates_public_read on public.exchange_rates;
create policy exchange_rates_public_read on public.exchange_rates
  for select using (true);

drop policy if exists pages_public_read on public.pages;
create policy pages_public_read on public.pages
  for select using (published = true);

drop policy if exists settings_public_read on public.shop_settings;
create policy settings_public_read on public.shop_settings
  for select using (true);

do $$
declare t text;
begin
  foreach t in array array[
    'reviews','wishlists','wishlist_items','newsletter_subscribers',
    'audit_logs','exchange_rates','pages','shop_settings'
  ] loop
    execute format($f$
      create policy %I on public.%I
        for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')))
        with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')))
    $f$, t||'_admin_all', t);
  end loop;
end $$;
