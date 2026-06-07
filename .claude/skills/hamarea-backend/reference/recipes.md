# Recettes backend Hamarea (pas-à-pas)

Procédures concrètes pour les tâches les plus fréquentes. Chacune respecte les
règles d'or du `SKILL.md` (RLS, prix serveur, audit, idempotence).

---

## 1. Nouvelle migration (champ, table, index)

1. Créer `supabase/migrations/00NN_nom_court.sql` (NN = numéro suivant ;
   actuellement le dernier est `0018`).
2. Écrire du SQL **idempotent** :
   ```sql
   -- 00NN_nom_court.sql
   -- But en une ligne.
   alter table public.products
     add column if not exists my_flag boolean not null default false;

   create index if not exists products_my_flag_idx on public.products (my_flag);
   ```
3. **Nouvelle table** → ajouter le trigger `updated_at`, la RLS et les policies :
   ```sql
   create table if not exists public.my_table (
     id uuid primary key default gen_random_uuid(),
     ...,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   );
   create trigger trg_my_table_updated_at before update on public.my_table
     for each row execute function public.set_updated_at();

   alter table public.my_table enable row level security;
   drop policy if exists my_table_public_read on public.my_table;
   create policy my_table_public_read on public.my_table
     for select using (true);                 -- ou un garde de statut
   drop policy if exists my_table_admin_all on public.my_table;
   create policy my_table_admin_all on public.my_table
     for all using (public.is_staff()) with check (public.is_staff());
   ```
4. **Appliquer** : MCP `apply_migration` (si `SUPABASE_ACCESS_TOKEN`) ou
   `supabase db push`. ⚠ `apply_migration` écrit sur le projet distant.
5. **Régénérer les types** : MCP `generate_typescript_types` → écraser
   `src/lib/supabase/types.ts`.
6. **Vérifier** : `get_advisors('security')` + `('performance')`, puis
   `npm run typecheck` && `npm run lint`.

---

## 2. Rendre un nouveau champ produit éditable côté admin

Ex. déjà fait pour `preorder` (0018) — modèle à suivre :
1. Migration (recette 1) : `alter table products add column if not exists ...`.
2. **Action** (`src/app/[locale]/admin/products/actions.ts` et/ou `[id]/actions.ts`) :
   ajouter le champ au schéma zod + au payload `insert`/`update`.
3. **UI** (`admin/products/page.tsx` / `[id]/page.tsx`) : champ de formulaire +
   badge dans la liste.
4. **Lecture storefront** (`src/lib/queries.ts`) : ajouter la colonne au `select`
   et au mapping `ProductDetail` (avec repli).
5. Régénérer types, typecheck, lint.

---

## 3. Server Action (mutation admin) — squelette complet

Fichier : `src/app/[locale]/admin/<domaine>/actions.ts`
```ts
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { FormState } from "@/lib/form-state";

const Schema = z.object({
  name: z.string().trim().min(1).max(200),
  // ... champs validés et bornés
});

// Typage structurel local (les types générés peuvent être en retard).
type Result = { error: { code?: string; message?: string } | null; data?: unknown };
type Chain = { insert:(r:Record<string,unknown>)=>Chain; select:(q:string)=>Chain;
  eq:(k:string,v:string)=>Chain; single:()=>Promise<Result> } & Promise<Result>;
type LooseClient = { from: (t: string) => Chain };

export async function createThing(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermission("products.write");   // 1. GARDE
    const data = Schema.parse({ name: formData.get("name") }); // 2. VALIDER
    const supabase = (await createClient()) as unknown as LooseClient; // 3. client SERVEUR
    const { data: created, error } = await supabase
      .from("things").insert({ name: data.name }).select("id").single(); // 4. ÉCRIRE (RLS)
    if (error) {
      if (error.code === "23505") return { error: "Déjà existant." };    // 5. erreurs PG
      return { error: "Création impossible." };
    }
    await logAudit({ actorId: actor.id, action: "thing.create",          // 6. AUDIT
      entity: "thing", entityId: (created as {id:string})?.id, data });
    revalidatePath("/admin/things");                                     // 7. REVALIDER
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "forbidden" || msg === "unauthorized") return { error: "Action non autorisée." };
    return { error: "Champs invalides." };
  }
}
```
Points clés : **garde permission en premier**, validation zod stricte, client
**serveur** (la RLS `*_admin_all` autorise), gestion explicite de `23505`
(unicité), `logAudit` après succès, `revalidatePath`. Les *row actions* simples
(`setProductStatus`) renvoient `void` et avalent l'erreur (best-effort).

