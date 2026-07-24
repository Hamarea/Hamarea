# Rapport de correction Stripe — LOT 1

> **Suite de** : `docs/AUDIT-STRIPE-PRODUCTION-2026-07.md` (commit de référence `e7c4ec7`).
> **Objectif** : corriger les blocages de priorité **Haute** (H1, H2, H3) et la garde d'environnement **M6**, sans refonte, sans modification visuelle, sans toucher aux règles de prix / TVA / devise.
> **Date** : 23 juillet 2026.

---

## 0. Métadonnées

| | |
|---|---|
| **Branche** | `claude/fix-stripe-hardening-lot1` (créée depuis `origin/main` @ `1b5ee54`) |
| **Base** | dernier `main` — **jamais** la branche d'audit |
| **Migration créée** | `supabase/migrations/0023_refunds_disputes_and_coupon_rls.sql` — ⚠️ **NON appliquée automatiquement en production** |
| **Merge** | ❌ non mergé (PR **brouillon**) |

### Fichiers modifiés

| Fichier | Objet |
|---|---|
| `src/app/api/webhooks/stripe/route.ts` | +handlers `charge.refunded`, `charge.dispute.*`, `payment_intent.payment_failed` (1A) |
| `src/app/[locale]/admin/orders/actions.ts` | remboursement admin : idempotency-key + garde cumulative + statut partiel (1A) |
| `src/lib/stripe.ts` | appel de la garde de configuration (1C) |
| `next.config.ts` | Content-Security-Policy (Report-Only par défaut) (1D) |
| `.env.example` | doc `STRIPE_ALLOW_LIVE_IN_DEV`, `CSP_ENFORCE` |

### Fichiers créés

| Fichier | Objet |
|---|---|
| `supabase/migrations/0023_refunds_disputes_and_coupon_rls.sql` | enum + `refunded_cents` + `disputes` + RPC atomiques + drop RLS coupons |
| `src/lib/order-transitions.ts` | matrice de transition PURE (spécification testée) |
| `src/lib/stripe-config.ts` | garde test/live PURE |
| `src/lib/order-transitions.test.ts` | 20 tests matrice |
| `src/lib/stripe-config.test.ts` | 12 tests garde env |
| `src/lib/coupon-db.test.ts` | 10 tests résolution coupon serveur |
| `src/app/api/webhooks/stripe/route.test.ts` | 10 tests intégration webhook |
| `supabase/tests/0023_refunds_disputes.test.sql` | 10 tests SQL réels (RPC + RLS) |

---

## 1. LOT 1A — Remboursements & litiges (H1)

### Événements désormais pris en charge

| Événement | Traitement | Bascule d'état |
|---|---|---|
| `charge.refunded` | `reconcile_refund` (cumul absolu `amount_refunded`) | `partially_refunded` / `refunded` |
| `charge.dispute.created` | `reconcile_dispute` (upsert litige) | `disputed` |
| `charge.dispute.updated` | `reconcile_dispute` (upsert litige) | aucune |
| `charge.dispute.closed` | `reconcile_dispute` (won/lost) | `dispute_won` / `dispute_lost` |
| `payment_intent.payment_failed` | `mark_order_failed` | `pending → failed` |

