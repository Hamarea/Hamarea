# Audit Stripe — Production Readiness — Hamarea

> **Périmètre** : intégralité de l'intégration Stripe du dépôt `hamarea/hamarea`.
> **Date** : 23 juillet 2026 · **Référentiel** : bonnes pratiques Stripe 2026, PCI DSS v4.0.1, OWASP ASVS / Top 10, CWE Top 25.
> **Nature** : audit **lecture seule**. Aucune modification de code applicatif. Chaque affirmation est justifiée par une citation `fichier:ligne`.
> **Convention** : lorsqu'une information n'est pas vérifiable depuis le dépôt (valeurs de secrets réelles, config du dashboard Stripe, version npm installée), elle est marquée **NON VÉRIFIABLE**.

---

## 0. Synthèse exécutive — GO / NO-GO

**Verdict : 🟡 GO CONDITIONNEL.**

Le **chemin nominal de paiement** (panier → commande → Stripe → webhook → stock) est **de qualité production** : prix recalculé côté serveur sans exception, webhook **signé + idempotent**, décrément de stock **atomique**, aucun secret commité. L'application peut **encaisser des cartes en production** sur ce flux.

Les conditions à lever concernent la **réconciliation post-paiement** et le **durcissement** :

| # | Condition bloquante avant montée en charge | Gravité |
|---|---|---|
| H1 | Aucune écoute des événements `charge.refunded` / `charge.dispute.*` → remboursements dashboard et **chargebacks jamais réconciliés** en base | Haute |
| H2 | **Aucun Content-Security-Policy** sur les pages chargeant Stripe.js (PCI DSS v4.0.1 §6.4.3 / §11.6.1) | Haute |
| H3 | La RLS `coupons_public_read` **expose tous les codes promo actifs** à un visiteur anonyme | Haute |

Aucune faille **critique** (fuite de secret, prix manipulable, webhook non signé, double décrément) n'a été trouvée.

**Notes globales :**

| Axe | Note |
|---|---|
| Architecture | **88** / 100 |
| Sécurité | **78** / 100 |
| Performance | **85** / 100 |
| Fiabilité | **74** / 100 |
| UX | **82** / 100 |
| Maintenabilité | **88** / 100 |
| Conformité | **76** / 100 |
| **Production Readiness** | **80** / 100 |

---

## 1. Cartographie complète Stripe (Étape 1)

### 1.1 Dépendances & versions

| Élément | Valeur | Preuve |
|---|---|---|
| SDK serveur | `stripe@^22.1.1` | `package.json:45` |
| Stripe.js navigateur | `@stripe/stripe-js@^9.7.0` | `package.json:31` |
| Bindings React | `@stripe/react-stripe-js@^6.6.0` | `package.json:30` |
| Version API épinglée | `2026-04-22.dahlia` | `src/lib/stripe.ts:8` |
| Version npm réellement installée | **NON VÉRIFIABLE** (`node_modules` absent) | — |

### 1.2 Fonctionnalités Stripe présentes / absentes

