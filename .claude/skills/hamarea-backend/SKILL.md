---
name: hamarea-backend
description: >-
  Référence backend du e-commerce Hamarea (Next.js 15 App Router · Supabase
  Postgres/Auth/Storage/RLS · Stripe). À utiliser pour TOUTE tâche backend de la
  boutique : schéma & migrations SQL, sécurité RLS/RBAC, flux
  panier→commande→paiement→webhook→stock, choix du client Supabase
  (browser/server/admin), server actions, routes API, lecture/écriture de
  données, RPC Postgres, intégrations (Stripe, Resend, Shippo). Explique OÙ
  vivent les données, QUEL client utiliser, QUAND/COMMENT lire-écrire, et comment
  étendre le schéma sans casser la sécurité. Mots-clés : Supabase, Stripe, RLS,
  migration, webhook, checkout, commande, order, produit, variante, stock, panier,
  coupon, remboursement, audit, RBAC, service_role, backend Hamarea.
---

# Backend e-commerce Hamarea — guide de référence

Hamarea est une boutique e-commerce internationale (FR/EN/ES/DE). Ce skill
décrit **toute la gestion backend** : où vivent les données, par quel chemin
elles transitent, et comment travailler dessus sans casser la sécurité.

> **Architecture en une phrase** : un front **Next.js 15 (App Router, RSC)** lit
> et écrit dans **Supabase (Postgres + Auth + Storage + RLS)** via trois clients
> distincts, encaisse les paiements avec **Stripe** (Checkout hébergé +
> PaymentIntent), et réconcilie la commande de façon **idempotente** dans un
> **webhook**. La **RLS Postgres** est la vraie frontière de sécurité ;
> l'application ajoute des contrôles en défense en profondeur.

## Carte de la stack — qui gère quoi

| Préoccupation | Techno | Où dans le code |
|---|---|---|
| Framework / rendu | Next.js 15 App Router, React 19, RSC | `src/app/[locale]/**` |
| Base de données | Supabase **Postgres** | `supabase/migrations/*.sql` |
| Schéma / types TS | Types générés | `src/lib/supabase/types.ts` |
| Auth (sessions, OAuth, MFA) | Supabase Auth (cookies SSR) | `src/lib/supabase/{server,client}.ts`, `src/middleware.ts` |
| Autorisations | **RLS** + RBAC applicatif | migrations + `src/lib/auth.ts`, `src/lib/permissions.ts` |
| Lecture catalogue | Server Components → client serveur | `src/lib/queries.ts` |
| Écritures admin | **Server Actions** (`"use server"`) | `src/app/[locale]/admin/**/actions.ts` |
| Paiement | **Stripe** (Checkout + PaymentIntent) | `src/lib/stripe.ts`, `src/app/api/checkout/**` |
| Réconciliation paiement | Webhook signé + idempotent | `src/app/api/webhooks/stripe/route.ts` |
| Stock | RPC Postgres atomique (`security definer`) | `decrement_stock_for_order` (migr. 0006/0011) |
| Panier | **Zustand** côté client (localStorage) | `src/stores/cart.ts` |
| Emails | Resend (best-effort) | `src/lib/email.ts` |
| Expédition | Shippo (prévu) | `.env` `SHIPPO_API_KEY` |
| i18n | next-intl, contenu en JSONB `*_i18n` | `src/i18n/**`, `messages/*.json` |
| Anti-abus | Rate-limit fenêtre fixe en DB | `src/lib/rate-limit.ts` (migr. 0012) |
| Audit | `audit_logs` + helper | `src/lib/audit.ts` |

## 🔟 Les règles d'or (invariants à ne JAMAIS violer)

1. **L'argent est en centimes entiers** (`*_cents` `int`), jamais en float. La
   devise est un `char(3)` (`EUR`, `USD`, `GBP`).
2. **Le prix est TOUJOURS recalculé côté serveur.** Le client n'envoie que des
   *références* (variantId/productId, couleur, pack, quantité) — **jamais un
   prix**. Source de vérité : `priceCart` (sacoche) / `priceDbVariants` (DB).
3. **La `service_role` key ne touche jamais le navigateur.** N'importe `lib/supabase/admin.ts`
   QUE depuis du code serveur (`route.ts`, webhooks, actions serveur). Jamais
   dans un composant `"use client"`.
4. **Chaque mutation admin = `requirePermission(perm)` en tête + `logAudit()` après.**
   La RLS protège la DB ; la permission protège l'action.
