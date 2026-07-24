-- supabase/tests/0023_refunds_disputes.test.sql
-- Tests SQL RÉELS de la migration 0023 (réconciliation remboursements/litiges +
-- RLS coupons). Nécessite un Postgres avec les migrations 0001..0023 appliquées.
--
-- Exécution locale (ex.) :
--   psql -d hamarea_test -v ON_ERROR_STOP=1 -f supabase/tests/0023_refunds_disputes.test.sql
--
-- Chaque assertion lève une EXCEPTION en cas d'échec (arrêt immédiat). Un run
-- complet se termine par « ALL SQL TESTS PASSED ». Idempotent : nettoie ses
-- données en préambule.

begin;

-- Nettoyage préalable (données de test isolées par des identifiants _t*).
delete from public.refunds  where order_id in (select id from public.orders where email like 'sqltest+%');
delete from public.disputes where stripe_dispute_id like 'dp_t%';
delete from public.orders   where email like 'sqltest+%';
delete from public.coupons  where code like 'SQLT_%';

-- Helper d'assertion.
create or replace function pg_temp.assert(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if not cond then raise exception 'ASSERT FAILED: %', msg; end if;
end $$;

-- ===========================================================================
-- Fixtures : commandes payées (total 10 000).
-- ===========================================================================
insert into public.orders (id, email, status, currency, total_cents, refunded_cents, shipping_address, billing_address, stripe_payment_intent_id)
values
  ('00000000-0000-0000-0000-0000000000a1','sqltest+refund@x.co','paid','EUR',10000,0,'{}','{}','pi_t_refund'),
  ('00000000-0000-0000-0000-0000000000a2','sqltest+disp@x.co','paid','EUR',10000,0,'{}','{}','pi_t_disp'),
  ('00000000-0000-0000-0000-0000000000a3','sqltest+won@x.co','paid','EUR',10000,0,'{}','{}','pi_t_won'),
  ('00000000-0000-0000-0000-0000000000a4','sqltest+ooo@x.co','paid','EUR',10000,0,'{}','{}','pi_t_ooo'),
  ('00000000-0000-0000-0000-0000000000a5','sqltest+fail@x.co','pending','EUR',10000,0,'{}','{}','pi_t_fail'),
  ('00000000-0000-0000-0000-0000000000a6','sqltest+paidfail@x.co','paid','EUR',10000,0,'{}','{}','pi_t_paidfail');

-- ===========================================================================
-- 1) Remboursement PARTIEL → partially_refunded + 1 ligne refunds.
-- ===========================================================================
select public.reconcile_refund('pi_t_refund', 3000, 'eur',
  '[{"id":"re_t1","amount":3000,"reason":"requested_by_customer","status":"succeeded","created":100}]'::jsonb);
select pg_temp.assert(
  (select status::text from public.orders where stripe_payment_intent_id='pi_t_refund')='partially_refunded'
  and (select refunded_cents from public.orders where stripe_payment_intent_id='pi_t_refund')=3000
  and (select count(*) from public.refunds where provider_refund_id='re_t1')=1,
  '1: remboursement partiel');

-- ===========================================================================
-- 2) Remboursement RÉPÉTÉ (même refund id) → idempotent (pas de double ligne).
-- ===========================================================================
select public.reconcile_refund('pi_t_refund', 3000, 'eur',
  '[{"id":"re_t1","amount":3000,"reason":"requested_by_customer","status":"succeeded","created":100}]'::jsonb);
select pg_temp.assert(
  (select count(*) from public.refunds where provider_refund_id='re_t1')=1
  and (select refunded_cents from public.orders where stripe_payment_intent_id='pi_t_refund')=3000,
  '2: dédup remboursement répété');

-- ===========================================================================
-- 3) Complément → cumul TOTAL → refunded + 2e ligne refunds.
-- ===========================================================================
select public.reconcile_refund('pi_t_refund', 10000, 'eur',
  '[{"id":"re_t2","amount":7000,"reason":"requested_by_customer","status":"succeeded","created":200}]'::jsonb);
select pg_temp.assert(
  (select status::text from public.orders where stripe_payment_intent_id='pi_t_refund')='refunded'
  and (select refunded_cents from public.orders where stripe_payment_intent_id='pi_t_refund')=10000
  and (select count(*) from public.refunds where order_id='00000000-0000-0000-0000-0000000000a1')=2,
  '3: remboursement total');

-- ===========================================================================
-- 4) OUT-OF-ORDER : un événement partiel tardif ne rétrograde jamais 'refunded'.
-- ===========================================================================
select public.reconcile_refund('pi_t_refund', 2000, 'eur', '[]'::jsonb);
select pg_temp.assert(
  (select status::text from public.orders where stripe_payment_intent_id='pi_t_refund')='refunded'
  and (select refunded_cents from public.orders where stripe_payment_intent_id='pi_t_refund')=10000,
  '4: pas de rétrogradation out-of-order');

