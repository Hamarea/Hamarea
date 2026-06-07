# Modèle de données Hamarea (Postgres / Supabase)

Source de vérité : `supabase/migrations/0001..0018_*.sql`. **28 tables**, **8 enums**,
toutes en **RLS activée**. Les types TS sont dans `src/lib/supabase/types.ts`
(⚠ régénérer après migration — voir « Pièges » en bas).

## Conventions de schéma (suivre à la lettre)

- **Clés** : `id uuid primary key default gen_random_uuid()` (sauf `profiles.id`
  = FK vers `auth.users`, et `shop_settings.key`/`exchange_rates(base,quote)`).
- **Argent** : `*_cents int check (>= 0)` + `currency char(3) default 'EUR'`.
  Jamais de `numeric`/`float` pour des montants.
- **i18n** : `*_i18n jsonb not null default '{}'` = `{fr,en,es,de}`.
- **Horodatage** : `created_at`/`updated_at timestamptz not null default now()`.
  `updated_at` est maintenu par le trigger `set_updated_at()` (à recréer sur
  toute nouvelle table mutable).
- **Soft visibility** : `status`/`active`/`published` pilotent la lecture publique RLS.
- **Audit** : les mutations sensibles écrivent dans `audit_logs` (via app ou RPC).

## Enums (migration 0001)

| Enum | Valeurs |
|---|---|
| `user_role` | `customer`, `staff`, `admin` |
| `product_status` | `draft`, `active`, `archived` |
| `order_status` | `pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded` |
| `payment_status` | `requires_action`, `pending`, `succeeded`, `failed`, `refunded` |
| `address_type` | `shipping`, `billing` |
| `coupon_type` | `percent`, `fixed` |
| `review_status` | `pending`, `approved`, `rejected` |
| `stock_movement_reason` | `sale`, `return`, `manual`, `reception`, `reservation_release`, `adjustment` |

## Tables par domaine

### 1. Identité & comptes (0002)
- **`profiles`** — 1-1 avec `auth.users` (`id` FK `on delete cascade`). Champs :
  `email citext`, `full_name`, `phone`, `locale`, `currency`, `marketing_opt_in`,
  `role user_role default 'customer'`, **`permissions text[] default '{}'`** (RBAC, 0013).
  Créé automatiquement au signup par le trigger `handle_new_user()` (`security definer`).
- **`addresses`** — carnet d'adresses utilisateur (`type` shipping/billing, `is_default`).

### 2. Catalogue (0003)
- **`categories`** — arbo (`parent_id` auto-réf), `slug` unique, `name_i18n`, `position`, `active`.
- **`suppliers`** — fournisseurs (nom, contact, pays).
- **`warehouses`** — entrepôts ; **un seul `is_default = true`** (utilisé par le décrément de stock).
- **`products`** — `slug` unique, `name_i18n`/`description_i18n`, `brand`,
  `status product_status`, `category_id`, `supplier_id`, `seo jsonb`,
  **`preorder boolean default false`** (0018), `search tsvector` (FR+EN, maintenu
  par trigger `products_search_trigger`, index GIN).
- **`product_variants`** — l'**unité vendable réelle** : `sku` unique, `barcode`,
  `option_values jsonb` (ex. `{color, size}`), `price_cents`, `compare_at_price_cents`,
  `cost_cents`, `currency`, `weight_g`, `dimensions`, `active`. Le **prix vit ici**.
- **`product_images`** — `storage_path` (Supabase Storage), liée produit + variante optionnelle, `alt_i18n`, `position`.
- **`inventory`** — stock par `(variant_id, warehouse_id)` unique : `quantity`,
  `reserved`, `reorder_point`.
- **`stock_movements`** — journal audité de chaque mouvement (`delta`, `reason`,
  `order_id`, `created_by`).

### 3. Commerce (0004)
- **`carts`** / **`cart_items`** — panier serveur (existe avec RLS propriétaire),
  mais **la landing utilise un panier client Zustand** (`src/stores/cart.ts`,
  localStorage `hamarea-cart`) ; ces tables servent au panier persistant connecté.
- **`coupons`** — `code citext` unique, `type` (percent/fixed), `value`,
  `min_subtotal_cents`, `starts_at`/`ends_at`, `usage_limit`/`used_count`, `active`.
- **`orders`** — `number` lisible auto (`HAM-YYYYMMDD-xxxxxxxx`), `user_id` (null si
  invité), `email citext`, `status order_status`, montants `*_cents` (subtotal,
  shipping, tax, discount, total), `shipping_address`/`billing_address jsonb`,
  `coupon_id`, **`stripe_payment_intent_id` unique**, `placed_at`.
