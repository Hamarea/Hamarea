-- 0016_seed_sacoche.sql
-- Seed the existing "Sacoche Étanche" (3 colours) into the catalogue so the
-- admin can manage it and the storefront can read it from the DB.
-- Idempotent: safe to run multiple times. Images point at the /public assets
-- (`/colors/*.jpg`) already shipped with the app.

do $$
declare
  v_product uuid;
  v_rose uuid;
  v_noir uuid;
  v_blanc uuid;
begin
  -- Product
  insert into public.products (slug, name_i18n, status, brand)
  values (
    'sacoche-etanche',
    '{"fr":"Sacoche Étanche Hamarea","en":"Hamarea Waterproof Pouch","es":"Bolsa Estanca Hamarea","de":"Hamarea Wasserdichte Tasche"}'::jsonb,
    'active',
    'Hamarea'
  )
  on conflict (slug) do update set status = excluded.status
  returning id into v_product;

  -- Variants (one per colour). hex stored in option_values for the swatch.
  insert into public.product_variants
    (product_id, sku, option_values, price_cents, compare_at_price_cents, currency, position, active)
  values (v_product, 'SACOCHE-ROSE', '{"color":"Rose","hex":"#F4ACB7"}'::jsonb, 2490, 3990, 'EUR', 0, true)
  on conflict (sku) do update set option_values = excluded.option_values, price_cents = excluded.price_cents
  returning id into v_rose;

  insert into public.product_variants
    (product_id, sku, option_values, price_cents, compare_at_price_cents, currency, position, active)
  values (v_product, 'SACOCHE-NOIR', '{"color":"Noir","hex":"#111111"}'::jsonb, 2490, 3990, 'EUR', 1, true)
  on conflict (sku) do update set option_values = excluded.option_values, price_cents = excluded.price_cents
  returning id into v_noir;

  insert into public.product_variants
    (product_id, sku, option_values, price_cents, compare_at_price_cents, currency, position, active)
  values (v_product, 'SACOCHE-BLANC', '{"color":"Blanc","hex":"#F5F5F1"}'::jsonb, 2490, 3990, 'EUR', 2, true)
  on conflict (sku) do update set option_values = excluded.option_values, price_cents = excluded.price_cents
  returning id into v_blanc;

  -- Photos, each linked to its colour variant. Re-seed cleanly.
  delete from public.product_images
   where product_id = v_product
     and storage_path in ('/colors/rose.jpg', '/colors/noir.jpg', '/colors/blanc.jpg');
  insert into public.product_images (product_id, variant_id, storage_path, position) values
    (v_product, v_rose,  '/colors/rose.jpg',  0),
    (v_product, v_noir,  '/colors/noir.jpg',  1),
    (v_product, v_blanc, '/colors/blanc.jpg', 2);
end $$;
