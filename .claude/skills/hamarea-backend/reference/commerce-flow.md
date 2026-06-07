# Flux commerce — checkout, paiement, webhook, stock

Le cœur métier : comment un panier devient une commande payée, avec les
garde-fous (prix autoritaire, idempotence, best-effort). Fichiers :
`src/lib/checkout.ts`, `src/lib/checkout-db.ts`, `src/app/api/checkout/**`,
`src/app/api/webhooks/stripe/route.ts`, RPC `decrement_stock_for_order`.

## Principe directeur : le client n'envoie que des références

Le navigateur n'envoie **jamais** de prix. Il envoie des *références*
(`productId`, `variantId`, `color`, `pack`, `quantity`) + `email` +
`shippingMethod`. Le serveur **recalcule tout**. Deux chemins de pricing
autoritaires coexistent :

| Chemin | Fonction | Source du prix |
|---|---|---|
| Landing sacoche (`productId === SACOCHE.id`) | `priceCart()` (`lib/checkout.ts`) | barème packs codé dans `lib/product.ts` |
| Produit catalogue (toute autre ligne avec `variantId`) | `priceDbVariants()` (`lib/checkout-db.ts`) | `product_variants.price_cents` en DB (client **admin**) |

`priceDbVariants` revérifie aussi `variant.active` **et**
`products.status === 'active'` — un article retiré ne peut pas être commandé.

## Deux entrées de paiement Stripe

### A. Checkout hébergé — `POST /api/checkout/session`
Carte + Apple/Google Pay + Link sur la page Stripe. Étapes :
1. `getStripe()` (503 si non configuré).
2. **Rate-limit** par IP : `rateLimitHit("checkout:<ip>", 10, 60)` (fail-open) → 429.
3. Valider le corps avec **zod** (`BodySchema` : email, shippingMethod, lines[1..50]).
4. Séparer lignes sacoche / lignes DB → `priceCart` + `priceDbVariants`.
5. `shippingCentsFor(subtotal, method)` : **offert** au-delà du seuil, sinon tarif.
6. Si DB configurée (`hasDb`) : `createPendingOrder(createAdminClient(), …)` →
   `orders(status='pending')` + `order_items` ; récupère `orderId`.
7. `stripe.checkout.sessions.create(..., { idempotencyKey })` avec
   `metadata.order_id` + `payment_intent_data.metadata.order_id`,
   `shipping_address_collection` (pays `SHIP_TO`), `success_url`/`cancel_url`.
8. Retour `{ url }` → le client redirige vers Stripe.

### B. Express Checkout on-page — `POST /api/checkout/payment-intent`
Wallet (Apple/Google Pay) directement sur le site. Même pricing autoritaire
(`priceCart`), crée un **PaymentIntent** (`automatic_payment_methods`) avec
`metadata.order_id`, renvoie `{ clientSecret, orderId }`. L'adresse de livraison
est collectée par le wallet et attachée au PaymentIntent par Stripe.

### Idempotence à la création
La clé d'idempotence Stripe = `sha256(JSON du payload)` : un double-clic / retry
réutilise la **même** session/intent au lieu d'en créer une seconde.

## Réconciliation — `POST /api/webhooks/stripe` (le moment critique)

C'est **ici** que la commande devient `paid` et que les effets de bord se
produisent. Jamais de confiance dans la redirection navigateur seule.

1. **Vérifier la signature** : `stripe.webhooks.constructEvent(payload, sig,
   STRIPE_WEBHOOK_SECRET)`. Échec → 400. Manquant → 503.
2. **Dédupliquer** : `insert webhook_events { provider:'stripe', event_id }`.
   Code `23505` (violation d'unicité) → l'événement a déjà été traité → ack
   `{ duplicate: true }` sans rien refaire.
3. Selon `event.type` :
   - `checkout.session.completed` (principal) : lit `metadata.order_id`, le
     `payment_intent`, et l'**adresse collectée par Stripe**
     (`customer_details` = facturation, `collected_information.shipping_details`
     ou `shipping_details` = livraison).
   - `payment_intent.succeeded` (repli, ex. wallets) : lit `metadata.order_id` et
     `pi.shipping` comme adresse.
4. `markOrderPaid()` (client **admin**), **idempotent** :
   ```sql
   update orders set status='paid', placed_at=now(),
       stripe_payment_intent_id=…, shipping_address=…, billing_address=…
   where id = :orderId and status <> 'paid'   -- ← garde : 0 ligne si déjà payé
   returning id, number;
   ```
   Si **0 ligne** modifiée → déjà traité → on **s'arrête** (pas de double email,
   pas de double décrément). Sinon, effets de bord **best-effort** (jamais ils ne
   font échouer le webhook, le paiement est déjà encaissé) :
   - `insert payments { provider:'stripe', status:'succeeded', amount_cents, raw }`
   - `rpc("decrement_stock_for_order", { p_order_id })`
   - si `coupon_id` → `rpc("increment_coupon_usage", { p_coupon_id })` (quota)
   - `sendEmail(...)` (Resend, no-op si non configuré)
   - `trackPurchaseServer(...)` (Meta/TikTok CAPI ; `eventId = orderId` pour
     dédupliquer avec le pixel navigateur)
