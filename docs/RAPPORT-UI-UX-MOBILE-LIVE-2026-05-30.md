# Rapport UI/UX & Responsive Mobile — site **live** `hamarea-shop.com`

> Analyse complète de l'expérience telle qu'elle est **réellement servie en production**
> le 2026-05-30, avec focus **UI/UX** et **responsive mobile**.
> Ce rapport est **complémentaire** des deux audits déjà présents :
> - `docs/AUDIT-SOTA-2026.md` — sécurité / paiement / conformité UE / perf / SEO.
> - `docs/UI-UX-PAGE-PRINCIPALE-SOTA-2026.md` — ergonomie / persuasion / parcours d'achat.
>
> Il **ne les répète pas** : il se concentre sur (1) l'écart entre la prod et le code corrigé,
> (2) un scoring UI/UX du rendu live, (3) une **matrice responsive breakpoint-par-breakpoint**,
> (4) l'**accessibilité mesurée**, (5) un backlog priorisé consolidé.
>
> Périmètre : page d'accueil mono-produit (« Sacoche Étanche Hamarea »). URL : https://www.hamarea-shop.com/

---

## 0. Résumé exécutif

Hamarea est une **landing mono-produit éditoriale et soignée** : hero plein écran, typo
display (Fraunces) + Inter, palette premium (bleu nuit / sauge / terre, fond crème
`#faf7f2`), séquence de persuasion complète (preuve → USP → démo vidéo → offre → avis →
FAQ), barre d'achat sticky. Le niveau de finition est **au-dessus de la moyenne du
dropshipping**.

**Constat n°1 — la prod est en retard sur le code.** Le site **en ligne** affiche une
version **antérieure aux corrections** déjà présentes dans ce dépôt. Plusieurs
problèmes visibles sur `hamarea-shop.com` aujourd'hui sont **déjà corrigés dans la
branche** mais **non déployés** (voir §1). C'est l'action à plus fort impact et à coût
quasi nul : **redéployer**.

**Constat n°2 — l'ossature responsive est saine, mais il reste 5 défauts mobiles
concrets** : barre sticky sans *safe-area* (iPhone à encoche), cibles tactiles < 44 px,
tableau comparatif à l'étroit < 360 px, hero potentiellement plus haut que l'écran sur
petits téléphones, et vidéos lourdes en autoplay (data mobile).

**Constat n°3 — accessibilité : bon socle, trous précis.** `prefers-reduced-motion`,
`:focus-visible`, ARIA sur l'accordéon et les swatches sont en place. Manquent : **piège
de focus** dans le drawer panier, **lien d'évitement**, **contraste** du micro-texte
(9–11 px) et du texte translucide sur photo.

### Scorecard (rendu live)

| Axe | Score /10 | Synthèse |
|---|---|---|
| Système visuel (typo / couleur / rythme) | 8,5 | identité forte, cohérente, différenciante |
| Hiérarchie & above-the-fold | 7 | dense et clair ; hero « texte sur photo » à challenger |
| Clarté du parcours d'achat | 6,5 | sticky OK ; **prod sans mini-cart** (corrigé en branche) |
| **Responsive mobile** | **6,5** | grilles saines, mais safe-area / targets / tableau |
| Accessibilité (WCAG 2.2) | 6 | reduced-motion + focus-visible OK ; focus-trap / contraste |
| Performance perçue (CWV) | 7 | hero LCP unique AVIF ; reels lourds sans poster |
| Cohérence du contenu | 5,5 | **prod** : coquille « Clipper », −30 %/−38 %, 79 € (corrigés en branche) |
| **Global** | **6,8** | excellent socle ; le live ne reflète pas encore les correctifs |

---

## 1. 🔴 Écart prod ↔ code (le correctif le plus rentable)

Le site **live** correspond à l'état **avant** la passe de corrections documentée dans
`AUDIT-SOTA-2026.md` §9. Le code de la branche courante corrige déjà la plupart de ces
points — ils restent visibles **uniquement parce que la prod n'a pas été redéployée**.

