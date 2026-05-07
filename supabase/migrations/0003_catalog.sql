-- 0003_catalog.sql
-- Categories, products, variants, images, suppliers, warehouses, inventory

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  slug text unique not null,
  name_i18n jsonb not null default '{}'::jsonb, -- { "fr": "...", "en": "..." }
  description_i18n jsonb not null default '{}'::jsonb,
  image_url text,
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists categories_parent_idx on public.categories (parent_id);
create trigger trg_categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email citext,
  phone text,
  country char(2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_suppliers_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();

create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country char(2) not null default 'FR',
  city text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_warehouses_updated_at before update on public.warehouses
  for each row execute function public.set_updated_at();

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_i18n jsonb not null default '{}'::jsonb,
  description_i18n jsonb not null default '{}'::jsonb,
  brand text,
  status public.product_status not null default 'draft',
  category_id uuid references public.categories(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  seo jsonb not null default '{}'::jsonb,
  search tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_status_idx on public.products (status);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_search_idx on public.products using gin (search);
create trigger trg_products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- Maintain search vector (FR + EN)
create or replace function public.products_search_trigger()
returns trigger language plpgsql as $$
begin
  new.search :=
    setweight(to_tsvector('simple', coalesce(new.name_i18n->>'fr','') || ' ' || coalesce(new.name_i18n->>'en','')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.brand,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.description_i18n->>'fr','') || ' ' || coalesce(new.description_i18n->>'en','')), 'C');
  return new;
end;
$$;
drop trigger if exists trg_products_search on public.products;
create trigger trg_products_search
  before insert or update of name_i18n, description_i18n, brand on public.products
  for each row execute function public.products_search_trigger();

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text unique not null,
  barcode text,
  option_values jsonb not null default '{}'::jsonb,
  price_cents int not null check (price_cents >= 0),
  compare_at_price_cents int check (compare_at_price_cents >= 0),
  cost_cents int check (cost_cents >= 0),
  currency char(3) not null default 'EUR',
  weight_g int check (weight_g >= 0),
  dimensions jsonb,
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists variants_product_idx on public.product_variants (product_id);
create trigger trg_variants_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  storage_path text not null,
  alt_i18n jsonb not null default '{}'::jsonb,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images (product_id);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  quantity int not null default 0 check (quantity >= 0),
  reserved int not null default 0 check (reserved >= 0),
  reorder_point int not null default 5,
  updated_at timestamptz not null default now(),
  unique (variant_id, warehouse_id)
);
create trigger trg_inventory_updated_at before update on public.inventory
  for each row execute function public.set_updated_at();

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  delta int not null,
  reason public.stock_movement_reason not null,
  order_id uuid,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists stock_movements_variant_idx on public.stock_movements (variant_id);

-- RLS
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.warehouses enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.inventory enable row level security;
alter table public.stock_movements enable row level security;

-- Public read for active catalog
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select using (active = true);

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select using (status = 'active');

drop policy if exists variants_public_read on public.product_variants;
create policy variants_public_read on public.product_variants
  for select using (
    active = true and exists (
      select 1 from public.products p where p.id = product_id and p.status = 'active'
    )
  );

drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read on public.product_images
  for select using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
  );

-- Admin/staff full access
do $$
declare t text;
begin
  foreach t in array array[
    'categories','suppliers','warehouses','products','product_variants',
    'product_images','inventory','stock_movements'
  ] loop
    execute format($f$drop policy if exists %I_admin_all on public.%I$f$, t||'_'||t, t);
    execute format($f$
      create policy %I on public.%I
        for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')))
        with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff')))
    $f$, t||'_admin_all', t);
  end loop;
end $$;
