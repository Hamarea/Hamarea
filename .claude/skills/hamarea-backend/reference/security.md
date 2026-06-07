# Sécurité backend Hamarea — RLS, RBAC, secrets

La sécurité repose sur **deux couches** : la **RLS Postgres** (la vraie
frontière, impossible à contourner depuis l'API REST) et le **RBAC applicatif**
(granularité par permission dans les Server Actions). Plus des secrets bien
cloisonnés et des webhooks signés.

## Couche 1 — RLS (Row Level Security)

**Toutes** les tables ont `enable row level security`. Trois familles de policies :

### a) Lecture publique limitée par statut
```sql
create policy products_public_read on products
  for select using (status = 'active');
-- idem : categories(active), variants(active + produit actif),
--         reviews(status='approved'), pages(published), exchange_rates/shop_settings(true)
```
Conséquence : un produit `draft`/`archived` est **invisible** au public, même via
un appel REST direct avec la clé anon.

### b) Isolation par propriétaire (`auth.uid()`)
```sql
create policy addresses_self_all on addresses
  for all using ((select auth.uid()) = user_id)
       with check ((select auth.uid()) = user_id);
-- idem : carts, cart_items, orders (read), order_items/payments/shipments (read
--         via EXISTS sur orders), wishlists, wishlist_items
```
Un utilisateur ne voit/écrit que **ses** lignes. `(select auth.uid())` (et non
`auth.uid()` nu) = optimisation initplan (0009) : évalué une fois par requête.

### c) Accès admin/staff
```sql
create policy <table>_admin_all on <table>
  for all using (exists (select 1 from profiles p
                         where p.id = (select auth.uid())
                           and p.role in ('admin','staff')))
  with check (...même condition...);
```
Présent sur **toutes** les tables (boucle `do $$ … foreach t in array[...]`).
Sur `profiles`, la policy admin utilise `public.is_staff()` (voir fix 0015).

> **Règle** : toute **nouvelle table** doit (1) activer la RLS et (2) recevoir au
> minimum une policy `*_admin_all`, + une policy publique/propriétaire selon le
> besoin. Sans policy, la table est **inaccessible** (sauf service_role) — et
> l'advisor sécurité le signalera.

## Couche 2 — RBAC applicatif (`src/lib/auth.ts` + `permissions.ts`)

Au-dessus du rôle, des **permissions fines** par utilisateur dans
`profiles.permissions text[]`.

- **Rôles** (`user_role`) : `customer` < `staff` < `admin`.
  - `admin` : détient **implicitement toutes** les permissions (super-utilisateur).
  - `staff` : uniquement les permissions listées dans `profiles.permissions`.
  - `customer` : aucune permission admin.
- **Permissions** (`src/lib/permissions.ts`, client-safe) : `orders.write`,
  `orders.refund`, `products.write`, `coupons.write`, `suppliers.write`,
  `settings.write`, `moderation.write`.

### Les gardes serveur (à mettre EN TÊTE de chaque action)
| Fonction | Lève si… | Usage |
|---|---|---|
| `getActor()` | — (renvoie `null`) | résout `{id,email,role,permissions}` |
| `requireUser()` | non connecté (`unauthorized`) | toute action utilisateur |
| `requireStaff()` | pas admin/staff (`forbidden`) | entrée zone admin |
| `requireAdmin()` | pas admin (`forbidden`) | gestion rôles/permissions |
| `requirePermission(perm)` | permission absente (`forbidden`) | **chaque mutation admin** |

`hasPermission(actor, perm)` = `role==='admin' || permissions.includes(perm)`.

> **Pourquoi `permissions.ts` séparé d'`auth.ts` ?** `auth.ts` importe le client
> serveur (interdit côté client). `permissions.ts` est **pur** (types + libellés)
> donc importable par des composants `"use client"` (ex. `customer-row.tsx`).

### Triple garde de la zone /admin (défense en profondeur)
1. **Middleware** (`src/middleware.ts`) : redirige `/admin` si pas de session ou
   `role ∉ {admin,staff}`. En prod sans Supabase → 404 (jamais d'admin public).
2. **Layout admin** : re-vérifie l'acteur.
3. **Action** : `requirePermission(...)` — **la vraie** garde de mutation.
4. **RLS** : `*_admin_all` — la garde DB ultime.

## Failles corrigées (NE PAS réintroduire)

### 🔴 0010 — Escalade de privilèges via `profiles.role`
`profiles_self_update` isolait la *ligne* mais pas les *colonnes* : un user
pouvait `PATCH profiles {role:'admin'}` et s'auto-promouvoir. **Fix** : trigger
`prevent_role_self_escalation()` (`security definer`) qui **interdit** de changer
`role`/`id`/`permissions` sauf si l'acteur est admin (le `service_role`, sans
`auth.uid()`, garde le droit). → Toute écriture qui touche ces colonnes doit
passer par un admin ou la service_role.

### 🔴 0015 — Récursion infinie RLS sur `profiles`
`profiles_admin_all` sous-requêtait `profiles` lui-même → `42P17 infinite
recursion` → **toute** lecture de `profiles.role` renvoyait 500 → le système de
rôles était silencieusement cassé (admins jamais reconnus). **Fix** : fonction
`is_staff()` (`security definer`, lit le rôle **hors RLS**) appelée par la policy
au lieu du sous-`select`. → Ne jamais écrire une policy sur `profiles` qui
re-sélectionne `profiles` ; utiliser `is_staff()`.

### 🔴 0008 — Fonctions `security definer` exposées en REST
Supabase accorde par défaut `EXECUTE` aux rôles `anon`/`authenticated` sur les
fonctions du schéma `public`. **Fix** : `revoke execute … from anon, authenticated`
(et `public` pour les fonctions trigger) sur `decrement_stock_for_order`,
`release_expired_reservations`, `handle_new_user`, + `search_path` épinglé. → Toute
nouvelle fonction `security definer` doit **révoquer** explicitement les grants
non voulus et **épingler `set search_path = public`**.

## Secrets & cloisonnement

| Secret | Exposition | Règle |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navigateur (OK) | RLS appliquée, sans danger |
| `SUPABASE_SERVICE_ROLE_KEY` | **serveur uniquement** | jamais bundlé client ; uniquement `admin.ts`/webhooks/RPC |
| `STRIPE_SECRET_KEY` | serveur | SDK `lib/stripe.ts` |
| `STRIPE_WEBHOOK_SECRET` | serveur | vérif signature webhook (obligatoire) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | navigateur (OK) | Elements/Express Checkout |
| `RESEND_API_KEY`, `SHIPPO_API_KEY`, `*_ACCESS_TOKEN` | serveur | no-op si absents |

Garde-fou import : `admin.ts` n'est jamais importé par un fichier `"use client"`
ni par un module « pur » partagé (ex. `checkout.ts` reçoit le client admin **en
paramètre** plutôt que de l'importer, pour rester importable côté client).

## Anti-abus & conformité

- **Rate-limit** (`lib/rate-limit.ts` + RPC `rate_limit_hit`, table `rate_limits`
  verrouillée sans policy) : appliqué sur `checkout`/`payment-intent`/export RGPD.
  **Fail-open** (autorise si le backend est indispo).
- **Idempotence webhook** : `webhook_events(provider,event_id)` unique.
- **Audit** : `audit_logs` via `logAudit()` (best-effort, ne casse jamais l'action).
- **RGPD** : export des données (`/api/account/export`), double opt-in newsletter
  (`confirmed_at`), bannière de consentement avant tout tag analytics.

## Checklist sécurité avant de merger une migration

- [ ] RLS activée sur chaque nouvelle table.
- [ ] Policy publique/propriétaire/admin selon le besoin (`drop policy if exists` d'abord).
- [ ] Nouvelle FK → index de couverture.
- [ ] Fonction `security definer` → `revoke` des grants + `set search_path = public`.
- [ ] Aucune policy `profiles` qui re-sélectionne `profiles` (→ `is_staff()`).
- [ ] `get_advisors('security')` puis `('performance')` propres après `apply_migration`.
- [ ] `types.ts` régénéré, `npm run typecheck` + `npm run lint` verts.