| Élément | **Live `hamarea-shop.com`** (observé) | **Code branche** (déjà corrigé) | Réf. |
|---|---|---|---|
| Bandeau promo | « −30 % jusqu'à dimanche · Livraison offerte dès **79 €** » | « 🌊 Livraison offerte dès **39 €** · Retours 30j · Garantie 2 ans » | `layout.tsx:37` |
| Faux compte à rebours | présent (« jusqu'à dimanche ») | supprimé (bannière honnête) | AUDIT E3 |
| Seuil port offert | **79 €** (inatteignable pour un produit à 24,90 €) | **39 €** (atteint dès le pack ×2) | `product.ts:211` |
| H1 hero | « **FILMEZ. CLIPPER. PLONGEZ.** » (coquille « Clipper ») | « Filmez sous l'eau. / Ressortez au sec. » | `page.tsx:100` |
| Header | nav chargée + « Trouver une boutique » + recherche | nav épurée (La sacoche · Avis · FAQ · À propos) | `header.tsx:13` |
| Couleurs | « Édition limitée » sur les 3 (fausse rareté) | « En stock » | `colors-showcase.tsx:45` |
| Histoire de remise | −38 % (barré) **vs** −30 % (bannière) | bannière neutralisée | AUDIT E15 |
| Mini-cart | absent (l'ajout renvoie vers `/cart`) | **drawer slide-in** + barre port offert | `cart-drawer.tsx` |
| « Acheter maintenant » | absent | présent (achat direct) | `buy-box.tsx:197` |
| Sécurité prix checkout | prix **fourni par le client** (falsifiable → 0,01 €) | recalculé **serveur** | AUDIT E1 |

> **Action P0 :** redéployer la prod depuis la branche corrigée. À elle seule, cette
> étape supprime ~10 défauts UX **et** la faille de falsification de prix. Tant que ce
> n'est pas fait, l'audit du live « voit » des problèmes **déjà résolus en code**.

Le reste de ce rapport décrit l'expérience **live actuelle** (ce que voit l'utilisateur),
en signalant `↳ déjà corrigé en branche` quand c'est le cas.

---

## 2. Structure de la page (ordre des blocs)

```
[Bandeau promo] → [Header sticky, transparent sur le hero]
1.  HERO plein écran (image produit en fond + carte d'achat « BuyBox »)
2.  TrustBar          — 4 réassurances (livraison / garantie / retour / paiement)
3.  PressBar          — marquee « ils en parlent » (logos en texte)
4.  UspGrid           — 4 atouts (IPX8 / tactile / universel / flotte)
5.  HowItWorks        — 3 étapes numérotées
6.  VideoReel         — 3 reels verticaux 9:16 (autoplay en vue)
7.  ColorsShowcase    — 3 couleurs (rose / noir / blanc)
8.  Comparison        — tableau « Hamarea vs sacoche classique »
9.  BundlePicker      — packs 1 / 2 / 3 (decoy/anchoring) ← moment d'offre
10. Testimonials      — 4 avis (« achat vérifié »)
11. FAQ               — accordéon (8 questions)
12. CTA de clôture    — « Je commande la mienne »
[StickyBuyBar]        — apparaît après ~600 px de scroll (zone du pouce)
[Footer]              — 4 colonnes (boutique / compte / légal) + mentions
```

**Flux** : séquence de persuasion classique et pertinente (problème → preuve → démo →
offre → réassurance). Deux faiblesses de *rythme* (déjà notées dans le doc UI/UX) :
la **preuve sociale forte arrive tard** (bloc 10), et **aucun rappel d'achat inline**
entre le hero et l'offre (sauf la sticky bar). Voir `UI-UX-PAGE-PRINCIPALE-SOTA-2026.md`
§4 pour la reco d'ordre « conversion-first ».

---

## 3. UI / système visuel

**Forces (à conserver) :**
- **Typographie** : Fraunces (display serif) + Inter (texte), auto-hébergées via
  `next/font`. Identité éditoriale qui sort du dropshipping générique. ✅
- **Couleur** : design tokens centralisés (`globals.css`), palette navy/sauge/terre +
  fond crème `#faf7f2`. Cohérente, premium. ✅
- **Rythme** : sections `py-16/20`, conteneur `max-w-7xl`, gouttières `px-4 sm:px-6
  lg:px-8`. Aéré et régulier. ✅
- **Iconographie** : Lucide, cohérente. **Micro-interactions** : hover-lift sur cartes,
  feedback « Ajouté ! », barre de progression de lecture. ✅
- **Imagerie** : `next/image` AVIF→WebP, hero unique en `priority` (bon pour le LCP). ✅

**Points d'attention UI :**
- Le badge promo rouge utilise `--color-danger #b23a48` (rouge sourd) là où le code
  attend par endroits un `#dc2626` plus vif (fallback jamais utilisé car la variable est
  définie) → intention visuelle légèrement incohérente. Cosmétique.
- L'accent du hero (« Ressortez au sec » / « Plongez ») en teinte claire sur photo
  sombre : **lisibilité dépendante de l'image** (voir §5 contraste).
- **Pas de mode sombre** (`color-scheme: light`) — acceptable pour la marque, à noter.

---

## 4. 📱 Responsive mobile — matrice détaillée

Breakpoints Tailwind : `sm 640` · `md 768` · `lg 1024` · `xl 1280`. Mobile ≈ 70 % du
trafic dropshipping : c'est l'écran de référence.

### 4.1 Comportement par section

| Section | < 640 (mobile) | 640–1023 (tablette) | ≥ 1024 (desktop) | Verdict |
|---|---|---|---|---|
| Header | logo + icônes + **burger** (`md:hidden`) | idem | nav inline (`md:flex`) | ✅ |
| Hero | 1 colonne, carte d'achat sous le titre, image en fond `100svh` | idem | grille 12 col, colonne droite vide (photo = fond) | ⚠️ hauteur (§4.2) |
| TrustBar | 1 col | 2 col (`sm:grid-cols-2`) | 4 col | ✅ |
| UspGrid | 1 col | 2 col | 4 col | ✅ |
| HowItWorks | 1 col | **1 col** (saute à 3 en `md`) | 3 col | ◐ saut 1→3 |
| VideoReel | **carrousel** horizontal snap (`w-[78vw]`) | `60vw` | grille 3 col | ✅ bon pattern |
| ColorsShowcase | 1 col | **1 col** (3 en `md`) | 3 col | ◐ saut 1→3 |
| Comparison | tableau `text-xs`, **pas de scroll-x** | `text-sm` | idem | ⚠️ étroit < 360 px |
| BundlePicker | 1 col, couleur+CTA empilés | `sm:flex-row` | 3 col | ✅ |
| Testimonials | 1 col | 2 col | 4 col | ✅ |
| Footer | 1 col empilée | idem | 4 col (`md:grid-cols-4`) | ✅ |
| StickyBuyBar | swatches + prix (nom masqué `<sm`) | + nom | + nom | ⚠️ safe-area (§4.2) |
| CartDrawer | **plein écran** (`w-full`) puis `max-w-md` | panneau 448 px | idem | ✅ |

### 4.2 Défauts responsive concrets (priorisés)

**M1 — `StickyBuyBar` sans *safe-area* (iPhone à encoche).** La barre est
`fixed inset-x-0 bottom-0` sans `padding-bottom: env(safe-area-inset-bottom)`
(`sticky-buy-bar.tsx:45`). Sur iPhone X→16, le bouton « Ajouter » passe **sous le *home
indicator*** → cible amputée. De plus, **le contenu de page n'a pas de padding bas
compensatoire** : une fois la barre visible, elle **recouvre les ~64 derniers px** (haut
du CTA de clôture / du footer). → Ajouter `pb-[max(0.75rem,env(safe-area-inset-bottom))]`
sur la barre **et** un `padding-bottom` sur `<main>` quand la barre est visible.

**M2 — Cibles tactiles < 44 px** (WCAG 2.5.5 / Apple HIG 44 px / Material 48 dp) :
- Drawer panier, boutons quantité : `h-9 w-9` = **36 px** (`cart-drawer.tsx:125,134`).
- Bouton « mute » des reels : `h-9 w-9` = **36 px** (`video-reel.tsx:135`).
- Swatches couleur : `h-10 w-10` = **40 px** (hero compact / sticky / bundle).
- Steppers BuyBox : `h-11 w-10` = **44×40** (hauteur OK, largeur limite).
→ Porter les pastilles et steppers à **≥ 44×44**, écarter `−`/`+`.

**M3 — Tableau comparatif à l'étroit < 360 px.** `Comparison` n'a **pas** de
`overflow-x-auto` (`comparison.tsx:30`) : 3 colonnes + libellés longs (« Étanchéité
testée IPX8 (30 m) ») se **replient agressivement** sur un écran de 320–360 px. → soit
envelopper la table dans un conteneur `overflow-x-auto`, soit basculer en **liste
empilée** (critère + 2 pastilles ✓/✗) sous `sm`.

**M4 — Hero potentiellement plus haut que l'écran sur petit téléphone.** Le hero est
`min-h-[100svh]` avec `items-center` ; la carte d'achat compacte empile note + prix +
mention 3× + couleur + (− qté +) + CTA + réassurance. Sur un iPhone SE (375×667, ~600 px
utiles sous le header), l'ensemble **peut dépasser** et, à cause de `items-center`, se
faire **rogner en haut/bas du pli**. → vérifier sur SE/petits Android ; réduire l'interligne
ou la densité de la carte en `compact`, ou ancrer le contenu en `items-start` avec scroll.

**M5 — Reels en autoplay = data mobile.** 3 vidéos `.mp4` (~11 Mo au total d'après
`AUDIT-SOTA-2026.md` E11) jouées dès qu'elles entrent dans le viewport
(`IntersectionObserver`, `video-reel.tsx`). `preload="none"` limite le préchargement,
mais l'autoplay au scroll **consomme de la data** sur réseau mobile et **affiche un carré
noir** avant lecture (pas de `poster`). → ajouter un **`poster`** par reel + envisager
« lecture au tap » sous data saver / `prefers-reduced-data`.

**Points responsive déjà bons (à garder) :**
- `100svh` (et non `100vh`) sur le hero → pas de saut avec la barre d'URL mobile. ✅
- VideoReel en **carrousel snap** horizontal mobile → desktop grille. ✅
- CartDrawer **plein écran** sous 448 px (vrai *bottom/▶ side sheet*). ✅
- Gouttières et grilles fluides, `clamp()` sur le H1. ✅

---

## 5. ♿ Accessibilité (WCAG 2.2) — mesurée

**Déjà en place (bon) :**
- `prefers-reduced-motion` **respecté partout** (hero parallax, `Reveal`, accordéon FAQ,
  marquee figé) — `globals.css:78`, `reveal.tsx:35`, `hero-image.tsx:18`. ✅
- `:focus-visible` global avec outline contrasté (`globals.css:74`). ✅
- Accordéon FAQ sémantique : `aria-expanded` / `aria-controls` / `role="region"`
  (`faq.tsx`). ✅
- Swatches : `<button>` + `aria-pressed` + `aria-label` (`buy-box.tsx:135`). ✅
- Drawer : `role="dialog"` `aria-modal` + **Escape** + **scroll-lock** body
  (`cart-drawer.tsx:55`). ✅
- Boutons icône avec `aria-label` ; `lang` correct sur `<html>`. ✅

**Trous à corriger :**

**A1 — Drawer panier sans piège de focus.** `role="dialog" aria-modal="true"` mais **le
focus n'est pas déplacé dans le panneau à l'ouverture**, **pas de focus-trap**, et **pas
de retour de focus** sur le déclencheur à la fermeture (`cart-drawer.tsx`). Un
utilisateur clavier/lecteur d'écran peut **tabuler derrière** le panneau. → déplacer le
focus sur le bouton « Fermer » à l'ouverture, piéger le `Tab`, restaurer au close.

**A2 — Pas de lien d'évitement** (« Aller au contenu ») et `<main>` sans `id`/label
(`layout.tsx:41`). → ajouter un *skip link* visible au focus + `id="main"`.

**A3 — Menu mobile : pas d'Escape, pas de focus-trap.** `aria-expanded` est présent
(bien) mais le menu ne se ferme pas au clavier (`header.tsx:134`). Moins critique (simple
disclosure) mais à aligner.

**A4 — Contraste mesuré (sRGB, ratio WCAG) :**
| Combinaison | Ratio | Verdict |
|---|---|---|
| `--color-muted #6b7280` sur fond crème `#faf7f2` | **≈ 4,52:1** | passe AA texte normal **de justesse**, échoue AAA |
| `--color-muted` sur blanc `#ffffff` (cartes) | ≈ 4,83:1 | passe AA |
| Blanc sur bandeau `--color-primary-900 #0a1626` | ≈ 18:1 | excellent (mais texte **11 px**) |
| Texte `white/60`–`white/70` **sur photo** (hero) | **non garanti** | dépend de l'image → risque AA |
| Pastilles paiement `text-[9px]` `ring` muted | — | **trop petit** + contraste faible |

→ Le risque réel n'est pas les grands titres mais le **micro-texte 9–11 px** en `muted`
et le **texte translucide sur photographie** (contraste non garanti, variable selon la
zone d'image). Recommandations : remonter `muted` d'un cran (≈ `#5b626e`) **ou** grossir
ces libellés ≥ 12 px ; sous le texte sur photo, conserver le **calque sombre** (déjà
présent : `bg-black/45 backdrop-blur` sur la carte) et viser `white/80` minimum.

**A5 — Sémantique table.** Les `<th>` du comparatif n'ont pas de `scope="col"`
(`comparison.tsx:33`). Trivial à ajouter.

**A6 — Swatches en `radiogroup`.** Fonctionnels en `button`/`aria-pressed`, mais un
**groupe `radiogroup` + flèches** serait plus idiomatique pour le choix de couleur
(navigation clavier). Amélioration, pas blocage.

---

## 6. Performance perçue (CWV comme UX)

> Non mesuré en conditions réelles ici (pas de Lighthouse terrain). Lecture statique du
> code + bonnes pratiques. Voir `AUDIT-SOTA-2026.md` §3.3 / §5.1 pour le détail chiffré.

- **LCP** : hero = **une seule** image `priority` AVIF/WebP (`hero-image.tsx`). Bon. ⚠️
  Le parallax applique `scale: 1.18` → l'image LCP est rendue **18 % plus grande** que le
  viewport (un peu plus de pixels à peindre). Acceptable ; à surveiller sur mobile bas de
  gamme.
- **CLS** : `Reveal` anime opacity+transform (pas de *layout shift*), images en `fill`
  avec ratio réservé. Bon. ⚠️ Reels **sans `poster`** → carré noir perçu comme un trou.
- **INP** : composants `"use client"` aux **feuilles** (BuyBox, drawer, header), `m`
  (LazyMotion) au lieu du bundle framer complet. Bon. ⚠️ La marquee `animate-marquee`
  tourne en boucle (`will-change: transform`) — compositée, masquée, **figée sous
  reduced-motion** : impact mineur (batterie/CPU sur très bas de gamme).
- **Data mobile** : voir **M5** (reels lourds en autoplay).

---

## 7. Cohérence du contenu (sur le live)

> Tous ces points sont **déjà corrigés en branche** (§1) ; ils ne concernent que la prod.

- **Coquille H1** « Clipper » (devrait être « Clippez » à l'impératif). `↳ corrigé`
- **Histoire de remise** incohérente : −38 % (prix barré) vs −30 % (bannière) vs
  −15/−25 % (packs). `↳ bannière neutralisée en branche`
- **Seuil port offert 79 €** vs produit à 24,90 € → promesse inatteignable. `↳ 39 € en branche`
- **Fausse rareté** « Édition limitée » sur les 3 couleurs. `↳ « En stock » en branche`
- **Presse non sourcée** (« GQ France », « Marie Claire »…) en simple texte → crédibilité
  + risque Omnibus. `↳ à traiter (décision métier)`
- **Avis / notes fabriqués** (4,8/5 · 1 247 avis · 12 500 ventes) → risque légal Omnibus +
  action manuelle Google si dans le JSON-LD. `↳ balisage derrière flag en branche ; source réelle à brancher`

---

## 8. Backlog priorisé (consolidé)

Légende : ✅ déjà corrigé en branche · ◐ partiel · ☐ à faire.

### P0 — Impact maximal, coût quasi nul
1. ☐ **Redéployer la prod depuis la branche corrigée** → supprime ~10 défauts UX **et**
   la faille de prix d'un coup (§1).
2. ☐ **M1 — safe-area + padding bas** pour la `StickyBuyBar` (mobile à encoche).
3. ☐ **A1 — focus-trap + retour de focus** dans le `CartDrawer`.

### P1 — Mobile & accessibilité
4. ☐ **M2 — cibles tactiles ≥ 44 px** (qté drawer 36→44, swatches 40→44, mute 36→44).
5. ☐ **M3 — comparatif** : `overflow-x-auto` ou variante empilée < `sm`.
6. ☐ **A4 — contraste** : remonter `muted` ou grossir le micro-texte 9–11 px ; `white/80` mini sur photo.
7. ☐ **A2 — lien d'évitement** + `id`/label sur `<main>`.
8. ☐ **M5 — `poster`** sur les reels (+ lecture au tap sous data-saver).

### P2 — Finition & marchés
9. ☐ **M4 — hauteur du hero** sur iPhone SE / petits Android (densité de la carte).
10. ☐ **A3/A5/A6** — Escape sur menu mobile, `scope="col"`, swatches `radiogroup`.
11. ☐ **i18n réelle** de la landing (`/en /es /de` affichent du FR — voir AUDIT E22).
12. ☐ **Médias** — transcoder/compresser reels + images sources.
13. ☐ Voir `AUDIT-SOTA-2026.md` §10 pour : persistance commande, RGPD/Consent Mode,
    Express Checkout/BNPL, Omnibus (prix barré 30 j, presse, avis réels), observabilité.

---

## 9. Méthode & limites

- **Sources analysées** : rendu live `hamarea-shop.com` (capture + extraction de
  contenu) + **lecture exhaustive du code** de la branche (`src/app`, `src/components`,
  `globals.css`, `next.config.ts`, `lib/product.ts`).
- **Grilles** : heuristiques NN/g, Lois UX (Hick/Fitts/Von Restorff/Jakob), Baymard
  (CRO e-commerce), **WCAG 2.2** (contraste AA 4,5:1 ; cibles 2.5.5), mobile-first.
- **Contraste** : ratios calculés sur les tokens `globals.css` (luminance relative sRGB).
- **Limites** : pas de Lighthouse terrain (CrUX) ni de test sur device physique ici ; les
  hauteurs hero (M4) et le contraste sur photo (A4) sont à **confirmer sur appareil réel**.
  Les deux audits existants couvrent en profondeur la **sécurité, la conformité UE et la
  perf chiffrée** — non répétés ici.

---

*Rapport établi le 2026-05-30. À lire avec `docs/AUDIT-SOTA-2026.md` et
`docs/UI-UX-PAGE-PRINCIPALE-SOTA-2026.md`.*
