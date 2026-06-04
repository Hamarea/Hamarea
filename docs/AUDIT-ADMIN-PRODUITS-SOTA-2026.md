# Audit — Module admin « Produits » (création / modification) vs SOTA 2026

> Réponse à : *« Si l'admin veut changer ou rajouter un produit, le module est-il complet et précis ?
> L'UI est-elle présente ? L'UX est-elle SOTA 2026 ? Mes modifications sont-elles SOTA 2026 ? »*
>
> Audit du code réel (`src/app/[locale]/admin/products/**`, actions, layout, permissions, dashboard)
> confronté à l'état de l'art 2026 du back-office e-commerce (Shopify, NN/g, W3C/WCAG 2.2, Medusa,
> Saleor, Akeneo). Date : 2026-06-03. Périmètre : gestion produit en admin + auto-évaluation des
> modifications « site de marque » livrées au commit précédent.

---

## 0. Verdict & scorecard

**Réponse courte :** Oui, **on peut créer et modifier un produit** — le module est **fonctionnel, sécurisé et
auditе**, avec une base technique propre (RBAC granulaire, validation Zod, prix en cents, mouvements de stock,
upload Supabase Storage, MFA). **Mais il n'est ni complet ni SOTA 2026 comme éditeur produit** : i18n limitée
à FR/EN, pas de matrice de variantes, pas de SEO/tags/prix barré/coût, **sauvegarde fragmentée** (≈12 formulaires
indépendants), **erreurs d'édition qui crashent en page d'erreur**, et une **liste produits sans tri/filtre/bulk
et dont la recherche ignore le nom**. C'est un **back-office "MVP fonctionnel"**, pas un PIM moderne.

| Axe | Note /10 | Synthèse |
|---|---|---|
| **Complétude des champs** | **4** | Manque : i18n ES/DE, SEO, compare-at/coût/marge, tags/collections, matrice variantes, poids/dimensions, scheduling |
| **Précision / correction** | **6,5** | Bonne base (Zod, cents, unicité, audit) — mais 4 bugs concrets (§4) |
| **UI présente** | **7** | Présente, cohérente avec le design system, mais **utilitaire** (selects bruts, `<details>`, formulaires empilés) |
| **UX SOTA 2026** | **4** | Feedback de chargement + empty states OK ; mais sauvegarde fragmentée, erreurs→boundary, ni bulk/tri/filtre/DnD/optimistic |
| **Sécurité / RBAC / audit** | **8,5** | **Point fort** : permissions granulaires, audit systématique, MFA step-up, service-role isolée |
| **Accessibilité / mobile** | **5,5** | Labels présents ; mais cibles, focus sticky, DnD alternatif, sidebar non repliable |
| **→ Module admin produits (global)** | **≈ 5,5** | Solide en sécurité, **en retard en complétude & UX d'édition** |
| **Mes modifications « site de marque »** | **≈ 7,5** | Front de marque **proche SOTA** ; réserves : single opt-in, migration à appliquer, UGC/avis placeholder, pas de wallets express (§5) |

---

## 1. Méthodologie & sources

- **Code audité** : `admin/products/page.tsx` (liste + création), `admin/products/[id]/page.tsx` (édition),
  `admin/products/[id]/actions.ts` (update/variantes/stock/images/upload), `admin/products/actions.ts`
  (createProduct/setProductStatus), `admin/layout.tsx`, `lib/permissions.ts`, `admin/page.tsx` (dashboard).
- **Référentiel SOTA 2026** : recherche sourcée — **primaires** : NN/g (formulaires, erreurs, data tables,
  charge cognitive, progressive disclosure), **W3C/WCAG 2.2**, **Shopify** (Help + Polaris), **Medusa**,
  **Saleor**, **Akeneo** (PIM/complétude/localisation), IBM Carbon. Les « tendances 2026 » (IA, ⌘K, densité)
  sont **directionnelles** (sources éditeurs), signalées comme telles.

---

## 2. Réponses directes aux 4 questions

