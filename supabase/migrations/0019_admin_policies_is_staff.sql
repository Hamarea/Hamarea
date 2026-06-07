-- 0019_admin_policies_is_staff.sql
-- Perf RLS : passer toutes les policies `<table>_admin_all` au helper
-- `public.is_staff()` (SECURITY DEFINER, ajouté en 0015) au lieu de refaire un
-- `exists (select 1 from public.profiles …)` à CHAQUE ligne.
--
-- Comportement inchangé (admin/staff = accès total), mais le plan de requête
-- s'améliore à l'échelle : `is_staff()` est `stable` → évaluée une fois par
-- requête (initplan) plutôt qu'une sous-requête corrélée par ligne. `profiles`
-- utilise déjà `is_staff()` depuis 0015 ; on l'inclut (réécriture idempotente).
-- Additif & idempotent : `drop policy if exists` avant `create policy`.

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
        for all using (public.is_staff()) with check (public.is_staff())
    $f$, t||'_admin_all', t);
  end loop;
end $$;