- **`order_items`** — lignes **figées** (snapshot) : `sku`, `name_snapshot`,
  `quantity`, `unit_price_cents`, `tax_rate`, `total_cents`, `variant_id` (nullable :
  la landing sacoche n'a pas de variante DB → repli SKU au décrément, 0011).
- **`payments`** — un enregistrement par tentative/capture : `provider`,
  `provider_payment_id`, `status payment_status`, `amount_cents`, `raw jsonb`.
- **`shipments`** — `carrier`, `service`, `tracking_number`/`tracking_url`, `status`,
  `shipped_at`/`delivered_at` (Shippo prévu).
- **`refunds`** — `amount_cents`, `reason`, `provider_refund_id`, `created_by`.
- **`webhook_events`** — **idempotence** : `(provider, event_id)` unique. Un doublon
  d'insert (`23505`) = événement déjà traité.

### 4. Marketing & divers (0005)
- **`reviews`** — `rating 1..5`, `status review_status`, `verified_purchase`, +
  modération (0007) : `flagged_count`, `flag_reasons jsonb`, `moderator_id`,
  `moderated_at`, `moderation_note`.
- **`wishlists`** / **`wishlist_items`** — favoris par utilisateur.
- **`newsletter_subscribers`** — `email citext` unique, `locale`, `consent_at`,
  `unsubscribed_at`, + waitlist (0014) : `source`, `interests text[]`, `confirmed_at`
  (double opt-in RGPD).
- **`audit_logs`** — `actor_id`, `action`, `entity`/`entity_id`, `data jsonb`, `ip`.
- **`exchange_rates`** — `(base, quote)` → `rate`, `fetched_at`.
- **`pages`** — pages CMS (`slug`, `title_i18n`, `content_i18n`, `published`).
- **`shop_settings`** — clé→valeur JSONB (`site`, `locales`, `currencies`, `shipping`…).

### 5. Infrastructure (0012)
- **`rate_limits`** — `(key, window_start)` → `count`. **RLS activée, AUCUNE policy**
  (volontaire) : seule la RPC `security definer` `rate_limit_hit` y touche.

## Fonctions / RPC

| Fonction | Type | Accès | Rôle |
|---|---|---|---|
| `set_updated_at()` | trigger | — | maintient `updated_at` |
| `handle_new_user()` | trigger AFTER INSERT `auth.users` | `security definer` | crée la ligne `profiles` |
| `products_search_trigger()` | trigger | — | maintient `products.search` (tsvector) |
| `decrement_stock_for_order(uuid)` | RPC | **service_role uniquement** | décrémente le stock + journalise (atomique). Repli par SKU si `variant_id` null (0011) |
| `release_expired_reservations(int)` | RPC | service_role | libère les réservations expirées (cron) |
| `moderate_review(uuid, review_status, text)` | RPC | `authenticated` (rôle vérifié dans la fn) | modère un avis + audit |
| `flag_review(uuid, text)` | RPC | `authenticated` | signale un avis |
| `prevent_role_self_escalation()` | trigger BEFORE UPDATE `profiles` | `security definer` | bloque l'auto-promotion `role`/`id`/`permissions` (0010/0013) |
| `is_staff()` | fonction | `security definer`, exécutable anon/auth/service | lit le rôle **sans réentrer la RLS** (fix récursion 0015) |
| `rate_limit_hit(text, int, int)` | RPC | service_role | compteur fenêtre fixe → bool « autorisé » |

## Index notables

- `products.search` GIN (recherche plein-texte FR+EN).
- Couverture des 14 FK (0009) : `cart_items.variant_id`, `order_items.variant_id`,
  `orders.coupon_id`, `inventory.warehouse_id`, etc. → **toute nouvelle FK doit
  recevoir son index** (sinon advisor « unindexed foreign key »).
- `reviews` : index partiels `status='pending'`, `flagged_count>0`.

## Relations clés (qui pointe vers qui)

```
auth.users 1─1 profiles 1─* addresses
profiles 1─* orders 1─* order_items *─1 product_variants *─1 products *─1 categories
                       │                                   └─* product_images
                       ├─* payments        products *─1 suppliers
                       ├─* shipments       product_variants 1─* inventory *─1 warehouses
                       ├─* refunds         product_variants 1─* stock_movements
                       └─? coupons
products 1─* reviews        profiles 1─* wishlists 1─* wishlist_items *─1 products
```

## Pièges connus (accuracy)

- **`types.ts` est en retard sur les migrations.** Au dernier état lu, il
  **manque** : `profiles.permissions`, `products.preorder`, la table `rate_limits`,
  et les fonctions `is_staff`/`rate_limit_hit`/`prevent_role_self_escalation`.
  → **Régénérer** après toute migration (`generate_typescript_types` MCP) sinon le
  typage ment. Beaucoup de fichiers utilisent un typage structurel « loose »
  (`as unknown as { from: … }`) justement pour contourner ce décalage historique.
- **`order_items.variant_id` peut être null** (landing sacoche). Tout traitement
  de stock doit gérer le repli par `sku` (cf. `decrement_stock_for_order` 0011).
- **Un seul `warehouses.is_default = true`** est supposé par le décrément de stock ;
  s'il n'y en a aucun, la RPC lève `No default warehouse defined`.
