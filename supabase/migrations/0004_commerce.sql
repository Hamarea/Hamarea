-- 0004_commerce.sql
-- Carts, orders, payments, shipments, refunds, coupons

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  session_id text,
  currency char(3) not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists carts_user_idx on public.carts (user_id);
create index if not exists carts_session_idx on public.carts (session_id);
create trigger trg_carts_updated_at before update on public.carts
  for each row execute function public.set_updated_at();

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity int not null check (quantity > 0),
  unit_price_cents int not null check (unit_price_cents >= 0),
  added_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code citext unique not null,
  type public.coupon_type not null,
  value int not null check (value > 0),
  min_subtotal_cents int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit int,
  used_count int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_coupons_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number text unique not null default ('HAM-' || to_char(now(), 'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  user_id uuid references public.profiles(id) on delete set null,
  email citext not null,
  status public.order_status not null default 'pending',
  currency char(3) not null default 'EUR',
  subtotal_cents int not null default 0,
  shipping_cents int not null default 0,
  tax_cents int not null default 0,
  discount_cents int not null default 0,
  total_cents int not null default 0,
  shipping_address jsonb not null,
  billing_address jsonb not null,
  coupon_id uuid references public.coupons(id) on delete set null,
  stripe_payment_intent_id text unique,
  notes text,
  placed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_email_idx on public.orders (email);
create trigger trg_orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  sku text not null,
  name_snapshot text not null,
  quantity int not null check (quantity > 0),
  unit_price_cents int not null check (unit_price_cents >= 0),
  tax_rate numeric(5,4) not null default 0,
  total_cents int not null
);
create index if not exists order_items_order_idx on public.order_items (order_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_payment_id text,
  status public.payment_status not null default 'pending',
  amount_cents int not null,
  currency char(3) not null default 'EUR',
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_order_idx on public.payments (order_id);
create trigger trg_payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  carrier text,
  service text,
  tracking_number text,
  tracking_url text,
  status text not null default 'pending',
  shipping_cost_cents int,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shipments_order_idx on public.shipments (order_id);
create trigger trg_shipments_updated_at before update on public.shipments
  for each row execute function public.set_updated_at();

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  reason text,
  provider_refund_id text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  type text,
  payload jsonb,
  received_at timestamptz not null default now(),
  unique (provider, event_id)
);

-- RLS
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.refunds enable row level security;
alter table public.coupons enable row level security;
alter table public.webhook_events enable row level security;

-- Carts: owner or matching session
drop policy if exists carts_owner_all on public.carts;
create policy carts_owner_all on public.carts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists cart_items_owner_all on public.cart_items;
create policy cart_items_owner_all on public.cart_items
  for all using (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
  );

-- Orders: owner read; admins all
drop policy if exists orders_owner_read on public.orders;
create policy orders_owner_read on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists order_items_owner_read on public.order_items;
create policy order_items_owner_read on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

drop policy if exists payments_owner_read on public.payments;
create policy payments_owner_read on public.payments
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

drop policy if exists shipments_owner_read on public.shipments;
create policy shipments_owner_read on public.shipments
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- Coupons: code lookup public
drop policy if exists coupons_public_read on public.coupons;
create policy coupons_public_read on public.coupons
  for select using (active = true);

-- Admin/staff: full access on all commerce tables
do $$
declare t text;
begin
  foreach t in array array[
    'carts','cart_items','orders','order_items','payments','shipments',
    'refunds','coupons','webhook_events'
  ] loop
    execute format($f$
      create policy %I on public.%I
        for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')))
        with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')))
    $f$, t||'_admin_all', t);
  end loop;
end $$;
