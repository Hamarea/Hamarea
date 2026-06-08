# Hamarea — Rapport d'audit du back-office admin (juin 2026)

> Audit complet du **compte admin** : gestion produit (ajout, description, photos,
> infos essentielles), données stockées, gestion live de la vitrine. Vu à travers
> le prisme **« utilisateur lambda »** (gérant non-technique) + **points forts /
> points faibles à optimiser**.
> Périmètre : `src/app/[locale]/admin/**` (12 modules) + actions serveur + modèle de données.

---

## 0. Résumé exécutif

Le back-office est **fonctionnellement riche et bien sécurisé** : 12 modules, fiche
produit très complète (multilingue, variantes, stock multi-entrepôt, photos, SEO),
RBAC fin, journal d'audit. **Mais** il souffre de **friction UX pour un gérant
non-technique** : du jargon non expliqué (SKU, prix barré, coût, code-barres),
quelques écrans en lecture seule là où on attend de l'édition (Stock), des résidus
techniques (centimes, SQL brut, JSON brut), et une **réflexion sur la vitrine** non
garantie en live.

**Corrigé dans cette passe** (suite à ton retour) :
- ✅ **Suppression de produit** (n'existait pas) — zone de danger sur la fiche.
- ✅ **Création → fiche complète** : créer un produit **redirige** désormais vers sa
  fiche pour ajouter description/photos/variantes/stock (avant, on restait sur la
  liste et on ne « voyait » jamais le formulaire complet).

| Axe | Note /10 | Commentaire |
|---|---|---|
| Couverture fonctionnelle | 8 | Presque tout est là |
| Simplicité (gérant lambda) | 5 | Jargon, écrans techniques, pas de mode guidé |
| Gestion produit | 7,5 | Très complète, mais dense et peu guidée |
| Données / intégrité | 9 | Centimes, i18n JSONB, snapshots commande |
| Sécurité / audit | 8,5 | RLS + RBAC + audit + MFA |
| Gestion live vitrine | 6 | Réflexion non garantie (revalidation publique absente) |

---

## 1. Cartographie du back-office (12 modules)

| Module | Rôle | État | Pour un lambda |
|---|---|---|---|
| **Dashboard** | KPIs (CA, panier moyen, commandes, nouveaux comptes, stock bas), top produits, statuts, activité, export CSV | ✅ Solide | 🟢 Clair |
| **Produits** (liste) | Liste (photo, prix, stock, statut inline), recherche, filtre, vues sauvegardées, actions groupées, pagination | ✅ Solide | 🟡 OK |
| **Produit** (fiche) | Contenu+SEO ×4 langues, variantes (prix/coût/code-barres/poids/options), **stock multi-entrepôt**, images (upload/URL/ordre/couleur), matrice de variantes, dupliquer, **supprimer** | ✅ Très complet | 🔴 Dense / jargon |
| **Stock** | Tableau (qté, réservé, seuil, alerte) | ⚠️ **Lecture seule** | 🔴 On ne peut pas éditer ici |
| **Commandes** | Liste + recherche/filtre/CSV ; détail (statut, expédition, remboursement) | ✅ Solide | 🟢 Clair |
| **Paiements** | Liste lecture seule (alimentée par le webhook) | ✅ OK | 🟢 Clair |
| **Clients** | En réalité **gestion des rôles & permissions** (équipe) | ⚠️ Mal nommé | 🔴 Pas la vue « mes clients » |
| **Coupons** | Créer (%, fixe, date limite, quota), activer/désactiver | ✅ OK | 🟡 Pas d'édition/suppression |
| **Avis** | Hub (compteurs par statut → modération) | ✅ OK | 🟢 Clair |
| **Modération** | Approuver/rejeter/réouvrir, note interne, signalements | ✅ Solide | 🟡 Pas de confirmation |
| **Fournisseurs** | Créer / lister / supprimer | ⚠️ Pas d'édition | 🟡 Manque infos dropshipping |
| **Audit** | 200 dernières actions sensibles | ✅ OK | 🔴 JSON brut, anglais |

---

## 2. Gestion produit en détail (le cœur de la demande)

### 2.1 Parcours « ajouter un produit » (après correction)
1. **Produits → « Nouveau produit »** : nom, prix, visibilité, précommande *(volontairement court)*.
2. **→ redirige vers la fiche** *(nouveau)* pour tout compléter :
   - **Contenu & SEO** : nom + description + SEO **par langue** (FR/EN/ES/DE), traduction auto si DeepL configuré.
   - **Variantes & prix** : SKU, prix, prix barré, coût, code-barres, poids, option (Taille/Couleur), actif ; **stock par entrepôt** ; suppression ; **génération de matrice** (Taille×Couleur).
   - **Images** : téléversement (Supabase Storage), ou par URL, réordonnancement, suppression, **liaison à une couleur**.
   - **Dupliquer / Supprimer**.
3. **Passer en « Active »** → visible en boutique (garde : au moins une variante active avec prix).

### 2.2 Ce qui est bien (à conserver)
- **Multilingue natif** + auto-traduction : le gérant tape une fois, les 4 langues sont remplies.
- **Photos liées aux couleurs** : UX avancée, rare à ce niveau.
- **Stock multi-entrepôt** + journal des mouvements + seuil d'alerte.
- **Snapshots de commande** : supprimer un produit ne casse pas l'historique des ventes.

### 2.3 Ce qui bloque un gérant lambda (à optimiser)
- 🔴 **Jargon non expliqué** : « SKU », « prix barré », « coût », « code-barres », « option/valeur », « entrepôt ». → **tooltips/aides** + libellés parlants (« SKU = ta référence interne », « Prix barré = ancien prix affiché rayé »).
- 🔴 **Densité** : la fiche montre tout d'un coup. → **mode simple** (Nom, Photo, Prix, Stock, Description) repliant l'avancé (variantes/SEO/code-barres).
- 🟡 **Champ description** : un seul `textarea` brut (pas de mise en forme). → éditeur léger ou puces guidées.
- 🟡 **Pas d'aperçu** « voici la fiche côté client » depuis l'admin.
- 🟡 **Dimensions** existent en base mais **aucun champ** dans l'UI (utile pour l'expédition).
- 🟡 **Marge** non affichée alors que `coût` et `prix` sont saisis (prix − coût = marge : clé en dropshipping).

