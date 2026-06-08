# Recherche SOTA — Admin Hamarea (produits · stock · modération)

**Principe directeur : « 1 écran = 1 tâche · action en 1‑2 clics · zéro jargon de codeur. »**
On garde la palette océan ; on applique des *patterns* SOTA simples et épurés
(design « flat », transitions 150‑200 ms, pastilles de statut, filtres en chips).

## 0. Fondations transversales
| Pattern | Règle | Bénéfice |
|---|---|---|
| Inline edit | Modifier statut/prix/stock dans la ligne | −80 % de clics |
| Optimistic + Undo | MAJ avant réponse serveur + toast « Annuler » 5 s | Rapidité ressentie |
| Bulk actions | Cases à cocher → barre d'actions | Traiter en masse |
| Empty states | Message + bouton, jamais d'écran vide | Guidage |
| Confirm destructif + couleur sémantique | Rouge = suppression, confirmation | Zéro accident |
| Responsive table→cartes | Tableau desktop, cartes < 768 px | Gérable au téléphone |
| Filtres en chips | Segments cliquables (Tous / En ligne / Stock bas…) | Filtrer en 1 tap |

## 1. Produits (liste)
- Data‑table dense, **statut/prix/stock éditables sur place**.
- Ligne : vignette · nom+slug · pastille statut · prix · badge stock (rouge si bas) · menu ⋯ (Éditer · Dupliquer · Supprimer).
- **Filtres chips** : Tous · En ligne · Brouillon · Archivé · (Précommande).
- Recherche instantanée + ⌘K (déjà là). Mobile = cartes.

## 2. Enregistrer un produit (création éclair)
- 3 champs visibles : Nom* · Prix · Photo (glisser‑déposer + aperçu). Reste optionnel en dessous.
- Toggle « Mettre en ligne » bien visible. Auto : slug, SKU, traductions, 1ʳᵉ variante.
- « Créer » → apparaît aussitôt dans la liste (optimistic) + ouvre la fiche complète.

## 3. Stock
- Vue dédiée : variante · stepper −/+ (ou saisie) · seuil · entrepôt.
- **Filtres chips** : Tous · Stock bas · Rupture (tri par dispo croissante).
- Réglage rapide → toast « MAJ · Annuler ». Historique des mouvements (table `stock_movements`).
- Couleurs : vert (ok) · ambre (bas) · rouge (rupture).

## 4. Modération (avis)
- File type « boîte de réception » : 1 carte/avis (note ★, texte, produit, auteur).
- 2 gros boutons Approuver ✓ / Rejeter ✕ (raccourcis A/R, swipe mobile), motif optionnel.
- Onglets : En attente (défaut) · Signalés · Rejetés · Approuvés + compteurs.
- Bulk approuver/rejeter, optimistic + undo, empty state.
- Bonus : pré‑signalement IA spam/toxicité.

## 🧱 Composants réutilisables
`FilterChips` · `StatusPill` (Badge) · `InlineNumber` (stepper) · `BulkBar` ·
`Toast`+`useUndo` (sonner) · `ConfirmButton`/`DeleteProductForm` · `DropZone` ·
`ModerationCard`.

## 🗺️ Suivi de mise en œuvre
| Phase | Contenu | État |
|---|---|---|
| 1 — Quick wins | Filtres chips (produits + stock), pastilles/couleurs stock, suppression liste, statut visible fiche, empty states | ✅ en cours |
| 2 — Stock | Steppers +/−, historique mouvements, réappro en lot | ⏳ |
| 3 — Infra client | Toasts + Undo (sonner), menu ⋯ (radix dropdown), glisser‑déposer photo | ⏳ |
| 4 — Modération + | Compteurs onglets, raccourcis clavier, bulk | ⏳ (base déjà SOTA) |
| 5 — Bonus | Import CSV produits/stock, pré‑modération IA | ⏳ |

> Note : la modération est déjà bien avancée (onglets, actions avec confirmation
> et chargement, notes, signalements, empty states). Les produits, la création,
> les catégories et le stock disposent déjà de l'édition inline et des actions
> de base ; cette feuille de route les amène au niveau SOTA « épuré ».