| Capacité | État | Preuve / remarque |
|---|---|---|
| Checkout hébergé (`mode: payment`) | ✅ Utilisé | `src/app/api/checkout/session/route.ts:194` |
| Payment Element / Express Checkout (Apple/Google Pay, Link) | ✅ Utilisé | `src/components/checkout/express-checkout.tsx:161`, `src/app/api/checkout/payment-intent/route.ts:137` |
| PaymentIntent (flux différé) | ✅ | `payment-intent/route.ts:137` |
| `automatic_payment_methods` (wallets, Link…) | ✅ | `payment-intent/route.ts:141` |
| Coupons éphémères / `discounts` | ✅ | `session/route.ts:185-191` |
| Promotion Codes natifs | ✅ (`allow_promotion_codes`) | `session/route.ts:200` |
| Refunds | ✅ (API admin) | `src/app/[locale]/admin/orders/actions.ts:210` |
| Webhooks (signés) | ✅ | `src/app/api/webhooks/stripe/route.ts:220` |
| Shipping / collecte d'adresse | ✅ | `session/route.ts:201-203` |
| **Billing / Subscription / Invoices** | ❌ Absent | Boutique **one-shot** ; aucun `stripe.subscriptions.*` / `invoices.*` dans le dépôt |
| **Customer (objet Stripe persistant)** | ❌ Non créé | Seul `customer_email` est passé (`session/route.ts:198`) ; pas de `stripe.customers.create` |
| **Customer Portal** | ❌ Absent | Cohérent (pas d'abonnement) |
| **Tax / Stripe Tax** | ❌ Absent | `tax_cents: 0` figé (`checkout.ts:161`, `0004_commerce.sql:53`) — voir §6 |
| **Radar (règles explicites)** | ⚠️ Implicite | Aucune config Radar dans le code ; dépend du dashboard — **NON VÉRIFIABLE** |
| **Connect / Identity / Financial Connections / Terminal / Tap to Pay** | ❌ Absent (hors périmètre métier) | Aucune trace |
| Klarna / PayPal / SEPA / ACH / Bancontact / Amazon Pay / Cash App | ⚙️ Délégué au dashboard | `automatic_payment_methods.enabled: true` (`payment-intent/route.ts:141`) laisse Stripe activer les méthodes configurées — liste réelle **NON VÉRIFIABLE** |

### 1.3 Endpoints, fichiers, secrets

**Routes API (`git ls-files 'src/app/api/**/route.ts'`) :**

| Endpoint | Rôle | Fichier |
|---|---|---|
| `POST /api/checkout/session` | Checkout hébergé | `src/app/api/checkout/session/route.ts` |
| `POST /api/checkout/payment-intent` | Express Checkout (wallets) | `src/app/api/checkout/payment-intent/route.ts` |
| `POST /api/checkout/coupon` | Validation code promo (affichage) | `src/app/api/checkout/coupon/route.ts` |
| `POST /api/webhooks/stripe` | Réconciliation paiement | `src/app/api/webhooks/stripe/route.ts` |
| `GET /api/admin/export/orders` | Export CSV commandes | `src/app/api/admin/export/orders/route.ts` |
| `GET /api/account/export` | Export RGPD | `src/app/api/account/export/route.ts` |

**Fichiers cœur Stripe :** `src/lib/stripe.ts` (singleton SDK), `src/lib/checkout.ts` (pricing sacoche autoritaire + `createPendingOrder`), `src/lib/checkout-db.ts` (pricing catalogue autoritaire), `src/lib/coupons.ts` (moteur pur), `src/lib/coupon-db.ts` (résolution DB), `src/components/checkout/express-checkout.tsx` (Stripe.js).

**Un seul handler de webhook** (confirmé : `git ls-files | grep webhook` → `src/app/api/webhooks/stripe/route.ts` uniquement).

**Variables d'environnement Stripe attendues** (`.env.example:34-37`) :

| Variable | Type | Exposition |
|---|---|---|
| `STRIPE_SECRET_KEY` | Secret serveur | Serveur uniquement (`stripe.ts:6`) |
| `STRIPE_WEBHOOK_SECRET` | Secret serveur | Serveur uniquement (`webhooks/stripe/route.ts:205`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clé publique | Navigateur (`express-checkout.tsx:33`) — normal |

---

## 2. Configuration & secrets (Étape 2)

| Point de contrôle | Résultat | Preuve |
|---|---|---|
| Secret jamais commité | ✅ | `git ls-files | grep .env` → seul `.env.example` (valeurs `sk_test_xxx`) ; `.gitignore` couvre `.env`, `.env*.local` |
| Clé secrète côté serveur | ✅ | `stripe.ts:6` lit `process.env.STRIPE_SECRET_KEY` ; jamais dans un composant `"use client"` |
| Clé publiable côté navigateur | ✅ correct | `express-checkout.tsx:33` |
| Vérification de signature webhook | ✅ | `constructEvent(payload, sig, secret)` `webhooks/stripe/route.ts:220` |
| Corps brut pour la signature | ✅ | `await req.text()` **avant** parse `route.ts:217` |
| Tolérance anti-rejeu (replay) | ✅ implicite | `constructEvent` applique la tolérance par défaut (300 s) ; **aucune surcharge** → conforme |
| Idempotency-Key sur créations | ✅ | `session/route.ts:221`, `payment-intent/route.ts:145` |
| Version API épinglée | ✅ | `stripe.ts:8` (`2026-04-22.dahlia`) |
| Client admin isolé (service_role) | ✅ | `src/lib/supabase/admin.ts` — `autoRefreshToken:false, persistSession:false` |
| Runtime Node + dynamique | ✅ | `runtime="nodejs"`, `dynamic="force-dynamic"` (webhook `:301-302`) |
| HSTS | ✅ | `next.config.ts` (`Strict-Transport-Security … preload`) |
| **CSP** | ❌ **Absente** | `next.config.ts` `securityHeaders` — aucun `Content-Security-Policy` → **voir H2** |
| Séparation test/live imposée par code | ❌ Aucune garde | Aucun contrôle « `sk_live` en prod / `sk_test` bloqué en prod » → **voir M6** |
| Rotation des clés / permissions restreintes (clé restreinte `rk_`) | **NON VÉRIFIABLE** | dépend du dashboard Stripe |

---

## 3. Checkout (Étape 3)

### 3.1 Prix, devise, remises — le point fort

**Le prix n'est JAMAIS accepté du client.** Le corps de requête n'accepte que des *références* — aucun champ `price`/`amount` :

- Schéma d'entrée : `LineSchema` = `{ productId, variantId?, color?, pack, quantity }` (`session/route.ts:29-37`).
- Recalcul autoritaire sacoche : `priceCart()` valide produit + couleur et applique `unitPriceForPack()` (`checkout.ts:76`).
- Recalcul autoritaire catalogue : `priceDbVariants()` lit `price_cents` **en base** et revérifie `variant.active` **et** `products.status === 'active'` (`checkout-db.ts:64,70`).
- Remise recalculée serveur, bornée `[0, subtotal]` (`coupons.ts:92`), quota/fenêtre/minimum validés (`coupons.ts:53-77`).
- Frais de port autoritaires : `shippingCentsFor()` (`checkout.ts:105-111`).
- Total : `Math.max(0, subtotal − discount) + shipping` (`session/route.ts:132`).

> ✅ Conforme CWE-602 (client-side trust) et à la règle d'or « le prix est toujours recalculé serveur ».

### 3.2 URLs de redirection — pas d'open redirect

`success_url` / `cancel_url` sont **construites serveur** à partir de `NEXT_PUBLIC_SITE_URL` (ou `new URL(req.url).origin`), jamais d'un champ client (`session/route.ts:82,218-219`). ✅ Pas de CWE-601.

### 3.3 Double-clic, refresh, expiration

- **Double-clic / retry** : clé d'idempotence = `sha256` du payload → réutilise la même session (`session/route.ts:166-176`), le même PaymentIntent (`payment-intent/route.ts:125-134`). ✅
- **Refresh de succès** : le vidage du panier est idempotent (`clear-cart.tsx`). Le succès ne **crée** aucun effet de bord (ceux-ci sont dans le webhook). ✅
- **Abandon / expiration** : ⚠️ aucun `checkout.session.expired` écouté → les commandes `pending` abandonnées **s'accumulent** (voir M5). Le stock n'est **pas** impacté (décrément uniquement sur `paid`).

### 3.4 Devise mixte — bug latent

`priceDbVariants` produit chaque `line_item` dans la devise **propre à la variante** (`checkout-db.ts:75` : `(v.currency||'EUR').toLowerCase()`), tandis que la session force `currency = SACOCHE.currency` pour le **frais de port** et le **coupon éphémère** (`session/route.ts:83,207,187`). Si une variante DB est en devise ≠ EUR, Stripe **rejette** un panier multi-devises → `502`. **Voir M2.**

---

## 4. Webhooks (Étape 4)

### 4.1 Événements traités

| Événement | Traité ? | Preuve |
|---|---|---|
| `checkout.session.completed` | ✅ (principal) | `webhooks/stripe/route.ts:240` |
| `payment_intent.succeeded` | ✅ (repli wallets) | `route.ts:273` |
| `payment_intent.payment_failed` | ❌ | — |
| `checkout.session.expired` | ❌ | — |
| `charge.refunded` | ❌ | — → **H1** |
| `charge.dispute.created` / `.closed` (chargeback) | ❌ | — → **H1** |
| `payment_intent.canceled` | ❌ | — |

### 4.2 Garanties (excellentes)

- **Signature** vérifiée, `400` si mauvaise, `503` si non configuré (`route.ts:206-224`).
- **Idempotence de transport** : insert `webhook_events (provider, event_id)` unique ; `23505` → `{ duplicate: true }` sans retraitement (`route.ts:230-238`, contrainte `0004_commerce.sql:135`).
- **Idempotence métier** : `update … where id=:id AND status <> 'paid'` ; **0 ligne → aucun effet de bord** (`route.ts:121-139`). Empêche double email, double stock, double quota coupon même si les deux events arrivent.
- Effets de bord **best-effort** (paiement déjà encaissé) : coupon `increment_coupon_usage` (RPC atomique, `route.ts:150`), `payments` insert, `decrement_stock_for_order` (RPC atomique), email, CAPI (`route.ts:149-200`).
- Réponse `200 { received: true }` systématique en fin → pas de retries Stripe inutiles.

> ✅ Conforme aux recommandations Stripe 2026 (signature + idempotence + réponse rapide). ⚠️ Le **manque de reconciliation refund/dispute** est la principale dette de fiabilité (§H1).

---

## 5. Sécurité (Étape 5)

| Vecteur | Résultat | Preuve |
|---|---|---|
| Secret exposé / hardcodé | ✅ Aucun | grep `sk_live|sk_test|whsec_|pk_live` sur `src/` → 0 littéral ; uniquement `process.env.*` |
| `console.log` de secret | ✅ Aucun | tous les logs sont des messages d'erreur sans valeur de secret (`grep console.` → 14 occurrences, aucune sensible) |
| Prix manipulable (business logic) | ✅ Protégé | §3.1 |
| Open Redirect (CWE-601) | ✅ Protégé | §3.2 |
| Signature webhook (CWE-345) | ✅ Vérifiée | `route.ts:220` |
| Injection SQL | ✅ N/A | API Supabase paramétrée ; RPC en `security definer` avec `search_path` épinglé (`0011`, `0020`) |
| SSRF | ✅ Faible surface | images `product_data.images` construites depuis `origin` serveur (`checkout.ts:84`) |
| CSRF | ✅ Faible risque | endpoints paiement en `POST` JSON, sans cookie d'autorité (auth via lecture de session Supabase seulement pour lier `user_id`) |
| XSS | ✅ | React échappe par défaut ; aucun `dangerouslySetInnerHTML` dans le tunnel |
| IDOR / accès données | ✅ RLS | `orders_owner_read` = `auth.uid() = user_id` (`0004:164`) ; tables commerce `*_admin_all` |
| **Exposition coupons** | ❌ **Faille métier** | `coupons_public_read … using (active = true)` (`0004:186-188`) → **tout code actif lisible anonymement** → **H3** |
| CSP / SRI sur Stripe.js | ❌ Absent | §H2 |
| Rate-limit | ⚠️ fail-open, IP `x-forwarded-for` (spoofable) | `session/route.ts:63-67` — acceptable (webhook = source de vérité) → L4 |

---

## 6. Billing (Étape 6)

Boutique **one-shot** : pas d'abonnement, pas d'`invoice`, pas d'objet `Customer` Stripe persistant (seul `customer_email` est transmis, `session/route.ts:198`). Les points « upgrade/downgrade/trial/prorata/portal » de la grille sont **hors périmètre** (non applicables).

**Remboursements** (`admin/orders/actions.ts:185-243`) :
- ✅ Gardé par permission `orders.refund` + `logAudit`.
- ✅ Remboursement Stripe réel si `stripe_payment_intent_id` présent (`:210`), sinon simple enregistrement (remboursement hors Stripe).
- ✅ Contrôle `amountCents > order.total_cents` → rejet (`:201`).
- ⚠️ **Pas de prise en compte des remboursements cumulés antérieurs** ni d'`idempotencyKey` sur `refunds.create` → **M1**.

**TVA / Taxes** : `tax_cents` est figé à `0` (`checkout.ts:161`, colonne `0004:53`). Aucune Stripe Tax. Pour une boutique B2C UE, la TVA doit être soit incluse dans le prix TTC (à confirmer), soit calculée. **NON VÉRIFIABLE** que les prix sont TTC → risque de conformité fiscale (voir §10, risque légal).

---

## 7. Base de données ↔ Stripe (Étape 7)

| Point | Résultat | Preuve |
|---|---|---|
| Argent en centimes entiers | ✅ | `*_cents int` (`0004_commerce.sql:51-55`) |
| Devise `char(3)` | ✅ | `0004:50` |
| Synchronisation Stripe→DB | ✅ (paiement) / ❌ (refund/dispute dashboard) | webhook §4 |
| Idempotence / anti-double | ✅ | garde `status<>'paid'` + unique `webhook_events` |
| Décrément stock atomique | ✅ | RPC `decrement_stock_for_order` `security definer` service_role (`0011`) |
| Quota coupon atomique | ✅ | RPC `increment_coupon_usage` (`0020`) |
| FK / index / contraintes | ✅ | `orders.stripe_payment_intent_id text unique` (`0004:59`), index status/email/user |
| RLS active partout | ✅ | `0004:139-147` |
| **Rollback multi-effets** | ⚠️ Best-effort, non transactionnel | Les effets post-`paid` (payments, stock, coupon) sont **indépendants** ; un échec de l'un ne rollback pas les autres (choix assumé : le paiement prime). Voir M-note fiabilité. |
| Nettoyage commandes `pending` abandonnées | ❌ Absent | M5 |

---

## 8. UX (Étape 8)

| Scénario | Comportement | Preuve |
|---|---|---|
| Paiement refusé / carte expirée / 3DS | ✅ Géré par Stripe (Checkout hébergé + Express) | Stripe UI ; `confirmError` remonté (`express-checkout.tsx:153`) |
| Erreur réseau création session | ✅ `502` + message | `session/route.ts:224-227` |
| Double paiement | ✅ Idempotence | §3.3 |
| Wallet indisponible | ✅ Auto-masquage | `onReady … onUnavailable()` (`express-checkout.tsx:163-165`) |
| Pays non livré | ✅ `e.reject()` | `express-checkout.tsx:176` |
| Mode aperçu sans Stripe | ✅ Bandeau + dégradation | `checkout/page.tsx:11-17` |
| Retour direct sur `/checkout/success` | ⚠️ vide le panier sans vérifier le paiement | `clear-cart.tsx` + `success/page.tsx` → **L3** (cosmétique) |

---

## 9. Performance (Étape 9)

| Point | Résultat | Preuve |
|---|---|---|
| Chargement Stripe.js paresseux | ✅ | `loadStripe` mémoïsé, no-op sans clé (`express-checkout.tsx:34-39`) |
| Composant wallet auto-masqué | ✅ (pas de rendu inutile) | `express-checkout.tsx:60` |
| Middleware allégé sur pages publiques | ✅ | round-trip auth uniquement sur `/admin` `/account` (`middleware.ts:22-24`) |
| Webhook rapide | ✅ | effets best-effort, réponse immédiate |
| Appel Stripe superflu | ⚠️ `stripe.coupons.create` à chaque checkout couponné | `session/route.ts:185` (latence + accumulation, M3) |
| Double event traité | ✅ neutralisé | mais 2 events facturés en volume webhook (garde idempotente) |

---

## 10. Conformité (Étape 10)

| Référentiel | État | Écart |
|---|---|---|
| **Stripe 2026** | 🟡 Largement conforme | Manque refund/dispute webhooks (H1) ; coupons éphémères non nettoyés (M3) |
| **PCI DSS v4.0.1** | 🟡 Posture SAQ-A (carte saisie sur page Stripe hébergée) | **§6.4.3 / §11.6.1** : scripts de la page de paiement doivent être maîtrisés (CSP + inventaire) → **CSP absente (H2)** |
| **OWASP Top 10** | 🟢 Bon | A01 (coupons, H3), A05 (CSP, H2) |
| **OWASP ASVS** | 🟢 (V4 pricing serveur ✅, V13 API ✅) | V14 en-têtes (CSP) partiel |
| **CWE Top 25** | 🟢 | CWE-601 ✅, CWE-345 ✅, CWE-602 ✅ ; CWE-799 (rate-limit spoofable) L4 |
| **RFC HTTP / RGPD** | 🟡 | PII brute stockée (`payments.raw`, `webhook_events.payload`) sans purge → L2 ; TVA non explicite → risque fiscal |

---

## 11. Tableau des anomalies & correctifs (Étapes 11-12)

Format : Gravité · Fichier:ligne · Impact · Reco · Complexité · Temps · Risque de régression.

### 🔴 Critique
Aucune.

### 🟠 Haute

**H1 — Aucune réconciliation des remboursements Stripe & chargebacks**
- **Fichier** : `src/app/api/webhooks/stripe/route.ts:240-296` (seuls 2 events).
- **Impact** : un remboursement initié depuis le **dashboard Stripe**, un **litige** ou un **chargeback** ne met jamais à jour `orders.status` / `payments`. Comptabilité et statut client divergent du réel.
- **Impact financier** : perte de traçabilité des impayés/litiges ; risque de ré-expédier une commande contestée.
- **Reco** : écouter `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`, `payment_intent.payment_failed` ; mettre à jour `orders`/`payments`/`refunds` de façon idempotente (garde d'état, dédup `webhook_events` déjà en place).
- **Complexité** : Moyenne · **Temps** : ~1 j · **Régression** : faible (ajout d'`else if`, aucun chemin existant modifié).

**H2 — Aucun Content-Security-Policy sur les pages chargeant Stripe.js**
- **Fichier** : `next.config.ts` (`securityHeaders` — CSP absente).
- **Impact** : PCI DSS v4.0.1 §6.4.3/§11.6.1 exige la maîtrise des scripts de la page de paiement ; sans CSP, un script tiers injecté peut détourner l'Express Checkout Element.
- **Reco** : ajouter un `Content-Security-Policy` autorisant `js.stripe.com`, `api.stripe.com`, les frames `*.stripe.com`, `'self'` ; démarrer en `Content-Security-Policy-Report-Only` pour calibrer.
- **Complexité** : Moyenne (calibrage) · **Temps** : ~2-4 h · **Régression** : moyenne (une CSP trop stricte casse Stripe.js / images — tester le tunnel wallet).

**H3 — Tous les codes promo actifs sont lisibles anonymement (RLS)**
- **Fichier** : `supabase/migrations/0004_commerce.sql:186-188` — `create policy coupons_public_read … using (active = true)`.
- **Impact** : un visiteur peut `select * from coupons` via l'API anon et **récupérer chaque code + valeur + minimum** → utilisation massive de codes non destinés au public, érosion de marge.
- **Reco** : supprimer la policy de lecture publique ; la validation passe **déjà** par le client admin (`coupon-db.ts:36`). Ajouter une **nouvelle** migration `revoke`/`drop policy` (append-only).
- **Complexité** : Faible · **Temps** : <30 min · **Régression** : faible (aucun chemin front ne lit `coupons` en anon — validation via route serveur).

### 🟡 Moyenne

**M1 — Remboursement : pas d'idempotence ni de cumul des remboursements antérieurs**
- **Fichier** : `src/app/[locale]/admin/orders/actions.ts:210-215` (pas d'`idempotencyKey`), `:201-203` (compare au total, pas au « total − déjà remboursé »).
- **Impact** : double-soumission / retry réseau → risque de double remboursement partiel (Stripe plafonne au montant capturé, mais l'échec n'est détecté qu'après appel).
- **Reco** : passer `{ idempotencyKey }` (dérivé de `orderId`+montant) ; sommer les `refunds` existants avant d'autoriser.
- **Complexité** : Faible · **Temps** : ~1 h · **Régression** : faible.

**M2 — Panier multi-devises rejeté par Stripe**
- **Fichier** : `src/lib/checkout-db.ts:75` (devise par variante) vs `src/app/api/checkout/session/route.ts:83,187,207` (devise sacoche pour port + coupon).
- **Impact** : une variante catalogue en devise ≠ EUR → `502` au checkout.
- **Reco** : imposer une devise unique par session (rejeter, ou normaliser) ; valider `v.currency === SACOCHE.currency`.
- **Complexité** : Faible · **Temps** : ~1 h · **Régression** : faible (chemin dormant tant que mono-produit EUR).

**M3 — Coupons Stripe éphémères jamais supprimés**
- **Fichier** : `src/app/api/checkout/session/route.ts:185-191`.
- **Impact** : accumulation d'objets `coupon` dans le compte Stripe (dette, bruit).
- **Reco** : préférer `discounts:[{ coupon }]` avec un coupon réutilisable par code, ou nettoyer via job ; alternative : `amount_off` via `discounts` sans persister (déjà éphémère mais non purgé).
- **Complexité** : Moyenne · **Temps** : ~2 h · **Régression** : faible.

**M4 — Clé d'idempotence uniquement dérivée du payload**
- **Fichier** : `session/route.ts:166-176`, `payment-intent/route.ts:125-134`.
- **Impact** : deux commandes **légitimement identiques** (même panier + email) dans la fenêtre Stripe de 24 h → collision → réutilisation d'une session possiblement expirée/payée, achat répété bloqué.
- **Reco** : intégrer l'`orderId` (unique) une fois la commande créée, ou un nonce court côté client.
- **Complexité** : Faible · **Temps** : ~1 h · **Régression** : moyenne (revalider le dé-doublonnage double-clic).

**M5 — Commandes `pending` abandonnées non nettoyées**
- **Fichier** : webhook (pas de `checkout.session.expired`) + `checkout.ts:createPendingOrder`.
- **Impact** : table `orders` gonflée de commandes jamais payées ; métriques faussées.
- **Reco** : écouter `checkout.session.expired` → `status='cancelled'`, ou cron de purge des `pending` > N heures.
- **Complexité** : Faible · **Temps** : ~2 h · **Régression** : faible.

**M6 — Aucune garde test/live au démarrage**
- **Fichier** : `src/lib/stripe.ts:6-8` (accepte toute clé).
- **Impact** : une `sk_test_…` déployée en prod encaisse « à vide » ; une `sk_live_…` en preview facture réellement. **NON VÉRIFIABLE** quelles clés sont utilisées en prod.
- **Reco** : garde de boot — en `NODE_ENV=production`, exiger `sk_live_` ; hors prod, refuser `sk_live_`.
- **Complexité** : Faible · **Temps** : ~30 min · **Régression** : nulle.

### 🟢 Faible

| # | Fichier:ligne | Constat | Reco | Temps |
|---|---|---|---|---|
| L1 | `stripe.ts:8` vs `package.json:45` | Version API `2026-04-22.dahlia` épinglée avec SDK `stripe@^22` — alignement à vérifier (types) | `npm ls stripe` + upgrade SDK si nécessaire | 30 min |
| L2 | `0004_commerce.sql:84-95,128-136` | `payments.raw` / `webhook_events.payload` stockent PII brute (adresse, email, téléphone) sans purge | Politique de rétention / purge planifiée (RGPD) | 2 h |
| L3 | `success/page.tsx`, `clear-cart.tsx` | Panier vidé au simple affichage de `/checkout/success` (pas de vérif paiement) | Vérifier `session_id` côté serveur avant vidage | 1 h |
| L4 | `session/route.ts:63-67` | Rate-limit indexé sur `x-forwarded-for` (spoofable), fail-open | Combiner IP + empreinte, ou clé applicative | 1 h |
| L5 | `admin/orders/actions.ts:230` | Refund total ne vérifie pas l'état préalable (`paid`) avant `refunded` | Garde d'état sur la transition | 30 min |

---

## 12. Diagrammes des flux

### 12.1 Checkout → Base → Stripe → Webhook

```
[Navigateur]                 [Next.js (serveur)]                     [Postgres]        [Stripe]
    | refs (productId, qty…)       |                                     |                |
    |—— POST /api/checkout/session→|                                     |                |
    |                              |—rate-limit (fail-open)              |                |
    |                              |—zod parse                           |                |
    |                              |—priceCart + priceDbVariants (AUTORITAIRE)            |
    |                              |—resolveCoupon (admin, borné [0,sub])                 |
    |                              |—createPendingOrder ————————————————▶ orders(pending) |
    |                              |                                     order_items      |
    |                              |—coupons.create (éphémère) ——————————————————————————▶ coupon
    |                              |—checkout.sessions.create{idemKey, metadata.order_id}▶ session
    |◀——— { url } ————————————————|                                     |                |
    |—— redirect Stripe —————————————————————————————————————————————————————————————————▶ paiement (3DS…)
    |                              |                                     |                |
    |     Stripe —— webhook checkout.session.completed ——▶ /api/webhooks/stripe          |
    |                              |—constructEvent(sig) (400 si KO)     |                |
    |                              |—insert webhook_events (23505⇒dup)——▶ webhook_events  |
    |                              |—UPDATE orders SET paid WHERE status<>'paid'———————————▶ orders(paid)
    |                              |   ├─ increment_coupon_usage (RPC atomique) ——————————▶ coupons.used_count++
    |                              |   ├─ insert payments ————————————————————————————————▶ payments
    |                              |   ├─ decrement_stock_for_order (RPC atomique)————————▶ inventory↓ + stock_movements
    |                              |   ├─ sendEmail (best-effort)                          |
    |                              |   └─ trackPurchaseServer (CAPI, eventId=orderId)      |
    |—— redirect success_url ———————————————————————————————————————————————————————————▶ /checkout/success (clear cart)
```

### 12.2 Événements webhook

```
Stripe ─┬─ checkout.session.completed ─▶ markOrderPaid()  [ACTIF]
        ├─ payment_intent.succeeded ────▶ markOrderPaid()  [ACTIF, repli wallets]
        ├─ charge.refunded ─────────────▶ (rien)           ✗ H1
        ├─ charge.dispute.created ──────▶ (rien)           ✗ H1
        ├─ payment_intent.payment_failed▶ (rien)           ✗
        └─ checkout.session.expired ────▶ (rien)           ✗ M5
```

---

## 13. Plan de correction priorisé (Étape 13)

**Quick Wins (< 30 min)**
- H3 — nouvelle migration : `drop policy coupons_public_read` (codes promo non lisibles anonymement).
- M6 — garde test/live au boot dans `stripe.ts`.
- L5 — garde d'état avant `refunded`.

**Corrections < 2 h**
- M1 — idempotence + cumul des remboursements.
- M2 — devise unique par session.
- M4 — `orderId` dans la clé d'idempotence.
- H2 — CSP en `Report-Only` (calibrage), puis enforce.
- L1, L3, L4 — alignement SDK, vérif session succès, durcissement rate-limit.

**Corrections < 1 j**
- H1 — webhooks `charge.refunded` / `charge.dispute.*` / `payment_intent.payment_failed`.
- M5 — `checkout.session.expired` + purge des `pending`.
- M3 — stratégie coupons Stripe réutilisables / nettoyage.
- L2 — politique de rétention PII.

**Corrections majeures / dette Stripe**
- Stripe Tax / clarification TVA TTC (conformité fiscale UE).
- Objet `Customer` Stripe persistant (si comptes clients réутilisables souhaités).
- Suite de tests d'intégration webhook (refund/dispute) — aujourd'hui seuls `checkout.test.ts` et `coupons.test.ts` (logique pure) existent.

---

## 14. Estimation des risques

**Risque financier**
- **H3 (coupons exposés)** : selon la générosité des codes actifs, fuite de marge potentiellement significative sur le volume — le plus urgent économiquement.
- **H1 (refund/dispute)** : risque opérationnel (ré-expédition d'une commande contestée, écarts comptables) ; ampleur ∝ taux de litige.
- **M6** : risque d'encaissement « à vide » (perte de CA) ou de facturation en preview si mauvaise clé — faible probabilité, fort impact unitaire.

**Risque légal / conformité**
- **TVA non explicite** (`tax_cents=0`) : si les prix ne sont pas TTC pour l'UE, non-conformité fiscale B2C → **NON VÉRIFIABLE** depuis le code, à confirmer avec le métier.
- **PCI DSS v4.0.1** : posture SAQ-A correcte (saisie carte hébergée) mais **CSP requise** (H2) pour §6.4.3/§11.6.1 sur la page chargeant Stripe.js.
- **RGPD** : PII brute conservée sans purge (L2) → prévoir rétention/minimisation.

---

## 15. Points forts à préserver (anti-régression)

- ✅ Prix **toujours** recalculé serveur (`checkout.ts`, `checkout-db.ts`) — jamais de montant client.
- ✅ Webhook **signé + idempotent** (signature `route.ts:220`, dédup `webhook_events`, garde `status<>'paid'`).
- ✅ RPC **atomiques** service_role (`decrement_stock_for_order`, `increment_coupon_usage`) avec `search_path` épinglé.
- ✅ **Aucun secret commité** ; `.env*` ignoré ; clé publiable seule côté navigateur.
- ✅ RLS active sur toutes les tables commerce.
- ✅ Idempotency-Key sur les créations Stripe.
- ✅ HSTS + en-têtes de sécurité de base.

---

*Rapport généré en lecture seule le 2026-07-23. Aucune modification de code applicatif. Les éléments marqués NON VÉRIFIABLE dépendent du dashboard Stripe, des valeurs de secrets de production ou de l'environnement npm installé, hors périmètre du dépôt.*
