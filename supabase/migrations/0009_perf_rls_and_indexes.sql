-- 0009_perf_rls_and_indexes.sql
-- Performance advisors remediation:
--  - add covering indexes for the 14 unindexed foreign keys
--  - wrap auth.uid() in (select auth.uid()) across every RLS policy so it is
--    evaluated once per statement (initplan) instead of once per row.
-- Behaviour is unchanged; only the query plan improves at scale. For FOR ALL
-- policies an omitted WITH CHECK defaults to the USING expression, so making
-- it explicit here keeps the original semantics.

-- 1) Covering indexes for foreign keys -------------------------------------
create index if not exists cart_items_variant_idx        on public.cart_items (variant_id);
create index if not exists inventory_warehouse_idx       on public.inventory (warehouse_id);
create index if not exists order_items_variant_idx       on public.order_items (variant_id);
create index if not exists orders_coupon_idx             on public.orders (coupon_id);
create index if not exists product_images_variant_idx    on public.product_images (variant_id);
create index if not exists products_supplier_idx         on public.products (supplier_id);
create index if not exists refunds_created_by_idx        on public.refunds (created_by);
create index if not exists refunds_order_idx             on public.refunds (order_id);
create index if not exists reviews_moderator_idx         on public.reviews (moderator_id);
create index if not exists reviews_user_idx              on public.reviews (user_id);
create index if not exists stock_movements_created_by_idx on public.stock_movements (created_by);
create index if not exists stock_movements_warehouse_idx  on public.stock_movements (warehouse_id);
create index if not exists wishlist_items_product_idx    on public.wishlist_items (product_id);
create index if not exists wishlists_user_idx            on public.wishlists (user_id);

-- 2) Re-create owner/self policies with (select auth.uid()) ----------------
-- profiles
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using ((select auth.uid()) = id);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using ((select auth.uid()) = id);

-- addresses
drop policy if exists addresses_self_all on public.addresses;
create policy addresses_self_all on public.addresses
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- carts
drop policy if exists carts_owner_all on public.carts;
create policy carts_owner_all on public.carts
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- cart_items
drop policy if exists cart_items_owner_all on public.cart_items;
create policy cart_items_owner_all on public.cart_items
  for all using (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid()))
  );

-- orders
drop policy if exists orders_owner_read on public.orders;
create policy orders_owner_read on public.orders
  for select using ((select auth.uid()) = user_id);

-- order_items
drop policy if exists order_items_owner_read on public.order_items;
create policy order_items_owner_read on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );

-- payments
drop policy if exists payments_owner_read on public.payments;
create policy payments_owner_read on public.payments
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );

-- shipments
drop policy if exists shipments_owner_read on public.shipments;
create policy shipments_owner_read on public.shipments
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );

-- reviews (self insert)
drop policy if exists reviews_self_write on public.reviews;
create policy reviews_self_write on public.reviews
  for insert with check ((select auth.uid()) = user_id);

-- wishlists
drop policy if exists wishlists_owner_all on public.wishlists;
create policy wishlists_owner_all on public.wishlists
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- wishlist_items
drop policy if exists wishlist_items_owner_all on public.wishlist_items;
create policy wishlist_items_owner_all on public.wishlist_items
  for all using (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = (select auth.uid())))
  with check (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = (select auth.uid())));

-- 3) Re-create every *_admin_all policy with (select auth.uid()) -----------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','addresses','categories','suppliers','warehouses','products',
    'product_variants','product_images','inventory','stock_movements',
    'carts','cart_items','orders','order_items','payments','shipments',
    'refunds','coupons','webhook_events','reviews','wishlists','wishlist_items',
    'newsletter_subscribers','audit_logs','exchange_rates','pages','shop_settings'
  ] loop
    execute format($f$drop policy if exists %I on public.%I$f$, t||'_admin_all', t);
    execute format($f$
      create policy %I on public.%I
        for all using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin','staff')))
        with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin','staff')))
    $f$, t||'_admin_all', t);
  end loop;
end $$;