### 2.1 « Le module est-il complet et précis ? » → **Précis (sur son périmètre), mais incomplet.**
On peut **ajouter** un produit (nom FR/EN, slug auto, marque, fournisseur, statut) puis, sur la fiche, **éditer**
catégorie + description FR, gérer **variantes** (SKU/prix/actif), **stock** (qté + seuil) et **images**
(upload/URL). La logique est **précise** là où elle existe (Zod, prix ×100 en cents, unicité slug/SKU,
upsert inventaire + `stock_movements`, audit). **Incomplet** car il manque des champs attendus d'un éditeur 2026
(§3.1) et la création **ne pose pas de prix** → le produit n'est **pas vendable** tant qu'on n'a pas ajouté une
variante sur une 2ᵉ page. Or, en modèle headless, *« seules les variantes sont achetables »* (Saleor) — donc un
produit sans variante n'est pas commandable.

### 2.2 « L'UI est-elle présente ? » → **Oui.**
Tout est rendu côté serveur avec le design system (`Card`, `Input`, `Label`, `SubmitButton`, `ActionForm`,
`Badge`), tables responsives (`overflow-x-auto`), états vides (« Aucun produit / Aucune variante »), feedback de
chargement (spinner via `useFormStatus`). **Mais l'UI est utilitaire** : `<select>` bruts, création repliée dans
un `<details>`, et la fiche = **empilement de petits formulaires** plutôt qu'un éditeur structuré.

### 2.3 « L'UX est-elle SOTA 2026 ? » → **Non (≈ 4/10).** Écarts structurants en §3.6–3.7.

### 2.4 « Mes modifications sont-elles SOTA 2026 ? » → **Largement oui côté marque**, avec réserves explicites en §5.

---

## 3. Analyse détaillée

### 3.1 Complétude des champs (éditeur produit)
**Présent** : nom (FR/EN), slug, marque, fournisseur, catégorie (1 seule), description (FR), statut
(draft/active/archived), variantes (SKU, prix, actif, libellé d'option **texte libre**), stock (qté + seuil,
entrepôt par défaut), images (upload Storage + URL, alt FR, position).

**Manquant vs SOTA** (réf. Shopify/Medusa/Saleor/Akeneo) :
| Champ attendu 2026 | État | Source |
|---|---|---|
| **i18n complète** (nom/description **ES/DE**) | ❌ FR/EN seulement (storefront en 4 langues) | Akeneo : complétude **par (produit, locale, canal)** |
| **Prix barré / coût / marge / taxe** | ❌ absent | Shopify : price + compare-at + cost + profit/margin |
| **Matrice de variantes** (axes taille/couleur → combinaisons) | ❌ option = texte libre `{label}` | Shopify (≤3 options/2048 variantes) ; Medusa (génération) |
| **SKU + EAN/code-barres + poids/dimensions** par variante | ❌ SKU seul | Shopify/Medusa |
| **SEO** (meta title/description, slug dédié) | ❌ absent | Shopify : section "search engine listing" |
| **Tags / collections multiples** | ❌ une seule `category_id` | Shopify |
| **Multi-devise / multi-canal** par variante | ❌ EUR figé | Medusa/Saleor : prix par devise/canal |
| **Planification de publication, digital/physique** | ❌ absent | Shopify |
| **Compteur de complétude** (champs requis manquants) | ❌ absent | Akeneo |

→ **Complétude ≈ 4/10.** Le socle DB (`product_variants.option_values` JSONB, `inventory` multi-entrepôt) **permet**
ces champs ; c'est l'**UI d'édition** qui ne les expose pas.

### 3.2 Création produit (`admin/products/page.tsx` + `actions.ts:createProduct`)
- Formulaire dans un `<details>` : `name_fr` (requis), `name_en`, `slug`, `brand`, `supplier`, `status`.
- ✅ Inline error via `ActionForm` (`successMessage="Produit créé."`, `resetOnSuccess`). Slug auto (`slugify`),
  unicité gérée (`23505` → message clair), audit `product.create`, `requirePermission("products.write")`.
