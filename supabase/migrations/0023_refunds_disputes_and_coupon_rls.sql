-- 0023_refunds_disputes_and_coupon_rls.sql
-- ============================================================================
-- LOT 1 — Durcissement Stripe (suite audit docs/AUDIT-STRIPE-PRODUCTION-2026-07).
--
-- ⚠️  MIGRATION NON APPLIQUÉE AUTOMATIQUEMENT EN PRODUCTION.
--     À pousser explicitement (supabase db push / MCP apply_migration) après
--     revue. Append-only, idempotente, aucune valeur d'enum retirée.
--
-- Contenu :
--   1A (H1) Réconciliation remboursements & litiges Stripe
--       - nouveaux états order_status (ADDITIFS) ;
--       - orders.refunded_cents (cumul remboursé, source de vérité interne) ;
--       - refunds : status/currency/raw + unicité provider_refund_id (dédup) ;
--       - table disputes (cycle de vie d'un litige) + RLS admin/staff ;
--       - RPC ATOMIQUES reconcile_refund / reconcile_dispute / mark_order_failed
--         (service_role uniquement).
--   1B (H3) Suppression de la lecture publique des coupons.
--
-- 🧷 Restitution de stock : AUCUNE restitution automatique (décision produit).
--    Le webhook met à jour l'état FINANCIER uniquement ; un retour physique
--    reste un ajustement manuel admin (stock_movements.reason = 'return').
--
-- 🔒 Enum & transactions : les valeurs d'enum sont ajoutées avec
--    `add value if not exists` ; AUCUN statement de cette migration n'utilise
--    ces nouvelles valeurs comme données à l'exécution de la migration (les
--    corps PL/pgSQL sont planifiés paresseusement, après commit), ce qui évite
--    la restriction « new enum value not usable in the same transaction ».
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1A.1  Nouveaux états de commande (additifs, idempotents)
-- ---------------------------------------------------------------------------
alter type public.order_status add value if not exists 'partially_refunded';
alter type public.order_status add value if not exists 'disputed';
alter type public.order_status add value if not exists 'dispute_won';
alter type public.order_status add value if not exists 'dispute_lost';
alter type public.order_status add value if not exists 'failed';

-- ---------------------------------------------------------------------------
-- 1A.2  orders.refunded_cents : cumul remboursé (source de vérité interne)
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists refunded_cents int not null default 0
  check (refunded_cents >= 0);

-- ---------------------------------------------------------------------------
-- 1A.3  refunds : statut + dédup provider_refund_id (admin ET webhook)
-- ---------------------------------------------------------------------------
alter table public.refunds add column if not exists status text not null default 'succeeded';
alter table public.refunds add column if not exists currency char(3);
alter table public.refunds add column if not exists raw jsonb;
alter table public.refunds add column if not exists source_created_at timestamptz;

-- Un même remboursement Stripe (créé par l'admin OU reçu au webhook) n'est
-- inséré qu'une fois. Les remboursements manuels hors Stripe ont
-- provider_refund_id NULL et restent autorisés en multiple (index partiel).
create unique index if not exists refunds_provider_refund_id_key
  on public.refunds (provider_refund_id)
  where provider_refund_id is not null;

-- ---------------------------------------------------------------------------
-- 1A.4  disputes : cycle de vie d'un litige Stripe
-- ---------------------------------------------------------------------------
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  stripe_dispute_id text unique not null,
  stripe_charge_id text,
  stripe_payment_intent_id text,
  amount_cents int not null default 0,
  currency char(3) not null default 'EUR',
  status text not null,                 -- statut Stripe (needs_response, won, lost…)
  reason text,                          -- motif Stripe (fraudulent, product_not_received…)
  is_charge_refundable boolean,
  opened_at timestamptz,
  closed_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists disputes_order_idx on public.disputes (order_id);
create index if not exists disputes_pi_idx on public.disputes (stripe_payment_intent_id);

drop trigger if exists trg_disputes_updated_at on public.disputes;
create trigger trg_disputes_updated_at before update on public.disputes
  for each row execute function public.set_updated_at();

alter table public.disputes enable row level security;

-- Admin/staff : accès complet ; aucun accès public. Le webhook écrit via le
-- client service_role (contourne la RLS).
drop policy if exists disputes_admin_all on public.disputes;
create policy disputes_admin_all on public.disputes
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff'))
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff'))
  );