5. **La RLS est activée sur toutes les tables** et reste la vraie frontière. Le
   middleware/layout/actions sont de la **défense en profondeur**, pas la garde
   unique.
6. **Le contenu multilingue vit en JSONB** `name_i18n`/`description_i18n`/… au
   format `{ "fr": …, "en": …, "es": …, "de": … }`. Toujours lire avec un repli
   sur `fr` (`x.name_i18n?.[locale] ?? x.name_i18n?.fr ?? slug`).
7. **Les migrations sont append-only, numérotées `NNNN_nom.sql`, idempotentes**
   (`create … if not exists`, `do $$ … exception when duplicate_object`,
   `drop policy if exists` avant `create policy`). On ne réécrit jamais une
   migration déjà appliquée — on en ajoute une nouvelle.
8. **Les webhooks sont signés ET idempotents.** Vérifier `stripe-signature`,
   dédupliquer sur `webhook_events(provider, event_id)` unique, garder les effets
   de bord derrière un garde d'état (`status <> 'paid'`).
9. **Le stock se décrémente dans Postgres** via la RPC `decrement_stock_for_order`
   (`security definer`, accessible `service_role` uniquement), jamais par un
   `update` lu-puis-écrit côté app (course critique).
10. **Mode aperçu sans secrets.** Sans variables Supabase, le client serveur
    renvoie un *stub* et `queries.ts` sert des données d'exemple. Toute lecture
    doit se dégrader proprement (jamais planter sans DB).

## Quel client Supabase utiliser ? (la décision n°1)

Il existe **trois** clients. Choisir le mauvais = soit une faille, soit un blocage RLS.

| Client | Fichier | Clé | RLS | Quand l'utiliser |
|---|---|---|---|---|
| **Browser** | `lib/supabase/client.ts` → `createClient()` | anon (publishable) | ✅ s'applique | Composants `"use client"` (ex. login, MFA, wishlist côté client) |
| **Server (utilisateur)** | `lib/supabase/server.ts` → `createClient()` (async) | anon + cookies | ✅ s'applique **en tant que l'utilisateur connecté** | Server Components, Server Actions, route handlers agissant *au nom du visiteur* (catalogue, compte, écritures admin gardées par la RLS `*_admin_all`) |
| **Admin** | `lib/supabase/admin.ts` → `createAdminClient()` | **service_role** | ❌ **contourne la RLS** | Webhooks, RPC de confiance, pricing serveur (`checkout-db.ts`), rate-limit. **Serveur uniquement.** |

**Règle pratique** : par défaut, utilise le **client serveur** (la RLS te protège).
Ne passe au **client admin** que quand il n'y a *pas* de session utilisateur
(webhook) ou qu'il faut délibérément franchir la RLS (décrément de stock,
lecture de prix autoritaire). Si tu te demandes « est-ce que j'ai besoin de la
service_role ? » la réponse est presque toujours **non**.

## Flux de données de bout en bout — cycle de vie d'une commande

```
[Navigateur]                          [Serveur Next.js]                     [Postgres / Stripe]
   |                                        |                                      |
 1. Ajout panier (Zustand → localStorage)   |                                      |
   |  (rien en DB à ce stade)               |                                      |
 2. POST /api/checkout/session ─────────────▶ recalc prix (priceCart /            |
    (refs seulement: variantId, qty, …)      priceDbVariants, AUTORITAIRE)        |
   |                                         │  createPendingOrder() ─────────────▶ orders(status=pending)
   |                                         │   (client ADMIN)                       order_items
   |                                         │  stripe.checkout.sessions.create ─▶ Stripe (metadata.order_id)
   |◀──────────── { url } ───────────────────┘                                      |
 3. Redirection vers Stripe Checkout ─────────────────────────────────────────────▶ paiement carte/wallet
   |                                                                                  |
 4. Stripe ──── webhook checkout.session.completed ─────▶ /api/webhooks/stripe       |
   |                                         │  vérifie signature                     |
   |                                         │  insert webhook_events (dédup 23505)   |
   |                                         │  markOrderPaid() (client ADMIN):       |
   |                                         │   update orders SET status='paid'  ───▶ orders (garde: AND status<>'paid')
   |                                         │   insert payments                  ───▶ payments
   |                                         │   rpc decrement_stock_for_order    ───▶ inventory↓ + stock_movements
   |                                         │   sendEmail (Resend, best-effort)      |
   |                                         │   trackPurchaseServer (CAPI)           |
 5. Redirection success_url ──────────────────────────────────────────────────────▶ /checkout/success (clear cart)
```

