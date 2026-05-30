-- 0011_stock_decrement_sku_fallback.sql
-- Fix: orders created by the current checkout store the catalogue SKU in
-- order_items.sku and leave variant_id NULL, so decrement_stock_for_order
-- (which matched only on variant_id) never decremented anything.
--
-- We now resolve the variant by SKU when variant_id is NULL. Items that still
-- can't be resolved to a known variant are skipped (the sale is never blocked).
-- Behaviour for the variant_id path is unchanged.

create or replace function public.decrement_stock_for_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_warehouse uuid;
  v_variant uuid;
  it record;
begin
  select id into v_warehouse from public.warehouses where is_default order by created_at limit 1;
  if v_warehouse is null then
    raise exception 'No default warehouse defined';
  end if;

  for it in
    select oi.variant_id, oi.sku, oi.quantity
      from public.order_items oi
     where oi.order_id = p_order_id
  loop
    v_variant := it.variant_id;
    if v_variant is null and it.sku is not null then
      select id into v_variant from public.product_variants where sku = it.sku limit 1;
    end if;
    -- Unresolvable line (e.g. landing funnel SKU not in catalogue yet): skip.
    if v_variant is null then
      continue;
    end if;

    update public.inventory
       set quantity = quantity - it.quantity
     where variant_id = v_variant and warehouse_id = v_warehouse;

    insert into public.stock_movements(variant_id, warehouse_id, delta, reason, order_id, note)
    values (v_variant, v_warehouse, -it.quantity, 'sale', p_order_id, 'auto: order paid');
  end loop;
end;
$$;

-- Preserve the hardened grants (service_role only).
revoke execute on function public.decrement_stock_for_order(uuid) from public, anon, authenticated;
grant execute on function public.decrement_stock_for_order(uuid) to service_role;