- ❌ **Pas de prix / variante / catégorie / description à la création** → produit **non vendable** d'emblée
  (la fiche affiche elle-même « un produit a besoin d'au moins une variante avec un prix »). Friction + risque
  d'oubli. SOTA : titre **+ prix** au minimum dans la création.

### 3.3 Variantes (`[id]/page.tsx` + `[id]/actions.ts`)
- ✅ Add/Update/Delete variante (SKU, prix→cents, actif), unicité SKU (`23505`), audit.
- ❌ **Pas de matrice** : `option` est un **texte libre** stocké en `option_values:{label}`. Pas d'axes
  structurés, pas de génération de combinaisons, pas de prix/stock/SKU/code-barres/image **par** combinaison,
  pas d'éditeur tableur (Medusa/Saleor) pour 10+ variantes.
- ❌ Pas de garde « produit `active` doit avoir ≥1 variante active en stock » → on peut publier un invendable.

### 3.4 Stock (`setInventory`)
- ✅ **Solide** : upsert sur `(variant_id, warehouse_id)`, calcul du **delta** + insertion `stock_movements`
  (`reason:'adjustment'`), audit `inventory.set`, seuil de réappro.
- ❌ Écrit **uniquement l'entrepôt par défaut** (le schéma est multi-entrepôt, l'UI ne le cible pas). Pas de
  vue « réservé / disponible » détaillée par entrepôt.

### 3.5 Images / médias (`addImage`, `uploadImage`, `deleteImage`)
- ✅ Upload **Supabase Storage** (service-role, type/MIME vérifié, 5 Mo, chemin `productId/uuid.ext`) **ou** par
  URL (alt FR + position), miniatures, suppression, audit.
- ❌ **Bug : `deleteImage` n'efface pas le fichier du bucket** (supprime la ligne DB seulement) → **fichiers
  orphelins** qui s'accumulent (`[id]/actions.ts:296-310`).
- ❌ **Bug : `uploadImage` force `position:0`** pour chaque upload (`:356`) → tous les fichiers uploadés en
  position 0 (ordre indéterminé), alors que l'ajout par URL utilise `images.length` (incohérent).
