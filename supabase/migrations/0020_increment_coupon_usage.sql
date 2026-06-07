-- 0020_increment_coupon_usage.sql
-- Compteur d'usage de coupon ATOMIQUE, appelé par le webhook Stripe quand une
-- commande passe `paid` (cf. src/app/api/webhooks/stripe/route.ts). L'atomicité
-- côté Postgres évite la course critique d'un read-puis-write applicatif quand
-- deux commandes consomment le même code en parallèle.
--
-- service_role uniquement (le webhook l'appelle via le client admin). On révoque
-- les grants implicites (anon/authenticated) comme pour les autres RPC de
-- confiance (cf. 0008/0011/0012) et on épingle search_path (sécurité).

create or replace function public.increment_coupon_usage(p_coupon_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.coupons
     set used_count = used_count + 1,
         updated_at = now()
   where id = p_coupon_id;
$$;

revoke all on function public.increment_coupon_usage(uuid) from public, anon, authenticated;
grant execute on function public.increment_coupon_usage(uuid) to service_role;
