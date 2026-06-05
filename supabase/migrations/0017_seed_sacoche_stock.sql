-- 0017_seed_sacoche_stock.sql
-- Stock for the seeded "Sacoche" colours: ensures a default warehouse exists
-- and gives each colour an initial quantity. Idempotent (won't clobber stock
-- that already exists). Required so the Stock page shows the colours AND so
-- `decrement_stock_for_order` works on a sale.

do $$
declare
  v_wh uuid;
begin
  -- Ensure a default warehouse.
  select id into v_wh from public.warehouses where is_default order by created_at limit 1;
  if v_wh is null then
    insert into public.warehouses (name, country, is_default)
    values ('Entrepôt principal', 'FR', true)
    returning id into v_wh;
  end if;

  -- Initial stock per sacoche colour (100 units) in the default warehouse.
  insert into public.inventory (variant_id, warehouse_id, quantity, reorder_point)
  select pv.id, v_wh, 100, 5
  from public.product_variants pv
  where pv.sku in ('SACOCHE-ROSE', 'SACOCHE-NOIR', 'SACOCHE-BLANC')
  on conflict (variant_id, warehouse_id) do nothing;
end $$;