Détails complets (idempotence, Express Checkout/wallets, adresses) :
**`reference/commerce-flow.md`**.

## Carte des fichiers backend

```
supabase/migrations/0001..0018_*.sql   Schéma SQL : extensions, enums, tables, RLS, RPC, seeds
src/lib/supabase/
  ├── client.ts      Client navigateur (anon)
  ├── server.ts      Client serveur (anon + cookies) + STUB mode aperçu
  ├── admin.ts       Client service_role (contourne RLS) — serveur uniquement
  └── types.ts       Types générés (⚠ peut être en retard sur les migrations)
src/lib/
  ├── auth.ts        getActor / requireUser|Staff|Admin|Permission  (RBAC serveur)
  ├── permissions.ts Permission[] + libellés (client-safe, pas d'import serveur)
  ├── queries.ts     Lecture catalogue (repli données d'exemple si pas de DB)
  ├── checkout.ts    Pricing AUTORITAIRE sacoche + createPendingOrder (pur)
  ├── checkout-db.ts Pricing AUTORITAIRE produits catalogue (lit price_cents en DB)
  ├── stripe.ts      Singleton SDK Stripe (null si non configuré)
  ├── audit.ts       logAudit() best-effort → audit_logs
  ├── rate-limit.ts  rateLimitHit() → RPC rate_limit_hit (fail-open)
  └── email.ts       sendEmail() Resend (no-op si non configuré)
src/app/api/
  ├── checkout/session/route.ts         Stripe Checkout hébergé (carte + wallets)
  ├── checkout/payment-intent/route.ts  Express Checkout (Apple/Google Pay) on-page
  ├── webhooks/stripe/route.ts          Réconciliation paiement (idempotente)
  ├── account/export/route.ts           Export RGPD des données utilisateur
  └── admin/export/orders/route.ts      Export CSV des commandes (admin)
src/app/[locale]/admin/**/actions.ts    Server Actions (mutations admin gardées)
src/middleware.ts                       i18n + garde /admin (rôle) + refresh cookies
```

## Étendre le backend — par où commencer

| Tâche | Recette |
|---|---|
| Ajouter un champ produit / table | `reference/recipes.md` → « Nouvelle migration » |
| Ajouter une action admin (CRUD) | `reference/recipes.md` → « Server Action » |
| Ajouter une RPC Postgres | `reference/recipes.md` → « RPC `security definer` » |
| Ajouter une route API / webhook | `reference/recipes.md` → « Route API » |
| Changer une policy RLS | `reference/security.md` |
| Comprendre une table / un enum | `reference/data-model.md` |

## Introspecter / modifier la base réelle (MCP Supabase)

Le projet est câblé au serveur **MCP Supabase** (`.mcp.json`, project ref
`elyrrdpfzbnavqhqmirv`). Quand un `SUPABASE_ACCESS_TOKEN` est présent, utilise
les outils MCP plutôt que de deviner :

- `list_tables`, `list_migrations`, `list_extensions` — état réel du schéma.
- `apply_migration` — applique une migration (écrit directement sur le projet
  distant : préfère d'abord un fichier `supabase/migrations/NNNN_*.sql` versionné).
- `execute_sql` — requête ponctuelle de lecture/debug.
- `get_advisors` (`security` puis `performance`) — **à lancer après toute DDL** ;
  remonte RLS manquante, FK non indexée, fonction au `search_path` mutable.
- `generate_typescript_types` → réécrire `src/lib/supabase/types.ts`.

> ⚠️ **Sans token**, ces appels renvoient *Unauthorized* — c'est normal en
> environnement sans secret. Le schéma fait foi dans `supabase/migrations/`.

## Fichiers de référence (divulgation progressive)

| Fichier | Contenu |
|---|---|
| **`reference/data-model.md`** | Les 28 tables, 8 enums, RPC, index, conventions de schéma |
| **`reference/data-access.md`** | Les 3 clients en détail, patterns de requête, mode aperçu, types |
| **`reference/commerce-flow.md`** | Checkout → Stripe → webhook → stock, idempotence, wallets, coupons |
| **`reference/security.md`** | Modèle RLS, RBAC/permissions, fix escalade & récursion, secrets |
| **`reference/recipes.md`** | Procédures pas-à-pas (migration, action, RPC, route API, types) |

Charge le fichier pertinent **au moment où tu en as besoin**, pas avant.