---

## 4. RPC Postgres `security definer` (logique de confiance)

Pour une opération atomique / privilégiée (stock, compteurs, modération) :
```sql
create or replace function public.do_trusted_thing(p_arg uuid)
returns void
language plpgsql
security definer
set search_path = public          -- ⚠ OBLIGATOIRE (sécurité)
as $$
begin
  -- logique privilégiée...
end;
$$;

-- ⚠ OBLIGATOIRE : révoquer les grants implicites, n'autoriser que le rôle voulu
revoke all on function public.do_trusted_thing(uuid) from public, anon, authenticated;
grant execute on function public.do_trusted_thing(uuid) to service_role;  -- ou authenticated
```
Appel applicatif :
```ts
const admin = createAdminClient() as unknown as
  { rpc:(f:string,a:Record<string,unknown>)=>Promise<{data:unknown;error:unknown}> };
const { error } = await admin.rpc("do_trusted_thing", { p_arg: id });
```
Si la RPC vérifie elle-même le rôle (cf. `moderate_review`), elle peut être
`grant`ée à `authenticated` et appelée via le client **serveur**.

---

## 5. Route API / nouveau webhook

Fichier : `src/app/api/<chemin>/route.ts`
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitHit } from "@/lib/rate-limit";

const Body = z.object({ /* ... */ });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await rateLimitHit(`myroute:${ip}`, 10, 60)))
    return NextResponse.json({ error: "Trop de tentatives." }, { status: 429 });

  let body; try { body = Body.parse(await req.json()); }
  catch (e) { return NextResponse.json({ error: "bad request" }, { status: 400 }); }

  // ... logique (client admin/serveur selon le contexte) ...
  return NextResponse.json({ ok: true });
}
export const runtime = "nodejs";        // Stripe/Node SDK ⇒ runtime Node
export const dynamic = "force-dynamic"; // pas de cache pour une route mutante
```
**Webhook** : ajouter en plus (1) vérif de signature du provider, (2) dédup via
`webhook_events(provider,event_id)` (`23505` ⇒ ack sans retraiter), (3) effets de
bord **idempotents** derrière un garde d'état. Voir
`src/app/api/webhooks/stripe/route.ts` comme référence.

---

## 6. Lire des données dans un Server Component

```ts
import { listFeaturedProducts } from "@/lib/queries"; // déjà : repli + i18n + try/catch
const products = await listFeaturedProducts(locale, 8);
```
Pour une lecture ad hoc, suivre le pattern de `queries.ts` : garde `isConfigured()`,
client **serveur**, `select` avec jointures imbriquées, mapping i18n avec repli,
`try/catch` → données d'exemple. Ne jamais lever d'erreur sur une page publique.

---

## 7. Promouvoir / gérer un compte admin

```sql
-- Promotion (SQL editor Supabase) :
update public.profiles set role = 'admin' where email = 'moi@hamarea.com';
-- Staff avec permissions ciblées :
update public.profiles
  set role = 'staff', permissions = array['orders.write','products.write']
  where email = 'staff@hamarea.com';
```
Depuis l'app, seul un **admin** peut changer rôle/permissions (trigger 0010/0013) ;
l'UI vit dans `src/app/[locale]/admin/customers/`.

---

## 8. Vérifications finales (toujours)

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest (logique pure : pricing, coupons, frais de port)
npm run build       # build prod (optionnel mais recommandé avant push)
```

> Les tests vivent en `src/**/*.test.ts` (config `vitest.config.ts`, env node).
> Couvre en priorité la **logique pure autoritaire** (prix, coupons) — pas les
> routes (non testables sans Stripe/DB live).
Si la DB a changé : MCP `get_advisors('security')` + `('performance')`, puis
`generate_typescript_types`.

---

## Erreurs Postgres fréquentes

| Code | Sens | Réaction typique |
|---|---|---|
| `23505` | violation d'unicité | message « déjà existant » / dédup webhook |
| `23503` | violation de FK | vérifier l'existence de la ligne référencée |
| `42501` | privilège insuffisant | acteur non admin (trigger d'escalade) |
| `42P17` | récursion RLS | policy qui se ré-interroge → utiliser `is_staff()` |
| `PT001/2/3` | erreurs métier RPC (`moderate_review`) | unauthenticated/forbidden/not found |