-- ===========================================================================
-- 5) LITIGE créé → disputed, puis PERDU → dispute_lost (upsert, 1 seule ligne).
-- ===========================================================================
select public.reconcile_dispute('dp_t1','pi_t_disp','ch_t1',10000,'eur','needs_response','fraudulent',true, now(), null, 'disputed', '{}'::jsonb);
select pg_temp.assert(
  (select status::text from public.orders where stripe_payment_intent_id='pi_t_disp')='disputed'
  and (select count(*) from public.disputes where stripe_dispute_id='dp_t1')=1,
  '5a: litige créé → disputed');

select public.reconcile_dispute('dp_t1','pi_t_disp','ch_t1',10000,'eur','lost','fraudulent',false, now(), now(), 'dispute_lost', '{}'::jsonb);
select pg_temp.assert(
  (select status::text from public.orders where stripe_payment_intent_id='pi_t_disp')='dispute_lost'
  and (select status from public.disputes where stripe_dispute_id='dp_t1')='lost'
  and (select count(*) from public.disputes where stripe_dispute_id='dp_t1')=1,
  '5b: litige perdu → dispute_lost (upsert)');

-- ===========================================================================
-- 6) LITIGE GAGNÉ → dispute_won.
-- ===========================================================================
select public.reconcile_dispute('dp_t2','pi_t_won','ch_t2',10000,'eur','needs_response','fraudulent',true, now(), null, 'disputed', '{}'::jsonb);
select public.reconcile_dispute('dp_t2','pi_t_won','ch_t2',10000,'eur','won','fraudulent',false, now(), now(), 'dispute_won', '{}'::jsonb);
select pg_temp.assert(
  (select status::text from public.orders where stripe_payment_intent_id='pi_t_won')='dispute_won',
  '6: litige gagné → dispute_won');

-- ===========================================================================
-- 7) LITIGE OUT-OF-ORDER : 'closed' (won) reçu SANS 'created' préalable.
-- ===========================================================================
select public.reconcile_dispute('dp_t3','pi_t_ooo','ch_t3',10000,'eur','won','fraudulent',false, now(), now(), 'dispute_won', '{}'::jsonb);
select pg_temp.assert(
  (select status::text from public.orders where stripe_payment_intent_id='pi_t_ooo')='dispute_won'
  and (select count(*) from public.disputes where stripe_dispute_id='dp_t3')=1,
  '7: litige clos reçu dans le désordre');

-- ===========================================================================
-- 8) mark_order_failed : pending → failed ; jamais une commande payée.
-- ===========================================================================
select public.mark_order_failed('00000000-0000-0000-0000-0000000000a5');
select public.mark_order_failed('00000000-0000-0000-0000-0000000000a6');
select pg_temp.assert(
  (select status::text from public.orders where stripe_payment_intent_id='pi_t_fail')='failed'
  and (select status::text from public.orders where stripe_payment_intent_id='pi_t_paidfail')='paid',
  '8: échec paiement pending→failed, paid intouché');

-- ===========================================================================
-- 9) Remboursement sur une commande NON encaissée (pending) → aucune bascule,
--    jamais de retour à 'paid'.
-- ===========================================================================
insert into public.orders (id, email, status, currency, total_cents, shipping_address, billing_address, stripe_payment_intent_id)
values ('00000000-0000-0000-0000-0000000000a7','sqltest+pend@x.co','pending','EUR',10000,'{}','{}','pi_t_pend');
select public.reconcile_refund('pi_t_pend', 5000, 'eur', '[]'::jsonb);
select pg_temp.assert(
  (select status::text from public.orders where stripe_payment_intent_id='pi_t_pend')='pending',
  '9: remboursement sur pending ne bascule pas');

-- ===========================================================================
-- 10) RLS COUPONS : anon ne peut PLUS lister les coupons actifs (H3).
-- ===========================================================================
insert into public.coupons (code, type, value, active) values ('SQLT_SECRET', 'percent', 10, true);
grant select on public.coupons to anon;   -- comme Supabase : le grant existe, seule la RLS filtre
set local role anon;
select pg_temp.assert(
  (select count(*) from public.coupons where code='SQLT_SECRET')=0,
  '10: anon ne lit aucun coupon (policy coupons_public_read supprimée)');
reset role;

-- Confirme qu'en service_role/superuser la lecture reste possible (admin path).
select pg_temp.assert(
  (select count(*) from public.coupons where code='SQLT_SECRET')=1,
  '10b: le coupon existe bien (lecture privilégiée)');

do $$ begin raise notice 'ALL SQL TESTS PASSED'; end $$;

rollback;  -- aucun résidu : tests non destructifs
