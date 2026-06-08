-- 0022_product_featured.sql
-- Flag « vedette » : permet à l'admin de mettre un produit en avant sur la page
-- d'accueil (section FeaturedProducts, qui trie les vedettes en premier).
-- Additif & idempotent.

alter table public.products
  add column if not exists featured boolean not null default false;

create index if not exists products_featured_idx
  on public.products (featured) where featured = true;