---

## 3. Données stockées (où / quoi)

28 tables Postgres (Supabase). Pour le produit, la donnée vit dans :
- **`products`** (slug, `name_i18n`/`description_i18n` JSONB, `seo`, statut, `preorder`, marque, catégorie, fournisseur, recherche plein-texte).
- **`product_variants`** (l'unité **vendable** : SKU, `price_cents`, `compare_at_price_cents`, `cost_cents`, code-barres, poids, `dimensions`, options).
- **`product_images`** (chemin Storage, liaison variante, ordre).
- **`inventory`** (stock par variante×entrepôt) + **`stock_movements`** (journal audité).
Conventions clés : **argent en centimes entiers**, **contenu multilingue en JSONB**,
RLS sur tout. (Détail complet : skill `.claude/skills/hamarea-backend`.)

---

## 4. Gestion live de la vitrine (admin → site)

| Action admin | Reflet sur la vitrine |
|---|---|
| Statut produit `active`/`draft`/`archived` | ✅ contrôle la visibilité (RLS `status='active'`) |
| Fiche produit `/products/[slug]` | ✅ route **dynamique** → à jour à chaque visite |
| **Liste catalogue `/products`** | ⚠️ les actions revalident `/admin/*` **mais pas** les routes **publiques** → selon le cache, la liste peut être **en léger différé** |
| Landing `/sacoche` | ⚠️ contenu **statique** (`lib/product.ts`), **indépendant** de la DB |

➡️ **À optimiser** : après chaque modif produit, **revalider explicitement les chemins
publics** (`/products`, `/[locale]/products`, `/products/[slug]`, `/sacoche` si DB)
ou utiliser la **revalidation par tag**, pour une réflexion **live garantie**.
Aujourd'hui seules les pages admin sont revalidées.

---

## 5. Points forts (à conserver)

1. **Couverture quasi complète** d'un back-office e-commerce (12 modules).
2. **Fiche produit très riche** (multilingue, variantes, stock multi-entrepôt, photos liées couleur, matrice, duplication).
3. **Sécurité** : RLS partout, **RBAC fin** (permissions par staff), anti-escalade de privilèges, **journal d'audit**, MFA step-up admin.
4. **Intégrité des données** : centimes entiers, i18n JSONB, **snapshots de commande** (historique préservé).
5. **Dashboard** actionnable (CA, panier moyen, **stock bas**, top produits).
6. **Commandes** complètes (recherche, filtres, CSV, détail, remboursement).

---

## 6. Points faibles à optimiser (priorisés)

### 🔴 P0 — Friction majeure / incomplétude
| # | Constat | Optimisation |
|---|---|---|
| ✅ | ~~Pas de suppression produit~~ | **Fait** (zone de danger) |
| ✅ | ~~Création ne mène pas à la fiche~~ | **Fait** (redirection) |
| P0.1 | **Stock en lecture seule** (`stock/page.tsx`) — éditer le stock oblige à ouvrir chaque produit | Rendre le stock **éditable en ligne** depuis la page Stock (réutiliser `setInventory`) + filtre « stock bas » |
| P0.2 | **Jargon produit** non expliqué (SKU, prix barré, coût, code-barres) | **Tooltips/aides** + libellés parlants + **mode simple/avancé** |
| P0.3 | **Réglages en centimes** + **SQL brut** pour le 1er admin | Saisie **en euros**, retirer le SQL de l'UI (doc à part) |

### 🟠 P1 — Clarté / complétude
| # | Constat | Optimisation |
|---|---|---|
| P1.1 | **« Clients » = gestion des rôles** ; pas de vraie **fiche client** (historique d'achats) | Scinder : **« Équipe & accès »** (rôles) vs **« Clients »** (liste + commandes par client) |
| P1.2 | **Vitrine non revalidée** après modif produit | `revalidatePath` des routes publiques (ou tags) |
| P1.3 | **Fournisseurs** : pas d'édition, manque URL produit / délai / coût (dropshipping), ISO2 sans aide | Édition + champs dropshipping + sélecteur pays |
| P1.4 | **Coupons** : pas d'édition ni suppression (toggle seul) | Éditer / supprimer un coupon |
| P1.5 | **Modération** : actions sans confirmation | Confirmation avant rejet/approbation |
| P1.6 | **Audit** : JSON brut, codes anglais, pas de filtre/recherche/export | Rendu lisible + filtres + export |

### 🟡 P2 — Confort / scalabilité
- Dashboard : **graphiques/tendances** + sélecteur de période.
- **Exports CSV** manquants (avis, audit, clients, stock).
- Réglages : **logo / couleurs / branding**, devises, TVA, config des intégrations en UI.
- Champ **dimensions** (UI) + affichage **marge** (prix − coût).
- Pagination/recherche sur **Stock** et **Fournisseurs**.
- **Aperçu produit** côté client depuis l'admin.

---

## 7. Plan d'optimisation conseillé (orienté « gérant lambda »)

```
P0  Stock éditable en ligne  →  Tooltips + mode simple fiche produit  →  Réglages en €
P1  Vue « Clients » réelle (+ renommer rôles)  →  revalidation vitrine  →  édition coupons/fournisseurs
P2  Marge & dimensions  →  exports CSV  →  branding/réglages  →  graphiques dashboard
```

**Quick wins** (fort impact, faible effort) : P0.1 (stock éditable), P0.2 (tooltips + libellés), P1.2 (revalidation vitrine), P1.4 (supprimer un coupon).

---

## 8. Livré dans cette passe
- **`deleteProduct`** : suppression définitive (variantes/stock/images en cascade, fichiers Storage purgés, commandes conservées) via une **zone de danger** à deux étapes sur la fiche.
- **Création → fiche** : `createProduct` redirige vers `/admin/products/[id]` pour compléter le produit.
- Vérifié : `typecheck` + `lint` + `build` (146 pages) + 20 tests, verts.

*Rapport établi le 2026-06-08.*