-- ---------------------------------------------------------------------------
-- 1A.5  RPC reconcile_refund — ATOMIQUE (orders + refunds en une transaction)
-- ---------------------------------------------------------------------------
-- p_refunded_cents = CUMUL ABSOLU remboursé (charge.amount_refunded Stripe).
-- p_refunds        = tableau JSON des remboursements Stripe [{id,amount,reason,
--                    status,created}] pour le journal (dédup par index unique).
create or replace function public.reconcile_refund(
  p_payment_intent text,
  p_refunded_cents int,
  p_currency text,
  p_refunds jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_current text;
  v_effective int;
  v_target text;
  r jsonb;
begin
  if p_payment_intent is null then
    return;
  end if;

  select * into v_order from public.orders
   where stripe_payment_intent_id = p_payment_intent
   for update;
  if not found then
    return;  -- aucune commande liée : best-effort, non bloquant
  end if;

  v_current := v_order.status::text;
  -- Cumul monotone : un événement arrivé dans le désordre (montant plus petit)
  -- ne peut jamais réduire le cumul déjà enregistré.
  v_effective := greatest(coalesce(v_order.refunded_cents, 0), coalesce(p_refunded_cents, 0));

  -- Bascule d'état UNIQUEMENT depuis un état réellement encaissé et non-litige,
  -- et jamais depuis 'refunded' (terminal). Jamais de retour à 'paid'.
  if v_current in ('paid','processing','shipped','delivered','partially_refunded') and v_effective > 0 then
    if v_effective >= v_order.total_cents then
      v_target := 'refunded';
    else
      v_target := 'partially_refunded';
    end if;
  else
    v_target := null;
  end if;

  update public.orders
     set refunded_cents = v_effective,
         status = coalesce(v_target::public.order_status, status),
         updated_at = now()
   where id = v_order.id;

  -- Journal des remboursements (dédup admin/webhook via index unique partiel).
  if p_refunds is not null then
    for r in select * from jsonb_array_elements(p_refunds)
    loop
      if coalesce((r->>'amount')::int, 0) > 0 then
        insert into public.refunds(
          order_id, amount_cents, reason, provider_refund_id, status, currency, raw, source_created_at
        ) values (
          v_order.id,
          (r->>'amount')::int,
          r->>'reason',
          r->>'id',
          coalesce(r->>'status', 'succeeded'),
          upper(coalesce(p_currency, v_order.currency)),
          r,
          case when r ? 'created' then to_timestamp((r->>'created')::bigint) else null end
        )
        on conflict (provider_refund_id) where provider_refund_id is not null do nothing;
      end if;
    end loop;
  end if;
end;
$$;

revoke all on function public.reconcile_refund(text, int, text, jsonb) from public, anon, authenticated;
grant execute on function public.reconcile_refund(text, int, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 1A.6  RPC reconcile_dispute — ATOMIQUE (disputes + orders)
-- ---------------------------------------------------------------------------
-- p_order_target : 'disputed' | 'dispute_won' | 'dispute_lost' | null.
-- L'upsert du litige gère l'arrivée des événements dans le désordre.
create or replace function public.reconcile_dispute(
  p_dispute_id text,
  p_payment_intent text,
  p_charge text,
  p_amount int,
  p_currency text,
  p_status text,
  p_reason text,
  p_is_refundable boolean,
  p_opened_at timestamptz,
  p_closed_at timestamptz,
  p_order_target text,
  p_raw jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_current text;
begin
  if p_dispute_id is null then
    return;
  end if;

  if p_payment_intent is not null then
    select id, status::text into v_order_id, v_current
      from public.orders
     where stripe_payment_intent_id = p_payment_intent
     for update;
  end if;

  insert into public.disputes(
    order_id, stripe_dispute_id, stripe_charge_id, stripe_payment_intent_id,
    amount_cents, currency, status, reason, is_charge_refundable, opened_at, closed_at, raw
  ) values (
    v_order_id, p_dispute_id, p_charge, p_payment_intent,
    coalesce(p_amount, 0), upper(coalesce(p_currency, 'EUR')), coalesce(p_status, 'unknown'),
    p_reason, p_is_refundable, p_opened_at, p_closed_at, p_raw
  )
  on conflict (stripe_dispute_id) do update
    set status = excluded.status,
        reason = coalesce(excluded.reason, public.disputes.reason),
        is_charge_refundable = excluded.is_charge_refundable,
        amount_cents = greatest(public.disputes.amount_cents, excluded.amount_cents),
        closed_at = coalesce(excluded.closed_at, public.disputes.closed_at),
        order_id = coalesce(public.disputes.order_id, excluded.order_id),
        raw = excluded.raw,
        updated_at = now();

  -- Bascule d'état commande, guardée : jamais depuis pending/failed/cancelled,
  -- jamais retour arbitraire à 'paid'.
  if v_order_id is not null
     and p_order_target is not null
     and v_current in ('paid','processing','shipped','delivered','partially_refunded','refunded','disputed') then
    update public.orders
       set status = p_order_target::public.order_status,
           updated_at = now()
     where id = v_order_id;
  end if;
end;
$$;

revoke all on function public.reconcile_dispute(text, text, text, int, text, text, text, boolean, timestamptz, timestamptz, text, jsonb) from public, anon, authenticated;
grant execute on function public.reconcile_dispute(text, text, text, int, text, text, text, boolean, timestamptz, timestamptz, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 1A.7  RPC mark_order_failed — pending → failed uniquement
-- ---------------------------------------------------------------------------
create or replace function public.mark_order_failed(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
     set status = 'failed'::public.order_status,
         updated_at = now()
   where id = p_order_id
     and status::text = 'pending';
end;
$$;

revoke all on function public.mark_order_failed(uuid) from public, anon, authenticated;
grant execute on function public.mark_order_failed(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 1B (H3)  Suppression de la lecture publique des coupons
-- ---------------------------------------------------------------------------
-- La validation d'un code passe par la route serveur /api/checkout/coupon
-- (client service_role → contourne la RLS) et ne renvoie au client que le
-- résultat nécessaire. L'admin conserve l'accès via coupons_admin_all. Aucun
-- accès anonyme n'est requis : on retire l'exposition de tous les codes actifs.
drop policy if exists coupons_public_read on public.coupons;
