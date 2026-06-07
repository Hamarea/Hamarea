# Hamarea — Rapport UI/UX admin & système produits (juin 2026)

> Centré sur la gestion produit (création, variantes couleurs, photos liées) +
> état général de l'UI/UX admin. Inclut le constat clé et un plan « propre ».

---

## 1. Création de produit — ✅ simplifiée (fait)
**Avant** : 8 champs avec du jargon (Nom FR, Nom EN, Slug, SKU, Marque, Fournisseur, Statut…).
**Maintenant** : **3 champs** — **Nom**, **Prix (€)**, **Visibilité** (Brouillon / En ligne).
- Le **lien (slug)** et la **référence (SKU)** sont générés automatiquement (cachés).
- **Traduction automatique** EN/ES/DE du nom (DeepL si `DEEPL_API_KEY`, sinon recopie).
- Marque, fournisseur, variantes, images, description, SEO → sur la **fiche produit** (avancé).

> Résultat : ajout « simple et rapide », sans terme incompris. ✅

---

## 2. Variantes / couleurs / photos — l'état réel

### 2.1 Ce qui est DÉJÀ excellent (schéma)
- `product_variants.option_values` (JSONB) → stocke la **couleur** (`{"color":"Rose"}`), + prix, SKU, stock.
- `product_images.variant_id` → **une photo PEUT être rattachée à une variante (couleur)**. ✅
- La fiche produit a déjà : **génération de variantes** (matrice), **upload d'images**, prix/stock multi‑entrepôt.

→ **La fondation pour « variantes couleurs + photos liées » existe.** Rien à recréer côté base.

### 2.2 Les 2 manques (le « digne de Harvard »)
1. **🟠 Le lien photo ↔ couleur n'est pas exposé dans l'UI.** Le formulaire d'upload d'image
   n'a **pas** de sélecteur « pour quelle couleur ? » → les photos sont rattachées au produit,
   pas à une couleur précise. La colonne `variant_id` existe mais n'est jamais renseignée.
2. **🔴 La page « sacoche » en ligne est codée en dur** (`src/lib/product.ts` : `SACOCHE.colors[]`
   avec `imageUrl` par couleur), **découplée de la base.** Donc créer/éditer le produit dans
   l'admin **ne change pas** encore la page vitrine. La sacoche « 3 couleurs » vit dans le code,
   pas dans `products`/`product_variants`.

---

## 3. État général UI/UX admin
- **Bon** : sidebar claire, palette de commandes ⌘K, tables responsives, feedback de chargement,
  garde « modifications non enregistrées », vues sauvegardées, audit, RBAC fin.
- **À surveiller** : encore un peu de vocabulaire technique sur la fiche produit (option_values,
  position…) ; cohérence des libellés ; lien photo↔couleur (cf. §2.2).

---

## 4. Plan « logique Harvard » pour variantes couleurs + photos

### Phase A — Lier les photos aux couleurs dans l'admin *(contenu, rapide)*
- Ajouter un **sélecteur « Couleur / variante »** au formulaire d'upload + d'ajout d'image
  (liste les variantes du produit) → renseigne `product_images.variant_id`.
- Afficher les photos **groupées par couleur** (galerie par variante) + une zone « photos générales ».
- Résultat : on téléverse une photo et on dit « c'est la Rose » en un clic.

### Phase B — Modèle couleur propre *(structurant)*
- Normaliser la couleur dans `option_values.color` + un **swatch** (code hex) par variante,
  pour un picker couleur visuel (pastilles) côté admin ET vitrine.

### Phase C — Brancher la vitrine sur la base *(le vrai sujet de fond)*
- Faire lire la page produit/sacoche depuis `products` + `product_variants` + `product_images`
  (au lieu du `SACOCHE` en dur) → quand tu changes une couleur/photo/prix dans l'admin, la
  boutique se met à jour **toute seule**. Migrer la sacoche actuelle (3 couleurs) en base.
- Galerie vitrine **filtrée par couleur sélectionnée** (photos de la variante choisie).

### Phase D — Finitions
- Réordonnancement drag‑and‑drop des photos, alt automatique (multilingue), recadrage,
  variante « par défaut », badge stock par couleur.

---

## 5. Reste à faire (rappel des phases précédentes)
- 🔴 (fait par toi ✅) migration `0015` → admin débloqué.
- 🚀 Déployer le code récent (`git pull` + `vercel --prod`).
- 💳 Clé **publishable Stripe** absente du build → la remettre + redéployer.
- 🌍 (optionnel) `DEEPL_API_KEY` dans Vercel → traduction produit réelle (sinon recopie).

---

## 6. Ma reco d'ordre
1. **Déployer** le récent (form simplifié + auto‑traduction).
2. **Phase A** (photos liées aux couleurs) — je peux la coder maintenant.
3. **Phase C** (vitrine ← base) — le chantier de fond pour que l'admin pilote vraiment la boutique.

*Rapport établi le 2026-06-05.*
