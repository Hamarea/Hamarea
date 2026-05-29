# Rapport UI/UX — Page principale (landing dropshipping) — SOTA 2026

> Audit **design / ergonomie / interaction** de la page principale `/[locale]/page.tsx`
> et de ses composants, évalué contre l'état de l'art du dropshipping mono-produit 2026.
> Complémentaire de `docs/AUDIT-SOTA-2026.md` (qui couvre sécurité/perf/conformité) :
> ici on parle **hiérarchie visuelle, mise en page, micro-interactions, ergonomie
> mobile, persuasion appliquée à l'UI, parcours d'achat**.
>
> Date : 2026-05-29 · Reflète l'état du code **après** les corrections SOTA déjà appliquées.

---

## 0. Résumé exécutif

La page principale est une **landing mono-produit éditoriale et léchée** : hero plein
écran, typographie display (Fraunces), palette premium (bleu nuit / sauge / terre),
séquence de persuasion complète (preuve → USP → démo → vidéo → offre → avis → FAQ),
barre d'achat sticky. Le niveau de finition visuelle est **au-dessus de la moyenne du
dropshipping**.

Mais sur la grille UI/UX **conversion** (Baymard / NN/g / Lois UX / mobile-first), il
reste des écarts à fort impact :

1. **Hero text-over-image** au lieu du **split hero média+achat** qui domine en DTC ;
   titre « malin » plutôt qu'orienté bénéfice (+ coquille « Clipper »).
2. **Header trop chargé sur une landing** (nav multiple, recherche, « trouvez un
   magasin ») → dilue le CTA unique (loi de Hick).
3. **Pas de mini-cart / pas de “Acheter maintenant”** : l'ajout au panier envoie vers
   `/cart`, on casse l'élan (le drawer + checkout express est le standard 2026).