- ❌ Pas de **réordonnancement drag-and-drop** (WCAG 2.2 **SC 2.5.7** exige de toute façon une **alternative
  non-drag**), pas de **barre de progression** (juste un spinner), pas de multi-fichiers, pas d'édition de l'alt
  des images existantes, **alt FR uniquement** (WCAG 1.1.1 — Baymard : 55 % des sites ratent l'alt informatif).

### 3.6 Liste produits — recherche / tri / filtre / bulk (`page.tsx`)
- ✅ Pagination (25/page), 1ʳᵉ colonne = **nom cliquable** (bonne pratique NN/g), changement de statut inline.
- ❌ **Recherche par `slug` + `brand` seulement** (`page.tsx:57`) → **ne cherche pas le NOM** (`name_i18n` JSONB).
  Chercher un produit par son nom **échoue**. Findabilité dégradée.
- ❌ **Pas de tri** (figé `created_at desc`), **pas de filtre** statut/catégorie/stock, **pas de colonnes** prix /
  stock / miniature, **pas de bulk actions** (NN/g : « agir sur des enregistrements » via cases + select-all ;
  Shopify : éditeur en masse), **pas de vues sauvegardées**, pas de panneau latéral d'édition.

### 3.7 Modèle de sauvegarde & feedback d'erreur — **le plus gros écart UX**
- ❌ **Sauvegarde fragmentée** : la fiche = **≈12 `<form action={serverAction}>` indépendants** (infos, +1 par
  variante, +1 par stock, +1 par image, upload, URL…), chacun en **POST complet + `revalidatePath`** (rechargement
  serveur). **Un bouton "Enregistrer" par bloc**, pas de sauvegarde globale, **pas d'autosave**, **pas de garde
  "modifications non enregistrées"**. NN/g : pour des sections **interdépendantes** (variantes ↔ prix ↔ stock),
  préférer **une page sectionnée unique** à divulgation progressive.
- ❌ **Erreurs d'édition non inline** : `updateProduct`, `createVariant`, `setInventory`, `uploadImage`… **lèvent
  une exception** (`throw new Error`) → remontée à l'**error boundary = page d'erreur plein écran**. Seule la
  **création** (liste) utilise `ActionForm` (erreur inline). Donc un **SKU dupliqué en édition** ou un upload
  trop lourd ⇒ **crash de page**. NN/g : message **à côté du champ**, jamais un échec brutal.
- ❌ **Pas d'optimistic UI** (statut, stock = rechargements). ✅ Spinner de chargement présent (bon).

### 3.8 Sécurité / RBAC / audit — **point fort (8,5/10)**
- ✅ **Permissions granulaires** (`lib/permissions.ts` : `products.write`, …) + rôle admin/staff ;
  `requirePermission("products.write")` sur **chaque** mutation.
- ✅ **Audit systématique** (`logAudit`) : create/update/status/variant/inventory/image — traçabilité complète.
- ✅ **MFA step-up** (AAL2) en `admin/layout.tsx`, **service-role** isolée (upload Storage), Zod aux frontières,
  unicité slug/SKU gérée. C'est **au-dessus** de la moyenne des back-offices maison.

### 3.9 Accessibilité & mobile
- ✅ Labels présents (`Label`), `SubmitButton` désactivé/spinner, états vides.
- ❌ Sidebar admin **non repliable** sur mobile (`grid md:grid-cols-[240px_1fr]` → bloc nav empilé) ; multiples
  formulaires côte-à-côte qui **wrappent** mal sur petit écran. WCAG 2.2 : vérifier **cibles ≥ 24 px** (boutons
  `size="sm"`/icônes), **focus non masqué** (SC 2.4.11), **alternative au drag** (SC 2.5.7, si DnD ajouté).

---

## 4. Bugs & imprécisions concrets (à corriger en priorité)

1. 🔴 **Recherche produit ignore le nom** — `page.tsx:57` (`slug.ilike + brand.ilike`). Ajouter une recherche sur
   `name_i18n` (ex. RPC/`->>'fr' ilike`).
2. 🟠 **Fichier Storage non supprimé** à la suppression d'image — `deleteImage` (`[id]/actions.ts:296`). Appeler
   `storage.from(BUCKET).remove([path])` (gérer les images URL externes différemment).
3. 🟠 **Erreurs d'édition → page d'erreur** — `updateProduct`/`createVariant`/`setInventory`/… `throw`. Passer
   ces formulaires en `ActionForm` (retour `FormState` + message inline), comme la création.
4. 🟡 **`uploadImage` position figée à 0** (`:356`) → utiliser `count(images)` comme l'ajout par URL.
5. 🟡 **Publication sans variante vendable** — `updateProduct`/`setProductStatus` n'empêchent pas `status=active`
   sans variante active. Ajouter une garde (ou un avertissement).
6. 🟡 **Création sans prix** — ajouter un champ prix (création d'une 1ʳᵉ variante dans la foulée).

---

## 5. Mes modifications « site de marque » sont-elles SOTA 2026 ?

> Auto-évaluation honnête, mêmes sources que `docs/IDENTITE-MARQUE-HAMAREA-SOTA-2026.md`. **Périmètre = storefront/marque**, distinct de l'admin ci-dessus.

**SOTA-aligné (✅)** : home **passerelle** (hero = identité + proposition de valeur + 1 CTA, < 1 écran mobile) ·
**étendue de gamme** visible (univers : sacoche + 4 teasers, ≈ Baymard « montrer 40-50 % des types ») ·
**routeur best-seller** (spotlight → `/sacoche`) · imagerie **shoppable** · manifeste **en teaser** (profondeur
sur `/about`) · **waitlist RGPD** (1 champ e-mail, **case décochée**, lien confidentialité, consentement
journalisé) · **JSON-LD `Organization/OnlineStore`** · **hreflang + canonical par locale** · perf (AVIF, `priority`
LCP, `sizes`, `next/font`, `prefers-reduced-motion`) · **4 langues** · palette **WCAG** (variantes 600/700
text-safe) · logo réel recolorable (masque CSS) · footer avec **rétractation 14 j**.

**Réserves / pas encore SOTA (⚠️)** :
1. **Waitlist en single opt-in** : double opt-in (e-mail de confirmation) **non câblé** (`confirmed_at` reste null) →
   quasi-obligatoire en Allemagne. Et **migration `0014` non appliquée** (MCP non autorisé) → la capture n'enregistre
   réellement qu'après application + clés Supabase en prod.
2. **Communauté = images produit placeholder** (pas de vrai UGC) et **avis sacoche toujours fictifs** (risque
   Omnibus) — à brancher sur une vraie source avant de scaler la pub.
3. **Pas de wallets express / BNPL on-page** (Apple Pay +22,3 % — Stripe) ; checkout encore redirigé.
4. **Reveal au scroll** : `opacity:0` initial → si JS échoue, le contenu sous la ligne de flottaison est masqué
   (il **reste dans le DOM/SEO**, mais c'est une réserve d'amélioration progressive).
5. **Hero de marque** réutilise `/hero.jpg` (produit) — une **direction artistique dédiée** serait préférable.
6. **Pas de recherche** ni d'analytics/Consent Mode v2 sur la home (pré-existant).

→ **≈ 7,5/10** : le front de marque est proche de l'état de l'art ; les réserves sont surtout des **branchements
externes** (avis, double opt-in, wallets, migration) plus que des défauts de conception.

---

## 6. Backlog priorisé — admin produits

**P0 — corrections (faible coût, fort impact)**
1. Recherche par **nom** (#1) · 2. **Erreurs inline** via `ActionForm` sur l'édition (#3) · 3. **Suppression du
   fichier Storage** (#2) · 4. `position` upload (#4) · 5. Garde **publication sans variante** (#5).

**P1 — complétude éditeur**
6. **Prix à la création** (1ʳᵉ variante) · 7. **i18n ES/DE** (nom + description, onglets par langue) ·
8. **SEO** (meta title/description) · 9. **Compare-at / coût / marge** · 10. **Filtres + tri + colonnes**
   (statut/catégorie/stock, prix, miniature) sur la liste.

**P2 — UX SOTA & complétude avancée**
11. **Matrice de variantes** (axes → combinaisons, éditeur tableur) · 12. **Bulk actions / édition en masse** ·
13. **DnD images + alternative clavier (SC 2.5.7) + progression + alt i18n** · 14. **Page d'édition unifiée**
   (1 sauvegarde + garde "non enregistré") ou **optimistic UI** · 15. **Dupliquer un produit** ·
16. **Sidebar admin repliable** (mobile) · 17. (tendance) **IA** (génération description/alt/SEO), **⌘K**,
   **vues sauvegardées**, **densité**.

---

## 7. Sources
**Primaires / standards** — NN/g : [erreurs de formulaire](https://www.nngroup.com/articles/errors-forms-design-guidelines/) ·
[charge cognitive](https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/) ·
[data tables](https://www.nngroup.com/articles/data-tables/) ·
[progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) ·
[autosave vs save](https://www.nngroup.com/articles/efficiency-vs-expectations/). 
W3C — [Nouveautés WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) (SC 2.4.11, 2.5.7, 2.5.8, 3.3.7). 
Shopify — [Ajouter/MAJ produits](https://help.shopify.com/en/manual/products/add-update-products) ·
[édition en masse](https://help.shopify.com/en/manual/shopify-admin/productivity-tools/bulk-editing) ·
[Polaris IndexTable](https://polaris-react.shopify.com/components/tables/index-table). 
Medusa — [variantes](https://docs.medusajs.com/user-guide/products/variants) ·
[multi-région](https://docs.medusajs.com/resources/recipes/multi-region-store). 
Saleor — [produits](https://docs.saleor.io/docs/3.x/developer/products). 
Akeneo — [complétude](https://help.akeneo.com/serenity-take-the-power-over-your-products/187-serenity-follow-your-products-completeness) ·
[localisation](https://docs.akeneo.com/latest/technical_architecture/localization/index.html). 
Baymard — [alt informatif](https://baymard.com/blog/informational-image-accessibility). IBM Carbon — [loading](https://carbondesignsystem.com/patterns/loading-pattern/).
**Directionnel (tendances 2026, éditeurs)** : IA/⌘K/densité — UXPin, Think Design, AdminLTE (signaux, non normatifs).

---

## 8. Addendum — corrections appliquées (2026-06-03)

> Suite à cet audit, le module a été repris. **Aucune nouvelle migration produit n'était nécessaire** : le
> schéma `0003_catalog.sql` exposait déjà `products.seo`, `products.search` (tsvector + trigger), et sur
> `product_variants` `compare_at_price_cents` / `cost_cents` / `barcode` / `weight_g` / `dimensions` — c'était
> un **trou d'UI**, pas de schéma. Les champs sont désormais **exposés et persistés**.

**Données & persistance**
- ✅ Toutes les mutations renvoient un **`FormState` (succès/erreur inline)** via `ActionForm` ; fini la remontée
  d'exception à l'error boundary. Les actions « best-effort » (suppression, réordonnancement, statut, bulk,
  duplication) **n'émettent plus d'exception** (catch interne + `revalidatePath`).
- ✅ Écritures alignées sur les colonnes réelles (`name_i18n`, `description_i18n`, `seo`, variantes riches,
  `inventory` upsert + `stock_movements`). RLS admin/staff (0003) inchangée.

**P0**
- ✅ Recherche **par nom** (`name_i18n->>fr/en`) + slug + marque · **filtre statut** · colonnes **prix / stock /
  miniature** · **sélection + actions en masse** (statut) — `ProductsTable` (client).
- ✅ **Suppression d'image** : efface aussi le **fichier Storage** (si dans le bucket) · upload en **`max(position)+1`**.
- ✅ **Garde de publication** : `status=active` refusé sans variante active (création ET édition).
- ✅ **Prix à la création** : crée la **1ʳᵉ variante** → produit vendable d'emblée.

**P1**
- ✅ **i18n FR/EN/ES/DE** du nom + description via **onglets de langue** (`LangTabs`) dans un seul formulaire.
- ✅ **SEO** (titre ≤ 70 / description ≤ 320) par langue, **stocké dans `products.seo`** et **utilisé** par la
  fiche storefront (`/products/[slug]` → `generateMetadata` : title/description/canonical/OG).
- ✅ Variantes : **prix barré / coût / code-barres / poids / option structurée** (`{Taille:"M"}` au lieu du label libre).

**P2**
- ✅ **Réordonnancement d'images** (boutons ↑/↓ — alternative clavier conforme **WCAG 2.5.7**, sans drag) + alt FR/EN.
- ✅ **Dupliquer un produit** (clone variantes + images, brouillon, nouveaux SKU/slug).
- ✅ **Actions en masse** (statut) sur sélection · **sidebar admin repliable** (mobile).
- ✅ **Matrice de variantes** (`generateVariants`) : génération auto des combinaisons (≤ 3 axes, ≤ 100), SKU
  dérivés + uniques, **combinaisons déjà présentes ignorées** (pas de doublon).
- ✅ **Garde « modifications non enregistrées »** sur le formulaire Contenu (beforeunload).
- ✅ **Palette de commandes ⌘K** (`CommandPalette`) — navigation entre sections + actions rapides au clavier
  (tendance admin 2026), montée dans le layout admin.
- ✅ **Multi-entrepôt** : affichage du stock **par entrepôt** + sélecteur d'entrepôt dans le formulaire de stock ;
  `setInventory` cible l'entrepôt choisi (défaut sinon). Schéma `warehouses`/`inventory` existant, sans migration.

**Reste (volontairement non livré)**
- ☐ **Éditeur tableur** de la matrice (copier/coller cellule) + **page d'édition unifiée** (1 seule sauvegarde) /
  **optimistic UI** — la sauvegarde reste **par bloc** (fiable, erreurs inline) ; le garde « non enregistré »
  couvre déjà le bloc Contenu.
- ☐ **Tags/collections** *(nécessite une petite migration — applicable seulement avec un token)* · **IA**
  (génération description/alt/SEO, nécessite une clé LLM) · **vues sauvegardées** de la liste.
- ⚠️ **Migration `0014_waitlist.sql`** (issue du chantier marque) **à appliquer** avec un `SUPABASE_ACCESS_TOKEN`
  (`supabase db push` ou MCP authentifié) — non applicable depuis cet environnement.
