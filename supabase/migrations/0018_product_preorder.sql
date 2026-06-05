-- 0018_product_preorder.sql
-- Pre-order flag: when true, the product shows a "Précommander" banner/badge
-- (admin list now, storefront once it reads the DB). Additive & idempotent.

alter table public.products
  add column if not exists preorder boolean not null default false;