5. Toujours répondre `{ received: true }` (200) pour éviter les retries Stripe.

> **Pourquoi deux events activés ?** `checkout.session.completed` ET
> `payment_intent.succeeded` sont sûrs ensemble car la transition `paid` est
> idempotente par commande (la garde `status <> 'paid'`).

## Décrément de stock — RPC atomique

`decrement_stock_for_order(p_order_id)` (`security definer`, **service_role**) :
- trouve l'entrepôt par défaut (`warehouses.is_default`),
- pour chaque `order_item` : résout la variante (`variant_id`, sinon **par `sku`**
  — fix 0011 pour la landing), `update inventory.quantity -= qty` sur l'entrepôt,
  `insert stock_movements (delta négatif, reason='sale', order_id)`,
- ligne non résolvable (SKU hors catalogue) → **ignorée** (la vente n'est jamais
  bloquée).

Atomicité côté Postgres : pas de course critique lecture-puis-écriture.

## Adresses : qui les écrit, quand

- À la création de commande, `shipping_address`/`billing_address` sont des `{}`
  vides (`createPendingOrder`).
- Elles sont **remplies par le webhook** à partir des détails collectés par
  Stripe (Checkout) ou le wallet (PaymentIntent), via `toAddressJson()`.

## Coupons (appliqués côté serveur)

- Table `coupons` : `type` percent/fixed, `value`, `min_subtotal_cents`,
  fenêtre `starts_at`/`ends_at`, `usage_limit`/`used_count`, `active`.
- **Moteur PUR** `lib/coupons.ts` (`validateCoupon` + `computeDiscountCents` +
  `applyCoupon`) — remise AUTORITAIRE serveur, bornée à `[0, subtotal]`, testée
  (`coupons.test.ts`). Le client n'envoie qu'un `couponCode`.
- **Résolution** `lib/coupon-db.ts › resolveCoupon(code, subtotal)` : charge le
  coupon (client admin, `code` est `citext` → eq insensible à la casse), applique
  le moteur → `{ couponId, discountCents }` ou un motif de refus.
- **Routes checkout** : `couponCode` optionnel. Si valide →
  - Checkout hébergé : **coupon Stripe éphémère** (`stripe.coupons.create` +
    `discounts:[…]`) et on **retire** `allow_promotion_codes` (Stripe interdit les
    deux). Sans coupon app → on **garde** `allow_promotion_codes` (codes natifs).
  - Express/PaymentIntent : le `amount` est directement réduit.
  - Code fourni mais invalide → **400** `{ couponError: true }` (jamais facturer
    le plein tarif quand une remise valide était promise → échec bruyant).
- **Persistance** : `createPendingOrder` enregistre `discount_cents` + `coupon_id`.
- **Quota** : le webhook incrémente `used_count` via la RPC atomique
  `increment_coupon_usage` (migr. 0020), **une fois par commande** (garde
  `status <> 'paid'`), best-effort.
- L'admin gère les coupons via `src/app/[locale]/admin/coupons/`.

## États & transitions de commande

```
pending ──(webhook paiement OK)──▶ paid ──▶ processing ──▶ shipped ──▶ delivered
   │                                  │
   └──────────────▶ cancelled         └──▶ refunded   (remboursement)
```
Les transitions post-`paid` (processing/shipped/delivered, remboursements) sont
pilotées par l'admin (`admin/orders/**`, permissions `orders.write` /
`orders.refund`).

## Garanties & anti-régressions (à préserver)

- ✅ Prix recalculé serveur (jamais le montant client).
- ✅ Signature webhook vérifiée + dédup `webhook_events`.
- ✅ Effets de bord derrière la garde `status <> 'paid'`.
- ✅ Persistance commande **best-effort** : un échec DB ne doit **jamais** bloquer
  le paiement (la vente prime ; on logge et on continue).
- ✅ Stock via RPC atomique service_role.
- ✅ Rate-limit fail-open (disponibilité > strictness sur les endpoints publics).
