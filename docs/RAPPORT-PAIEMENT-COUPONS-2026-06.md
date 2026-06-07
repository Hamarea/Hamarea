# Hamarea — Rapport paiement (Stripe) & coupons + corrections SOTA 2026

> Vérification des connexions Stripe, des calculs, du fonctionnement du paiement,
> et du système de coupons (% / date limite / illimité). Avec corrections à faire.

---

## 0. Synthèse
- **Stripe : bien architecturé et configuré.** Calcul du prix **recalculé côté serveur**
  (anti-fraude), webhook **idempotent**, version d'API **à jour** (`2026-04-22.dahlia`).
- **2 corrections paiement** : la **clé publishable** manque dans le build (Express Checkout) ;
  test E2E carte à faire manuellement.
- **Coupons : schéma excellent, mais 2 manques réels** → (1) l'admin **ne gère pas la date
  d'expiration / la limite d'usage**, (2) les coupons **ne sont pas appliqués au paiement**.

| Sévérité | Sujet | État |
|---|---|---|
| 🔴 | Coupons **non appliqués** au checkout (`discount_cents: 0` en dur) | à corriger |
| 🟠 | Admin coupons sans **date limite** (`ends_at`) ni **limite d'usage** (`usage_limit`) | à corriger |
| 🟠 | Clé **publishable Stripe** absente du build (Express Checkout KO) | redéployer |
| 🟡 | Choix coupons **app** vs **promo codes Stripe** (éviter le double) | décision |
| 🟡 | Pas de **vue admin des paiements** | nice-to-have |

---

## 1. Stripe — état détaillé

### ✅ Ce qui est bon (SOTA)
- **Prix recalculé serveur** (`lib/checkout.ts › priceCart`) : le montant envoyé à Stripe est
  toujours recomposé depuis le catalogue → un client ne peut pas trafiquer le prix. ✅
- **Webhook** (`/api/webhooks/stripe`) : vérifie la signature (`STRIPE_WEBHOOK_SECRET`),
  **dédup** via `webhook_events` (unique), transition `paid` **idempotente**, enregistre le
  paiement, **décrémente le stock**, e-mail, tracking. ✅
- **Version d'API** : `2026-04-22.dahlia` — **valide et courante** (release Dahlia). ✅
- **Tests live** : `POST /api/webhooks/stripe` → 400 (clé + secret présents) ;
  `POST /api/checkout/session` → 400 (clé présente). → **Stripe est branché.** ✅

### ⚠️ À corriger / vérifier
1. **Clé publishable absente du build** : `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` n'apparaît pas
   dans le bundle déployé → l'**Express Checkout on-page (Apple/Google Pay)** ne s'initialise pas.
   (Le Checkout hébergé par carte, lui, fonctionne.) → **Mettre la clé dans Vercel + `vercel --prod`.**
2. **Test E2E carte** : non réalisable sans navigateur. À faire manuellement en **mode test**
   (clés `*_test`, carte `4242 4242 4242 4242`) → vérifier commande `paid` dans `/admin/orders`
   + stock décrémenté, puis basculer en **live**.

---

## 2. Coupons — état détaillé

### ✅ Le schéma est parfait (`coupons`)
`code`, `type` (**percent** | fixed), `value`, `min_subtotal_cents`, `starts_at`, **`ends_at`**
(= date limite ; `null` = **illimité**), **`usage_limit`** (`null` = illimité), `used_count`, `active`.
→ Tout ce qu'il faut pour des **% avec date limite ou infini**. ✅

### ❌ Les 2 manques
1. **Admin** (`createCoupon`) n'enregistre que `code / type / value / min_subtotal / active`.
   **Pas de `ends_at` (expiration) ni `usage_limit`** → impossible de fixer une date limite ou
   une limite d'usage depuis l'admin (toujours infini).
2. **Checkout** : `lib/checkout.ts` a **`discount_cents: 0` codé en dur** → **les coupons de
   l'admin ne sont jamais appliqués** à une commande. Le checkout s'appuie sur
   `allow_promotion_codes: true` = **codes promo natifs Stripe** (créés dans le Dashboard Stripe),
   **séparés de ta table `coupons`**. Donc : tes coupons admin = orphelins.

---

## 3. Corrections SOTA 2026 (à faire)

### 🔴 C1 — Appliquer les coupons au checkout (serveur)
Dans `/api/checkout/session` **et** `/api/checkout/payment-intent` :
- Lire le code saisi, charger le coupon (`coupons` par `code`), **valider** : `active`,
  `now() ∈ [starts_at, ends_at]` (ou `ends_at null`), `used_count < usage_limit` (ou null),
  `subtotal ≥ min_subtotal_cents`.
- Calculer la remise : **`percent`** → `subtotal * value/100` ; **`fixed`** → `value` (plafonné).
- Appliquer à Stripe (un `discounts:[{coupon}]` éphémère **ou** réduction du total), **stocker**
  `coupon_code` + `discount_cents` sur la commande, **incrémenter `used_count`** au paiement (webhook).
- **Choix** : adopter les coupons **app** (gérés en admin) et **retirer** `allow_promotion_codes`
  (ou le garder uniquement pour des codes Stripe natifs) → éviter le **double cumul**.

### 🟠 C2 — Admin coupons : date limite + limite d'usage
Ajouter au formulaire et à `createCoupon` : **`ends_at`** (date, vide = illimité), **`starts_at`**
(optionnel), **`usage_limit`** (vide = illimité). Afficher l'état (actif / expiré / quota atteint).

### 🟠 C3 — Clé publishable Stripe
Confirmer `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (clé **live**) dans Vercel → **redéployer**.

### 🟡 C4 — Vue admin Paiements
Lister `payments` (montant, statut, PI Stripe) par commande (table déjà alimentée par le webhook).

### 🟡 C5 — Conformité prix barré (Omnibus / UE)
Afficher le **prix le plus bas des 30 derniers jours** sur les promos (décision métier + données).

---

## 4. Procédure de test du paiement (à exécuter)
1. (Mode test) clés `sk_test_` / `pk_test_` dans Vercel → `vercel --prod`.
2. Boutique → ajouter au panier → checkout → carte `4242 4242 4242 4242`, date future, CVC quelconque.
3. Vérifier : page **succès**, commande **`paid`** dans `/admin/orders`, **stock −1**, e-mail (si Resend).
4. Tester un **coupon** (après C1/C2) : code % → total réduit ; code expiré → refusé.
5. OK → basculer en **clés live**.

---

## Sources (doc Stripe)
- Changelog Dahlia : https://docs.stripe.com/changelog/dahlia
- Versioning API : https://docs.stripe.com/api/versioning
- stripe-node CHANGELOG : https://github.com/stripe/stripe-node/blob/master/CHANGELOG.md

*Rapport établi le 2026-06-05.*
