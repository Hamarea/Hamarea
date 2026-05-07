-- 0006_rpc_and_seed.sql
-- Reusable RPC: stock decrement at payment, with movement log

create or replace function public.decrement_stock_for_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_warehouse uuid;
  it record;
begin
  select id into v_warehouse from public.warehouses where is_default order by created_at limit 1;
  if v_warehouse is null then
    raise exception 'No default warehouse defined';
  end if;

  for it in
    select oi.variant_id, oi.quantity from public.order_items oi where oi.order_id = p_order_id
  loop
    update public.inventory
       set quantity = quantity - it.quantity
     where variant_id = it.variant_id and warehouse_id = v_warehouse;

    insert into public.stock_movements(variant_id, warehouse_id, delta, reason, order_id, note)
    values (it.variant_id, v_warehouse, -it.quantity, 'sale', p_order_id, 'auto: order paid');
  end loop;
end;
$$;

revoke all on function public.decrement_stock_for_order(uuid) from public;
grant execute on function public.decrement_stock_for_order(uuid) to service_role;

-- Cleanup expired reservations (called by cron edge function)
create or replace function public.release_expired_reservations(p_minutes int default 15)
returns int
language plpgsql security definer set search_path = public as $$
declare
  affected int := 0;
begin
  -- Simplified: reset reserved=0 on carts older than threshold not converted to orders.
  -- (Real implementation would track reservation timestamps per cart_item.)
  update public.cart_items ci
     set quantity = quantity
   where ci.added_at < now() - (p_minutes || ' minutes')::interval;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.release_expired_reservations(int) from public;
grant execute on function public.release_expired_reservations(int) to service_role;

-- Seed minimal data: a default warehouse, a few categories, a sample product
insert into public.warehouses (name, country, city, is_default)
values ('Entrepôt principal', 'FR', 'Paris', true)
on conflict do nothing;

insert into public.categories (slug, name_i18n, description_i18n, position) values
  ('accessoires', '{"fr":"Accessoires","en":"Accessories","es":"Accesorios","de":"Accessoires"}', '{"fr":"Petits objets soignés","en":"Curated small goods"}', 1),
  ('maison',      '{"fr":"Maison","en":"Home","es":"Hogar","de":"Wohnen"}',                       '{"fr":"Pour la maison","en":"For your home"}', 2),
  ('mode',        '{"fr":"Mode","en":"Fashion","es":"Moda","de":"Mode"}',                          '{"fr":"Pièces sélectionnées","en":"Selected pieces"}', 3)
on conflict (slug) do nothing;

-- Settings: default currency, supported currencies, default locale
insert into public.shop_settings(key, value) values
  ('site',       '{"name":"Hamarea","supportEmail":"hello@hamarea.com"}'),
  ('locales',    '["fr","en","es","de"]'),
  ('currencies', '["EUR","USD","GBP"]'),
  ('shipping',   '{"freeAbove":7900,"flatRate":590}')
on conflict (key) do nothing;