4. **Cibles tactiles sous-dimensionnées** (swatches 28–32 px, steppers) vs **44 px** SOTA.
5. **Preuve sociale tardive et sans photos** (avis en bas, pas d'UGC visuel) alors que
   les avis-photo/vidéo sont le plus gros multiplicateur de conversion.
6. **Offre** sans **barre de progression port offert**, sans **BNPL**, sans **icônes de
   paiement** visibles, et **histoire de remise incohérente** (-38 % / -15/25 %).

| Heuristique | Score /10 | Commentaire |
|---|---|---|
| Hiérarchie visuelle & above-the-fold | 7 | dense et clair, mais hero à repenser |
| Clarté du CTA / loi de Hick | 5,5 | header concurrent, pas de mini-cart |
| Ergonomie mobile (70 % du trafic) | 6 | sticky OK, tap targets trop petits |
| Preuve sociale & confiance (UI) | 6 | présente mais tardive, sans photos, sans badges paiement |
| UX de l'offre / pricing | 6,5 | decoy OK, manque progress-bar/BNPL/cohérence |
| Micro-interactions & feedback | 6,5 | feedback ATC OK, pas de drawer |
| Accessibilité (WCAG) | 6 | reduced-motion OK, contrastes/targets à vérifier |
| Système visuel (typo/couleur/rythme) | 8 | fort, différenciant, cohérent |
| Copywriting / clarté bénéfice | 6 | bon sur les sections, hero à clarifier, i18n FR-only |
| **Global UI/UX** | **6,4** | excellent socle, leviers conversion non activés |

---

## 1. Méthode & grille d'évaluation

- **10 heuristiques de Nielsen** (visibilité de l'état, correspondance système/monde
  réel, contrôle utilisateur, cohérence, prévention d'erreur, reconnaissance plutôt que
  rappel, flexibilité, esthétique minimaliste, récupération d'erreur, aide).
- **Lois UX** : Hick (charge de choix), Fitts (taille/distance des cibles), Von Restorff
  (saillance du CTA), Jakob (conventions e-commerce), Miller/charge cognitive,
  position sériale, peak-end, Zeigarnik.
- **Baymard Institute** (UX e-commerce, abandon panier) & **NN/g** (fiches produit,
  above-the-fold).
- **Mobile-first** : zones du pouce, cibles **≥ 44 px** (WCAG 2.5.5 / Apple HIG ;
  Material 48 dp), **contraste** AA 4,5:1 (texte) / 3:1 (UI & grand texte).
- **CWV comme UX** : LCP < 2,5 s, INP < 200 ms, CLS < 0,1.

---

## 2. Vue d'ensemble & parcours du regard

Ordre actuel des blocs :

```
[Bandeau promo] → [Header sticky]
1. HERO plein écran (image fond + BuyBox)
2. TrustBar (4 réassurances)
3. PressBar (logos texte « ils en parlent »)
4. UspGrid (4 atouts)
5. HowItWorks (3 étapes)
6. VideoReel (3 reels 9:16)
7. ColorsShowcase (3 couleurs)
8. Comparison (tableau vs « sacoche classique »)
9. BundlePicker (packs 1/2/3 — moment d'offre)
10. Testimonials (4 avis)
11. FAQ (accordéon)
12. CTA de clôture (« je commande »)
[StickyBuyBar] (apparaît à 600 px de scroll)
```

**Diagnostic de flux :** la séquence est logique (problème→preuve→démo→offre→
réassurance). Deux faiblesses de *rythme de conversion* :
- La **preuve sociale forte (avis)** arrive **après** l'offre (bloc 10), donc trop tard
  pour amorcer la confiance avant le hero/début de scroll.
- Entre le hero et le BundlePicker (bloc 9), **aucun rappel d'achat inline** sauf la
  sticky bar — on demande beaucoup de scroll avant de re-proposer l'action.

---

## 3. Above-the-fold / Hero — analyse détaillée

### 3.1 État actuel
- Section `min-h-[100svh]`, image produit **en fond plein écran** (1 seule image LCP
  désormais), triple dégradé pour lisibilité.
- Colonne gauche (`md:col-span-5/4`) : badge « Bestseller de l'été » → H1
  **« Filmez. Clipper. Plongez. »** → sous-titre bénéfice → **BuyBox** (note 4,8/5,
  prix 24,90 € / 39,90 € −38 %, swatches, stepper, “Ajouter”).
- Colonne droite : **vide** (`hidden md:block aria-hidden`) — la photo *est* le fond.

### 3.2 Forces
- ✅ Densité de décision dès le 1er écran : média + note + prix + ancre + CTA + couleurs.
- ✅ BuyBox en **glassmorphism** sombre (`bg-black/45 backdrop-blur`) → lisible sur photo.
- ✅ `100svh` (et non `100vh`) → pas de saut avec la barre d'URL mobile.

### 3.3 Écarts vs SOTA & recommandations
| # | Constat | Reco SOTA |
|---|---|---|
| H1 | **Titre « malin » non orienté bénéfice** ; coquille **« Clipper »** (devrait être « Clippez » pour rester à l'impératif) | Titre **bénéfice/clarté** : ex. « Votre téléphone filme sous l'eau. Et ressort au sec. » — la promesse d'abord (NN/g : on ne scrolle que si la promesse convainc) |
| Layout | **Texte sur photo** : élégant mais l'image produit n'est jamais montrée « propre » | Tester le **split hero** desktop : **média produit à gauche, bloc d'achat à droite** (pattern DTC le plus converti) ; garder le full-bleed en variante mobile |
| Accent | « Plongez. » en `accent-300` = **brun** (#b78460) peu visible sur fond sombre | Accent **plus contrasté** (sauge clair ou blanc cassé) ; viser ≥ 4,5:1 |
| Note | **4,8/5 · 1 247 avis fabriqués** | Brancher une **vraie source d'avis** ; sinon retirer le compteur (risque confiance + légal) |
| Réassurance | micro-copy texte seulement | Ajouter sous le CTA : **icônes paiement** (CB/Apple Pay/Google Pay), **badge garantie**, **« port offert dès 39 € »**, **BNPL « 3× sans frais »** |
| Distraction | header complet visible sur le hero | **Header allégé** en mode landing (logo + ancre Avis/FAQ + panier) |

### 3.4 Wireframe hero SOTA (desktop, split)
```
┌──────────────────────────────────────────────────────────┐
│ Hamarea            La sacoche · Avis · FAQ            🛒(0) │  header minimal
├───────────────────────────────┬──────────────────────────┤
│                               │ ★★★★★ 4,8 (avis vérifiés)  │
│                               │ Filmez sous l'eau.         │
│      PHOTO/VIDÉO PRODUIT       │ Ressortez au sec.          │
│      (réelle, en situation)    │ IPX8 · 30 m · tactile      │
│      ◦ ◦ ◦  (mini-galerie)    │ 24,90 €  ̶3̶9̶,̶9̶0̶ ̶€̶  −38 %   │
│                               │ Couleur: ●●●               │
│                               │ [ −  1  + ]  [ ACHETER → ] │
│                               │ ✓ Port offert dès 39 €     │
│                               │ ✓ Retours gratuits 30 j    │
│                               │ 💳 CB Apple Google · Klarna │
└───────────────────────────────┴──────────────────────────┘
```
Mobile : média en haut (ratio 4:5) → bloc d'achat dessous → **sticky ATC** au scroll.

---

## 4. Parcours de scroll & ordre des sections

**Reco d'ordre (conversion-first) :**
1. Hero (offre + preuve note)
2. **TrustBar** (réassurance immédiate)
3. **Avis/UGC condensés** *(remonter une bande de 3–4 avis-photo ici)*
4. USP / How it works / Vidéo (désir + preuve produit)
5. ColorsShowcase
6. Comparison
7. **BundlePicker** (offre) **+ rappel BuyBox**
8. Avis détaillés + FAQ
9. CTA de clôture

Principe : **ancrer la confiance tôt** (avis remontés), puis **réactiver l'achat** au
moment de l'offre. La sticky bar comble l'intervalle.

---

## 5. Analyse section par section

### 5.1 Header / navigation (`shop/header.tsx`)
- ⚠️ Sur une landing, **trop de liens concurrents** (La sacoche, Avis, FAQ, À propos,
  recherche, compte, panier, locale, **« trouvez un magasin »**). Loi de Hick.
- ⚠️ **« trouvez un magasin »** n'a pas de sens pour un e-commerce sans boutique.
- ⚠️ Boutons **recherche** et **menu mobile non fonctionnels** (pas de `onClick`).
- ✅ Header transparent sur le hero puis opaque au scroll : bonne pratique.
- **Reco :** mode landing épuré (logo + 2 ancres + panier) ; retirer/renommer « magasin » ;
  rendre la recherche fonctionnelle ou la masquer ; brancher le menu mobile.

### 5.2 TrustBar
- ✅ 4 réassurances iconographiées, tôt dans la page. Bon.
- **Reco :** ajouter de **vraies icônes de moyens de paiement** (visuel, pas juste du
  texte) ; rapprocher la garantie du CTA.

### 5.3 PressBar
- ⚠️ Logos **en texte**, **non sourcés** (« GQ France », « Marie Claire »…) → faible
  crédibilité + risque légal.
- **Reco :** vrais logos liés à l'article, **ou** remplacer par un bandeau de chiffres
  (« 12 500 clients », « 4,8/5 ») **réels**, **ou** supprimer.

### 5.4 UspGrid
- ✅ 4 cartes claires, icônes Lucide, hover shadow. Bon.
- **Reco :** appuyer chaque USP d'un **visuel/détail produit** (NN/g : montrer le produit
  sous plusieurs angles) ; alterner texte/image en zigzag pour le desktop.

### 5.5 HowItWorks
- ✅ 3 étapes numérotées, lisibles. Réduit l'incertitude d'usage.
- **Reco :** ajouter un **visuel/gif** par étape ; relier à la démo vidéo.

### 5.6 VideoReel
- ✅ Format 9:16 TikTok, autoplay en `IntersectionObserver`, mute toggle, tap-to-play,
  scroll horizontal snap mobile. Très « SOTA dropshipping ».
- ⚠️ **Pas de `poster`** → carré noir avant lecture (perçu comme cassé / CLS visuel).
- **Reco :** ajouter une **image poster** par reel ; badge « son » plus visible ;
  envisager légendes/sous-titres (vues sans son).

### 5.7 ColorsShowcase
- ✅ Grille 3 couleurs, image 4:5, pastille couleur, CTA « Choisir » → `#acheter`.
- ⚠️ **« Édition limitée »** sur les 3 → fausse rareté (crédibilité/légal).
- **Reco :** « Choisir » devrait **présélectionner la couleur** dans la BuyBox (et
  scroller), pas seulement ancrer ; retirer « édition limitée » si non vrai.

### 5.8 Comparison
- ✅ Tableau « Hamarea vs sacoche classique » — cadrage par contraste efficace.
- ⚠️ Tableau **dense sur mobile** (8 lignes, 3 colonnes) ; en-tête « sacoche classique »
  un peu vague.
- **Reco :** sur mobile, condenser (icônes ✓/✗ + colonnes étroites) ; nommer le
  comparatif de façon crédible (« coque/poche standard »).

### 5.9 BundlePicker (offre / pricing) — bloc clé
- ✅ **Decoy/anchoring** : 1/2/3 avec « Le plus choisi » sur le pack 2, « vous économisez X »
  (aversion à la perte). Très bon.
- ⚠️ **Incohérence de remise** : hero −38 %, packs −15/−25 %.
- ⚠️ Pas de **barre de progression « port offert »**, pas de **BNPL**, pas de rappel
  des **swatches sélectionnés depuis le hero** (état couleur local au composant).
- **Reco :** afficher **« Plus que X € pour la livraison offerte »** (seuil 39 €) ;
  ligne **« ou 3× 8,30 € avec Klarna »** ; aligner l'histoire de remise ; faire de ce
  bloc un **vrai “buy box” secondaire** (récap prix total + CTA proéminent).

### 5.10 Testimonials
- ✅ 4 cartes, étoiles, **« Achat vérifié »**, résumé note.
- ⚠️ **Aucune photo client / UGC** (le levier #1 : avis-photo/vidéo) ; **fabriqués** ;
  pas de distribution (5★/4★…), pas de tri, placés **trop bas**.
- **Reco :** **avis-photo** (widget type Loox/Judge.me) ; remonter une bande d'avis
  près du hero ; barre de répartition des notes ; lien « voir les N avis ».

### 5.11 FAQ
- ✅ Accordéon accessible (corrigé : `aria-controls`/`region`), 1er ouvert, bon contenu
  d'objections (compatibilité, tactile sous l'eau, étanchéité, retour).
- **Reco :** regrouper par thèmes si la liste grandit ; CTA discret en fin de FAQ.

### 5.12 CTA de clôture
- ✅ Rappel « rejoignez les 12 500+ clients » + bouton.
- ⚠️ Chiffre **fabriqué** ; CTA renvoie à `#acheter` (remonte tout en haut) plutôt qu'au
  BundlePicker proche.
- **Reco :** CTA vers le **bloc offre** le plus proche ; chiffre réel ou retiré.

### 5.13 StickyBuyBar
- ✅ Apparaît à 600 px, prix + swatches + ATC, zone du pouce. Excellent.
- ⚠️ Swatches **h-7 (28 px)** trop petits ; ATC ajoute au panier mais **ne propose pas
  le paiement express**.
- **Reco :** cibles ≥ 44 px ; bouton **« Acheter »** ouvrant un **mini-cart drawer**
  avec checkout express.

---

## 6. Système visuel

- **Typographie** : Fraunces (display serif) + Inter (texte) — identité forte,
  différenciante vs le dropshipping générique. ✅ Garder. Vérifier l'échelle mobile des
  H2 `text-3xl` (lisibilité) et la longueur de ligne du corps (45–75 caractères).
- **Couleur** : navy/sauge/terre + fond beige `#faf7f2` — premium et cohérent. ⚠️ Le
  rouge « danger » (#b23a48) sert de **badge promo** : OK, mais vérifier le **contraste**
  du texte blanc sur badge (≈ 4,5:1). L'accent brun en hero manque de punch.
- **Espacement / rythme** : sections `py-16/20`, conteneur `max-w-7xl` — aéré, pro. ✅
- **Iconographie** : Lucide cohérent. ✅
- **Motion** : transitions/hover-scale ; `prefers-reduced-motion` désormais respecté. ✅
- **Imagerie** : dépend des assets réels ; **bannir tout visuel “fond blanc AliExpress”**,
  privilégier lifestyle/UGC (NN/g : plusieurs vues réelles).

---

## 7. Ergonomie mobile (70 % du trafic)

| Élément | Actuel | SOTA |
|---|---|---|
| Sticky ATC | ✅ présent (scroll > 600) | conserver ; ajouter prix + image miniature |
| Swatches couleur | **28–32 px** | **≥ 44 px** (Fitts / WCAG 2.5.5) |
| Stepper quantité | `h-9 w-8` (~36×32) | ≥ 44×44, espacement entre − et + |
| CTA principal | large, OK | full-width dans le pouce, ≥ 48 px de haut |
| Reels | scroll horizontal snap ✅ | + poster + sous-titres |
| Tableau comparatif | dense | version compacte mobile |
| Hero | texte sur photo | média en haut + achat dessous |

---

## 8. UX de conversion & persuasion (appliquée à l'UI)

| Principe | Présent ? | Levier UI à activer |
|---|---|---|
| **Preuve sociale** (Cialdini) | partiel | avis-photo, remonter la preuve, compteurs **réels** |
| **Rareté/urgence** | factice (à éviter) | stock réel (« 7 en stock ») **ou** rien |
| **Ancrage** (Kahneman) | ✅ prix barré | rendre la remise **cohérente** et **conforme** (30 j) |
| **Decoy** | ✅ packs 1/2/3 | renforcer « le plus choisi » + récap total |
| **Aversion à la perte** | ✅ « vous économisez » | barre « plus que X € pour le port offert » |
| **Hick** (moins de choix) | ⚠️ header chargé | header landing épuré, 1 CTA dominant/écran |
| **Fitts** (cibles) | ⚠️ petites | targets ≥ 44 px |
| **Von Restorff** (saillance) | ✅ CTA contrasté | garder le CTA comme élément le plus saillant |
| **Position sériale** | partiel | bénéfice fort en 1er, garantie en dernier |
| **Peak-end** | ⚠️ | soigner le **moment d'ajout** (drawer) et la page succès |

---

## 9. UX de confiance & inversion du risque

- ✅ TrustBar tôt, garantie 2 ans, retours 30 j (répétés en BuyBox/FAQ).
- ⚠️ **Pas d'icônes de paiement visuelles**, **pas de badge garantie graphique** près du
  CTA, **pas de sceau** au moment du paiement (le redirect Stripe assure le checkout).
- ⚠️ Mention du **droit de rétractation 14 j** (UE) à afficher clairement (double usage :
  conformité + réassurance).
- **Reco :** sous chaque CTA majeur, une ligne **garantie + retours + paiement sécurisé**
  avec **pictos** ; page **succès** rassurante (récap + suivi).

---

## 10. UX du tunnel d'achat

- ⚠️ **Pas de mini-cart drawer** : l'ATC montre « Ajouté ! » 1,8 s puis l'utilisateur
  doit aller sur `/cart` → on **casse l'élan** (Zeigarnik/peak-end).
- ✅ Tunnel checkout désormais **en 1 étape** (email + livraison) avec **barre de
  progression port offert**, l'adresse étant collectée par Stripe (fin de la double
  saisie).
- ⚠️ **Pas de paiement express on-page** (Apple/Google Pay/Link) — plus gros levier
  (Stripe : Apple Pay +22,3 %).
- **Reco :** **drawer panier** (slide-in) avec récap, upsell « ajoutez une 2ᵉ (-15 %) »,
  et **bouton paiement express** ; envisager le **Payment/Express Checkout Element**
  on-page à terme.

---

## 11. Accessibilité (WCAG) & performance-as-UX

- ✅ `prefers-reduced-motion`, `:focus-visible`, accordéon FAQ sémantique (corrigés).
- ⚠️ **Cibles tactiles** < 44 px (swatches/steppers) → WCAG 2.5.5.
- ⚠️ **Contrastes** à valider : accent brun en hero, texte blanc/85 sur photo, badge promo.
- ⚠️ Vérifier l'ordre de focus clavier dans le hero (BuyBox) et la navigation au clavier
  des swatches (rôle `radiogroup`/`radio` idéal).
- ✅ **CWV améliorés** : hero = 1 image LCP, AVIF/WebP, reels `preload="none"`, JS client
  en feuilles. ⚠️ Compresser les sources image, transcoder les vidéos, ajouter posters.

---

## 12. Copywriting & contenu

- ⚠️ **Coquille H1 « Clipper »** → « Clippez ».
- ⚠️ **i18n FR-only** : `/en /es /de` affichent du français (toute la landing est en dur).
  UX cassée pour les visiteurs non francophones (et le dropshipping cible souvent
  plusieurs marchés via la pub).
- ✅ Copy des sections concret et bénéfice-orienté.
- **Reco :** clarifier le H1 (bénéfice) ; externaliser les textes vers next-intl + format
  monétaire localisé.

---

## 13. Backlog priorisé UI/UX

Légende : ✅ fait · ◐ partiel · ☐ à faire (dépendance externe/décision).

**P0 — conversion immédiate, faible coût**
- ✅ Corriger le **H1** (« Filmez sous l'eau. Ressortez au sec. » + accent contrasté).
- ✅ **Header landing épuré** (retrait « trouver une boutique » et recherche ; menu mobile fonctionnel).
- ✅ **Cibles tactiles** agrandies (swatches 40–44 px, steppers 44 px).
- ✅ Sous les CTA : **réassurance + marques de paiement** (port offert/retours/garantie/sécurisé).
- ☐ **Posters** sur les reels *(nécessite des images poster — assets à fournir)*.

**P1 — leviers structurants**
- ◐ **Mini-cart drawer** livré (slide-in, progress port offert, “Commander”) ; **paiement express** Apple/Google Pay à brancher (Stripe Express Checkout — clés + domaine).
- ☐ **Avis-photo/UGC** + remonter la preuve *(nécessite une vraie source d'avis)*.
- ✅ **Barre de progression « port offert »** (drawer) + ligne **paiement en 3×** (BuyBox).
- ☐ **Split hero** desktop *(test A/B ; direction artistique full-bleed conservée)*.
- ◐ Cohérence remise (bannière neutralisée ; à finaliser côté données Omnibus).
- ✅ Bonus : **“Acheter maintenant”** (achat direct) ajouté à la BuyBox.

**P2 — finition & marchés**
- ☐ **i18n réelle** de la landing *(chantier de traduction fr/en/es/de)*.
- ◐ Comparatif **compact mobile** ✅ ; zigzag média USP/HowItWorks ☐.
- ◐ **Stock réel** : « édition limitée » retirée ✅ ; presse à sourcer ☐.
- ✅ Page **succès** soignée (étapes « et maintenant ? » + réassurance).

---

## 14. Checklist UI/UX SOTA dropshipping (synthèse)

1. Titre **bénéfice** clair dès le 1er écran · 2. **Média produit réel** (pas fond blanc) ·
3. **Note + avis** près du titre · 4. **CTA unique** très saillant par écran ·
5. **Sticky ATC** mobile (zone du pouce, ≥ 44 px) · 6. **Mini-cart drawer** + **express
pay** · 7. **Icônes paiement + garantie** sous le CTA · 8. **Packs/decoy** + **« le plus
choisi »** · 9. **Barre port offert** + **BNPL** · 10. **Avis-photo/UGC** · 11. **Vidéo**
avec poster/sous-titres · 12. **Header épuré** sur la landing · 13. **Cohérence des
remises** (et conformité Omnibus) · 14. **Accessibilité** (contraste, focus, targets) ·
15. **CWV** (LCP < 2,5 s, INP < 200 ms, CLS < 0,1) · 16. **i18n** par marché.

> Verdict : socle visuel premium et structure de persuasion saine. En activant
> **split hero / preuve remontée / mini-cart + express pay / targets 44 px / progress-bar
> port + BNPL / avis-photo**, la page passe d'« esthétique » à **« machine à convertir »**
> au standard 2026, sans renier sa direction artistique.