**Événements volontairement NON écoutés** (pour éviter le double traitement d'une même mutation) : `refund.created`, `refund.updated`, `charge.refund.updated`. `charge.refunded` porte déjà le **cumul absolu** remboursé (`amount_refunded`) et la liste des remboursements ; l'écouter seul est suffisant et non ambigu. Justifié dans l'en-tête de `route.ts`.

### Références fiables utilisées (jamais le client)

- Remboursement : la commande est retrouvée par `charge.payment_intent` → `orders.stripe_payment_intent_id` (unique).
- Litige : `dispute.payment_intent` → même clé. `dispute.charge` et `dispute.id` sont persistés.
- Échec : `payment_intent.metadata.order_id` (métadonnée posée par nous à la création).

### Idempotence & désordre

1. **Signature vérifiée avant tout parsing métier** (`route.ts` — inchangé, `constructEvent`).
2. **Dédup transport** : `webhook_events (provider, event_id)` unique → `23505` ⇒ ack sans retraitement (couvre automatiquement les nouveaux événements).
3. **Idempotence métier** :
   - remboursement : `refunded_cents = greatest(actuel, cumul_reçu)` → **jamais de rétrogradation** ni de double comptage, même en désordre ;
   - journal `refunds` dédupliqué par index unique partiel `provider_refund_id` (couvre admin **et** webhook) ;
   - litige : `insert … on conflict (stripe_dispute_id) do update` → un litige = une ligne, quel que soit l'ordre d'arrivée ;
   - échec : `where status = 'pending'` uniquement.
4. **Atomicité** : chaque mutation multi-tables (orders+refunds, orders+disputes) est encapsulée dans une **RPC PL/pgSQL** `security definer` (une transaction).

### Matrice de transition d'état (autoritaire)

États : `pending · paid · processing · shipped · delivered · cancelled · refunded · partially_refunded · disputed · dispute_won · dispute_lost · failed`.

```
                      ┌────────────► cancelled            (admin)
                      │
pending ──payé──► paid ──┬─► processing ─► shipped ─► delivered
   │                     │
   │(échec paiement)     │(charge.refunded, cumul < total)
   ▼                     ▼
 failed          partially_refunded ──(cumul = total)──► refunded
                         ▲                                   ▲
                         └───────────(charge.refunded)───────┘
 paid/processing/shipped/delivered/partially_refunded/refunded
                         │(charge.dispute.created)
                         ▼
                      disputed ──(closed won)──► dispute_won
                             └───(closed lost)──► dispute_lost
```

**Gardes appliquées (côté RPC, autoritaires)** :
- jamais de retour arbitraire à `paid` ;
- jamais de rétrogradation depuis `refunded` (terminal) sur un événement remboursement ;
- aucune bascule remboursement/litige depuis `pending` / `failed` / `cancelled` ;
- un remboursement n'écrase pas un état de litige (`disputed`/`dispute_*`) ;
- `payment_intent.payment_failed` ne touche **que** `pending`.

La même matrice est exprimée en TypeScript PUR (`src/lib/order-transitions.ts`) — c'est la référence **testée** ; les RPC SQL en sont le **miroir exécutable**, re-vérifié par les tests SQL réels.

### Stratégie de restitution du stock

> **Décision produit (validée) : AUCUNE restitution automatique de stock** sur remboursement ou litige.

Le webhook met à jour **l'état financier uniquement**. Un remboursement ne garantit pas que la marchandise revient vendable (dropshipping / bien conservé / retour non systématique) : restituer automatiquement risquerait la **survente**. Un vrai retour physique reste un **ajustement manuel admin** (mouvement `stock_movements.reason = 'return'`). Documenté dans la migration 0023 et l'en-tête du webhook. **Aucune double restitution possible** puisqu'il n'y a pas de restitution du tout.

### Remboursement côté admin (durci)

`createRefund` (`admin/orders/actions.ts`) :
- **garde cumulative** : `montant > total − déjà_remboursé` ⇒ refus (plus de sur-remboursement) ;
- **idempotency-key Stripe** = `sha256(orderId:montant:déjà_remboursé)` → un double-clic réutilise le remboursement au lieu d'en créer un second ;
- insertion `refunds` tolérante au `23505` (dédup avec le webhook) ;
- bascule d'état via la matrice pure (`partially_refunded` / `refunded`).

---

## 2. LOT 1B — Coupons non publics (H3)

- **RLS** : `drop policy coupons_public_read` (migration 0023). Un visiteur anonyme ne peut **plus** lister les codes actifs.
- **Chemin serveur conservé** : `/api/checkout/coupon` (client `service_role`, contourne la RLS) ne renvoie au client que `{ ok, discountCents, code }` — **jamais** la liste des codes, les quotas globaux, ni les règles internes.
- **Montant toujours recalculé serveur** à la création de session (`/api/checkout/session`) — inchangé.
- **Admin** conserve l'accès via `coupons_admin_all`.
- **Vérifié** : aucun composant navigateur ne lit la table `coupons` (seuls `admin/**` via client serveur gardé RLS et `coupon-db.ts` via client admin).

Tests : `coupon-db.test.ts` (valide / inexistant / expiré / désactivé / quota / minimum / trim espaces / code vide / erreur DB) + test SQL réel « anon ne lit aucun coupon » (§10 du fichier SQL).

---

## 3. LOT 1C — Garde test/live (M6)

`src/lib/stripe-config.ts` (`validateStripeConfig`, PURE) appelée une fois par `getStripe()` :
- **production** : exige `sk_live_`, `pk_live_`, `STRIPE_WEBHOOK_SECRET` ; **refuse** les clés de test ;
- **dev/test** : **refuse** les clés live, sauf `STRIPE_ALLOW_LIVE_IN_DEV=true` (échappatoire documentée) ;
- vérifie la **cohérence de mode** secrète/publique ;
- **erreur bloquante** si incohérent ; **ne journalise jamais** une clé complète (`maskKey` ne montre que le préfixe) ;
- **mode aperçu préservé** : sans `STRIPE_SECRET_KEY`, `getStripe()` renvoie `null` sans bloquer (comportement historique).

Tests : `stripe-config.test.ts` (test-en-prod, live-en-dev, override, modes incohérents, webhook/publique manquants en prod, non-fuite de secret…).

---

## 4. LOT 1D — CSP Stripe (H2)

- **Première CSP de l'app** → déployée en **`Content-Security-Policy-Report-Only`** par défaut (ne bloque rien, remonte les violations). Bascule en enforce via `CSP_ENFORCE=true`.
- **Domaines** (allowlist ciblée, pas trop large) :

| Directive | Valeur |
|---|---|
| `default-src` | `'self'` |
| `script-src` | `'self' 'unsafe-inline' https://js.stripe.com` |
| `style-src` | `'self' 'unsafe-inline'` |
| `img-src` | `'self' data: blob: *.supabase.co *.supabase.in images.unsplash.com *.stripe.com` |
| `font-src` | `'self' data:` |
| `connect-src` | `'self' api.stripe.com m.stripe.com r.stripe.com *.supabase.co *.supabase.in wss://*.supabase.co` |
| `frame-src` | `js.stripe.com hooks.stripe.com *.stripe.com` |
| `form-action` | `'self'` |
| `frame-ancestors` | `'self'` |
| `base-uri` | `'self'` |
| `object-src` | `'none'` |

- **Pas de `'unsafe-eval'`**. `'unsafe-inline'` (script/style) est requis par l'hydratation Next.js/React ; **documenté** dans `next.config.ts` et à remplacer par des **nonces** au passage en enforce.
- Apple Pay / Google Pay / Link / 3DS s'exécutent dans les iframes Stripe → couverts par `frame-src` + `*.stripe.com`.

> ⚠️ **La CSP seule n'est PAS une preuve de conformité PCI DSS.** Contrôles complémentaires des scripts de paiement à mettre en place séparément (audit) : inventaire des scripts de la page de paiement (§6.4.3), mécanisme de détection d'altération (§11.6.1). La saisie carte reste sur la page **hébergée** Stripe (posture SAQ-A). Ces contrôles sortent du périmètre code de ce lot et restent un risque résiduel documenté.

---

## 5. Validation exécutée

| Contrôle | Commande | Résultat |
|---|---|---|
| Lint | `npm run lint` | ✅ No ESLint warnings or errors |
| Type-check | `npm run typecheck` | ✅ 0 erreur |
| Tests unitaires + intégration | `npm test` | ✅ **78 passed** (26 avant → +52) |
| Tests SQL réels (Postgres 16) | migrations 0001→0023 + `0023_refunds_disputes.test.sql` | ✅ **ALL SQL TESTS PASSED** |
| Build production | `npm run build` | ✅ succès |
| Recherche de secrets | grep clés live/test/webhook hardcodées | ✅ aucun littéral |

**Simulations couvertes** (webhook + SQL) : `checkout.session.completed` (non-régression), événement **dupliqué** (23505), remboursement **partiel**, **total**, **répété/idempotent**, **out-of-order**, litige **créé / gagné / perdu**, litige **clos reçu dans le désordre**, `payment_intent.payment_failed` (pending→failed, paid intouché), remboursement sur commande **pending** (pas de bascule), **clé test en prod / live en dev** (garde), **anon ne lit aucun coupon**.

**Non simulés faute d'outil externe dans l'environnement** (marqués NON VÉRIFIABLE ici, à rejouer en staging) : retour 3DS réel dans un navigateur, Apple/Google Pay réels, Stripe CLI `stripe trigger`, URL de retour malveillante réelle (protection existante : `success_url`/`cancel_url` construites serveur — cf. audit §3.2, inchangé).

> Les tests SQL ont tourné sur un **Postgres 16 éphémère** local (cluster jeté après le run), migrations 0001→0023 appliquées telles quelles. Le projet Supabase distant n'a **pas** été touché (aucun `SUPABASE_ACCESS_TOKEN` utilisé).

---

## 6. Points non vérifiables / risques résiduels

- **PCI DSS §6.4.3 / §11.6.1** (inventaire + détection d'altération des scripts de paiement) : hors périmètre code, à traiter séparément.
- **CSP en enforce** : validée en Report-Only par construction ; le passage `CSP_ENFORCE=true` doit être vérifié en staging (tunnel complet + wallets) avant la prod.
- **TVA / devise** : **non touchées** (règles métier non concernées par ce lot) — signalées à l'audit, restent ouvertes.
- **Race « dernière utilisation de coupon »** : le quota est incrémenté atomiquement au paiement, mais la validation lit `used_count` en amont ; un léger dépassement du quota reste possible en forte concurrence (dette connue, hors périmètre H1/H3). Non régressé par ce lot.
- **Réconciliation `refunded_cents` admin vs webhook** : l'admin met à jour immédiatement, le webhook `charge.refunded` recale sur la valeur absolue Stripe (via `greatest`) — convergent, pas de double comptage.

---

## 7. Procédure de déploiement

1. **Revue de code** de la PR brouillon.
2. **Appliquer la migration** `0023_refunds_disputes_and_coupon_rls.sql` en staging puis prod (⚠️ manuellement) :
   `supabase db push` **ou** MCP `apply_migration`. Append-only, idempotente.
   > L'enum `order_status` reçoit de nouvelles valeurs via `add value if not exists` (aucune valeur retirée). Aucun statement de la migration n'utilise ces valeurs à l'exécution de la migration (corps PL/pgSQL planifiés paresseusement) → pas de blocage « new enum value in same transaction ».
3. **Régénérer les types** (`generate_typescript_types` → `src/lib/supabase/types.ts`) — optionnel, non requis (les tables commerce sont déjà accédées via clients typés lâches).
4. **Configurer l'endpoint Stripe** : activer les événements `charge.refunded`, `charge.dispute.created/updated/closed`, `payment_intent.payment_failed` (en plus des deux existants).
5. **Variables d'env** : confirmer `STRIPE_ALLOW_LIVE_IN_DEV=false` partout hors dev local ; laisser `CSP_ENFORCE` non défini (Report-Only) pour un premier déploiement.
6. Déployer l'app.
7. **Observer** les rapports de violation CSP ; une fois propre, activer `CSP_ENFORCE=true`.

## 8. Procédure de rollback

- **Application** : redéployer le commit précédent (revert de la PR). Les nouveaux handlers de webhook et la garde env disparaissent ; aucun état corrompu (les écritures étaient idempotentes/additives).
- **CSP** : retirer `CSP_ENFORCE` (retour Report-Only) ou revert `next.config.ts` — sans effet sur les données.
- **RLS coupons** : pour ré-exposer temporairement (déconseillé), recréer la policy `coupons_public_read` (une ligne SQL).
- **Migration** : **non triviale à défaire** (valeurs d'enum non supprimables proprement, table `disputes`). Les ajouts sont **additifs et inertes** tant que les événements ne sont pas activés côté Stripe → un rollback applicatif seul est sûr sans toucher au schéma. Ne PAS tenter de retirer les valeurs d'enum en prod.

---

## 9. Verdict

**🟢 GO CONDITIONNEL** pour ce lot.

Les blocages H1, H3 et M6 sont **corrigés et vérifiés** (tests unitaires, intégration webhook et SQL réels au vert). H2 est **corrigé en Report-Only** — le passage en enforce nécessite une validation navigateur en staging (condition), et la conformité PCI DSS des scripts de paiement (§6.4.3/§11.6.1) reste un chantier séparé documenté. Aucune règle de prix/TVA/devise ni élément visuel n'a été modifié. La migration doit être appliquée **manuellement**.
