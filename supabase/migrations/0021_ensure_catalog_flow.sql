-- 0021_ensure_catalog_flow.sql
-- Idempotent safety net for the "create product → catalog" flow. Re-asserts the
-- pieces a fresh / partially-migrated database needs so the admin can CREATE
-- products (and categories, variants, images) and the storefront can READ them:
--   • products.preorder column (0018) — inserted on every product creation
--   • is_staff() + profiles RLS fix (0015) — admin role checks (no 500)
--   • catalog RLS: public read (active) + admin/staff write (0003 / 0019)
--   • public Storage bucket for product photos (upload on create / on edit)
-- Safe to run multiple times; nothing is duplicated or dropped destructively.
-- The catalog read/write policies are already established by 0003 + 0019; they
-- are re-asserted here only so a partially-migrated DB self-heals. The one piece
-- NOT created by any earlier migration is the `product-images` Storage bucket.

-- 1) Pre-order flag (also in 0018) — inserted by createProduct on every create.
alter table public.products
  add column if not exists preorder boolean not null default false;

-- 2) RLS recursion fix (also in 0015) — admin role lookups must not 500.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'staff')
  );
$$;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to anon, authenticated, service_role;

-- 3) Catalog RLS — public read (active rows) + admin/staff full write.
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images   enable row level security;
alter table public.categories       enable row level security;

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select using (status = 'active');

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select using (active = true);

drop policy if exists variants_public_read on public.product_variants;
create policy variants_public_read on public.product_variants
  for select using (
    active = true
    and exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
  );

drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read on public.product_images
  for select using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
  );

drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists categories_admin_all on public.categories;
create policy categories_admin_all on public.categories
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists product_variants_admin_all on public.product_variants;
create policy product_variants_admin_all on public.product_variants
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists product_images_admin_all on public.product_images;
create policy product_images_admin_all on public.product_images
  for all using (public.is_staff()) with check (public.is_staff());

-- 4) Public Storage bucket for product photos (createProduct / uploadImage).
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
