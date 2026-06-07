# Accès aux données — connexion & utilisation (où, quoi, quand, comment)

Comment l'app **se connecte** à Postgres et **lit/écrit** les données. Trois
clients, trois contextes. Choisir le bon est la décision la plus importante.

## Les 3 clients en détail

### 1. Client navigateur — `src/lib/supabase/client.ts`
```ts
import { createBrowserClient } from "@supabase/ssr";
export function createClient() {
  return createBrowserClient<Database>(URL, ANON_KEY); // clé publique
}
```
- **Contexte** : composants `"use client"`.
- **Sécurité** : clé **anon** (publishable), **RLS appliquée**. Ne peut lire que
  ce que les policies autorisent pour l'utilisateur courant.
- **Usage typique** : login/signup, MFA, OAuth, actions interactives où l'on a
  besoin de la session côté navigateur.
- ❌ Ne jamais y mettre de logique de prix/secret : tout est visible côté client.

### 2. Client serveur (au nom de l'utilisateur) — `src/lib/supabase/server.ts`
```ts
const supabase = await createClient(); // ASYNC : lit les cookies Next
const { data: { user } } = await supabase.auth.getUser();
```
- **Contexte** : Server Components, **Server Actions**, route handlers agissant
  *au nom du visiteur connecté*.
- **Sécurité** : clé **anon + cookies** → requêtes exécutées **en tant que
  l'utilisateur**. **RLS appliquée**. C'est le **défaut** : la RLS te protège.
- **Mode aperçu** : si `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` sont absents,
  `createClient()` renvoie un **stub** (query builders qui résolvent à
  `{ data: [], error: null }`, `auth.getUser()` → `null`). Le site rend des
  **données d'exemple** sans planter. Toute lecture doit tolérer ce cas.
- ⚠️ `cookieStore.set` peut échouer hors contexte requête (Server Component) — le
  code l'ignore (le middleware rafraîchit la session). Ne pas « corriger » ça.

### 3. Client admin (service_role) — `src/lib/supabase/admin.ts`
```ts
import { createClient } from "@supabase/supabase-js";
export function createAdminClient() {
  return createClient<Database>(URL, SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } });
}
```
- **Contexte** : **serveur uniquement** — webhooks, RPC de confiance, pricing
  autoritaire (`checkout-db.ts`), rate-limit.
- **Sécurité** : clé **service_role** → **CONTOURNE la RLS** + n'a pas de
  `auth.uid()`. C'est un super-utilisateur DB.
- 🔴 **Interdit** : importer ce fichier depuis un composant `"use client"` (la clé
  fuiterait dans le bundle). À réserver aux fichiers `route.ts`/actions serveur.
- Quand l'utiliser : **pas de session** (webhook Stripe) OU franchissement
  délibéré de la RLS (décrément de stock, lecture prix de référence).

## Arbre de décision

```
Besoin d'accéder aux données ?
├── Code dans un composant "use client" ?
│     → client.ts (navigateur, anon)
├── Code serveur agissant pour l'utilisateur connecté (RSC, action, page) ?
│     → server.ts (anon + cookies, RLS = la garde)         ← DÉFAUT
└── Pas de session (webhook) OU il faut franchir la RLS (stock, prix) ?
      → admin.ts (service_role)  ⚠ serveur only, jamais bundlé client
```

## Patterns de lecture (catalogue) — `src/lib/queries.ts`

Lectures publiques du catalogue, **toujours via le client serveur**, avec repli
sur des données d'exemple si la DB n'est pas configurée.

- `isConfigured()` garde chaque fonction ; sinon → `SAMPLE_*`.
- **Jointures imbriquées** PostgREST dans le `select` :
  ```ts
  .from("products")
  .select("id, slug, name_i18n, description_i18n, created_at,
           product_variants(price_cents, compare_at_price_cents, currency, active, position),
           product_images(storage_path, alt_i18n, position),
           category:category_id(slug, name_i18n)")
  .eq("status", "active")          // la RLS impose déjà status='active' en public
  .order("created_at", { ascending: false })
  .range(from, to)                 // pagination
  ```
- **Recherche** : `.or("name_i18n->>fr.ilike.%q%, …")` (échapper `%`/`_`).
- **i18n au mapping** : `row.name_i18n?.[locale] ?? row.name_i18n?.fr ?? row.slug`.
- **Tri prix** : fait en mémoire après coup (le prix vit dans la variante imbriquée).
- Tout est enveloppé dans `try/catch` → repli gracieux (jamais d'erreur 500 sur
  une page catalogue).

## Patterns d'écriture (admin) — Server Actions

Les mutations passent par des **Server Actions** (`"use server"`), pas par des
appels DB côté client. Squelette canonique (voir `recipes.md` pour le complet) :

```ts
"use server";
export async function createX(_prev, formData) {
  const actor = await requirePermission("x.write");      // 1. garde permission
  const data = XSchema.parse({ /* champs FormData */ });   // 2. valider (zod)
  const supabase = (await createClient()) as unknown as LooseClient; // 3. client serveur
  const { error } = await supabase.from("x").insert({ … });          // 4. écrire (RLS)
  if (error?.code === "23505") return { error: "déjà existant" };     // 5. erreurs Postgres
  await logAudit({ actorId: actor.id, action: "x.create", … });       // 6. auditer
  revalidatePath("/admin/x");                                          // 7. revalider
  return { ok: true };
}
```

Pourquoi le client **serveur** (pas admin) pour les écritures admin ? Parce que
les policies `*_admin_all` autorisent déjà `role in ('admin','staff')`. La RLS
reste la garde ; `requirePermission` ajoute la granularité par permission.

## RPC (appel de fonctions Postgres)

```ts
const admin = createAdminClient() as unknown as RpcClient;
const { data, error } = await admin.rpc("decrement_stock_for_order", { p_order_id });
```
- Les RPC `service_role` (`decrement_stock_for_order`, `rate_limit_hit`,
  `release_expired_reservations`) **doivent** être appelées via le client admin.
- Les RPC `authenticated` (`moderate_review`, `flag_review`) peuvent l'être via le
  client serveur (elles re-vérifient le rôle en interne).

## Typage des requêtes

- `types.ts` fournit `Database`, `Tables<'orders'>`, `TablesInsert<…>`,
  `Enums<'order_status'>`, et `Constants.public.Enums.*` (listes runtime).
- **Décalage historique** : comme `types.ts` a pu être en retard, beaucoup de
  code utilise un **typage structurel local** (`as unknown as { from: (t) => … }`)
  décrivant *uniquement* la forme utilisée. C'est volontaire et acceptable ; quand
  tu régénères `types.ts`, tu peux resserrer progressivement.
- Après toute migration : régénérer (`generate_typescript_types` MCP →
  `src/lib/supabase/types.ts`) puis `npm run typecheck`.

## Storage (images produits)

- Les images sont dans **Supabase Storage** ; `product_images.storage_path`
  référence l'objet. La RLS de lecture publique suit le statut du produit.
- Côté front, `storage_path` est consommé tel quel comme URL d'image.

## Connexion / variables d'environnement

| Variable | Côté | Rôle |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | URL projet (navigateur + serveur) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | clé publishable (RLS appliquée) |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret serveur** | contourne la RLS — webhooks/RPC |
| `SUPABASE_ACCESS_TOKEN` | outillage | CLI/MCP (migrations), **pas** l'app |

Sans les deux premières → mode aperçu. Sans la 3ᵉ → pas de persistance commande
ni de décrément stock (les routes checkout le détectent via `hasDb`).
