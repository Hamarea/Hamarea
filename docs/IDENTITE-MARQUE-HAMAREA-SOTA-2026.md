# Hamarea — Identité de marque & site de marque SOTA 2026

> **Objet.** Faire passer Hamarea d'une **landing mono-produit** (la sacoche étanche, 1 pièce / 3 coloris)
> à un **véritable site de marque multi-produits** qui *valorise la marque* **et** *incite à l'achat*.
> Ce document contient (a) **l'identité de marque créée** pour Hamarea, (b) la **documentation
> state-of-the-art 2026** sourcée pour un site de marque DTC océan/sport, (c) le **rapport complet
> des améliorations manquantes** (gap analysis) du site actuel, et (d) la **roadmap + l'architecture cible**.
>
> **Positionnement retenu** (décision client) : **Sport & océan énergique**, ton dynamique et jeune,
> esthétique vive (turquoise/corail). **Le logo fourni** précise l'ADN : wordmark **« HAMAREA »** en
> **serif display à fort contraste** (registre éditorial) + baseline **« JUST RUN & SWIM »** (grotesque Aktiv
> Grotesk) → l'activité est la **course & la nage en mer** (eau libre / swimrun / plage), pas le surf.
> **Futurs produits** (licra/rashguard, capuche/poncho de change, cup, accessoires) : **teasers « Bientôt » + liste d'attente**.
>
> ⚠️ *Conséquence design : on garde une typo **serif éditoriale (Fraunces)** qui s'accorde au wordmark — et non une
> grotesque condensée type Oswald qui jurerait — l'énergie venant de la **couleur, du motion et de la photo**.*
>
> Date : 2026-06-03 · Périmètre : `Hamarea/Hamarea` (Next.js 15 App Router · TS · Tailwind v4 · Supabase · Stripe · next-intl fr/en/es/de) · Domaine : **hamarea-shop.com**.
> Complète `docs/AUDIT-SOTA-2026.md` et `docs/UI-UX-PAGE-PRINCIPALE-SOTA-2026.md` (qui traitaient le site comme **mono-produit**) ; ici on raisonne **marque**.

---

## 0. Résumé exécutif

Le site actuel est **excellent comme page de vente mono-produit**, mais ce n'est **pas un site de marque** :
la page d'accueil **est** la fiche de la sacoche, la navigation pointe vers des ancres de cette page,
l'univers produit (à venir) est invisible, et l'identité visuelle (bleu nuit / vert sauge / terre + serif Fraunces)
lit « artisan premium », pas « **sport & océan énergique** ».

La recherche SOTA 2026 converge sur un point clé : **la page d'accueil d'une marque est une passerelle, pas
un convertisseur**. Son rôle est d'**affirmer l'identité**, de **montrer l'étendue de la gamme** et de **router**
vers le produit héros / les collections — puis la fiche produit convertit. Une home de marque doit donc :
afficher **40-50 % des types de produits** d'un coup d'œil (sinon 22 % des visiteurs partent en croyant que la
boutique n'a pas ce qu'ils cherchent — Baymard), exposer un **best-seller comme point d'entrée** (23 % des
utilisateurs l'utilisent en premier — Baymard), garder le **storytelling toujours shoppable**, et **travailler
d'abord sur mobile** (≈ 59 % des ventes, ≈ 73 % du trafic ; conversion mobile ~74 % plus basse que desktop).

**Ce que ce chantier livre :** une identité de marque complète (mission, valeurs, archétype, voix, **nouvelle
palette Lagon/Corail + typo Oswald**), une **home de marque** (hero de marque → univers produits avec teasers
« Bientôt » + **liste d'attente RGPD** → spotlight sacoche → preuve sociale → engagement océan → manifeste),
la **sacoche déplacée sur sa page dédiée `/sacoche`**, une **navigation de marque** (5-7 entrées), des **données
structurées `Organization`/`OnlineStore`**, et la copie **fr/en/es/de**.

| Axe | Avant | Après (cible) |
|---|---|---|
| Nature du site | Landing mono-produit | **Site de marque multi-produits** |
| Page d'accueil | = fiche sacoche | **Home de marque** (passerelle + univers + waitlist) |
| Identité visuelle | Navy/sauge/terre + serif (premium) | **Lagon/Corail + Oswald (sport océan énergique)** |
| Étendue de gamme visible | 1 produit | **Sacoche + 4 teasers « Bientôt »** (≥ 40 % des types) |
| Capture d'audience | Aucune | **Waitlist double-opt-in + newsletter** |
| Données structurées marque | `Product` seul | **+ `Organization`/`OnlineStore`** |

---

## 1. Méthodologie & sources

- **Analyse de l'existant** : lecture du code (`src/app`, `src/components`, `src/lib`, `middleware`,
  `globals.css`, migrations, i18n, `next.config`), des deux audits SOTA déjà présents et des assets `public/`.
- **Veille SOTA 2026** : 5 recherches documentaires parallèles (identité de marque DTC océan/sport ; architecture
  d'un site de marque ; lancement « coming soon » / waitlist / RGPD ; CRO & UX e-commerce ; performance / SEO /
  accessibilité / conformité UE sur Next.js 15). Sources **primaires** privilégiées (NN/g, Baymard, Stripe,
  Contentsquare, web.dev, Google Search Central, W3C/WCAG, CNIL, EUR-Lex) ; les chiffres **fournisseurs**
  (Shopify, Klaviyo, Bazaarvoice, vendeurs de waitlist…) sont **signalés comme directionnels**.
- Détail des URL en **§12. Sources**.

---

## 2. L'identité de marque Hamarea

### 2.1 Plateforme de marque

| Élément | Définition |
|---|---|
| **Nom** | **Hamarea** — *la mer* / *marea* (la marée). Le mouvement, le ressac, l'énergie de l'eau. |
| **Catégorie** | Équipement & accessoires pour **courir et nager au bord de la mer** (eau libre, swimrun, plage, triathlon). |
| **Positionnement** | L'énergie de l'océan, sans compromis. Du matériel **testé par la mer**, pour des gens qui la vivent **à fond**. |
| **Archétype** | **Explorateur × Héros** — la liberté/l'aventure de l'océan (Explorer : The North Face, Patagonia) croisée avec l'énergie/la performance (Hero). Combinaison documentée pour l'outdoor/océan. *(Ebaqdesign, archétypes de marque, 2026.)* |
| **Cible** | Adultes actifs 18-40, jeunes d'esprit, nageurs/coureurs et amoureux de la mer ; achètent l'émotion + la fiabilité. |
| **Signature** | **« JUST RUN & SWIM »** — la baseline officielle, présente dans le logo. Ownable, valable pour toute la gamme. |
| **Baseline descriptive** | « Équipement & accessoires de mer, testés par l'océan. » |

### 2.2 Mission & valeurs

**Mission.** *Équiper chaque sortie en mer — pour en profiter à fond, sans rien craindre de l'eau.*

Une marque qui dure compose **une seule thèse durable** et la répète partout (modèle **Yeti** : « Built for the
Wild » plutôt que des specs ; campagne « Wildly Stronger » → 1,2 Md+ d'impressions, +9 % de ventes QoQ — Zamora
Design). Hamarea = **« testé par l'océan »**.

1. **Testé par l'océan** — éprouvé en conditions réelles (sel, sable, chocs, UV), pas qu'en labo. *Preuve, pas promesse.*
2. **Énergie & liberté** — l'esprit watersports : mouvement, spontanéité, bonne humeur.
3. **Respect de la mer** — engagement **concret et matériel** (matériaux durables, emballage sans plastique,
   reversement à la protection des océans). Pour une marque océan, la durabilité doit être **spécifique**, pas
   un vague claim (leçon **Patagonia** « We're in business to save our home planet » / **Vissla** « To Protect & Surf »).
   ⚠️ *À n'afficher que si réel et vérifiable (cf. conformité Omnibus, §8).*
4. **Sans compromis** — garantie, conçu pour durer ; on ne brade pas la qualité.

### 2.3 Voix & ton

Calé sur les **4 dimensions de ton de voix de NN/g** (Formel↔Décontracté, Sérieux↔Drôle, Respectueux↔Irrévérencieux,
Factuel↔Enthousiaste) — et NN/g montre que le ton produit un effet **mesurable** sur la confiance et la
désirabilité perçues (ce n'est pas cosmétique).

- **Enthousiaste** (haut) · **Décontracté** (haut) · **légèrement irrévérencieux** (moyen) · **factuel sur la technique** (les specs, on les dit cash).
- **Tutoiement** en français. Phrases **courtes, punchy, à l'impératif**. Verbes d'action.
- **Anti-ton** : corporate, mou, condescendant, « luxe précieux », jargon.
- Engagement total sur une voix distinctive (leçon **Liquid Death** : ça marche parce que ça ne dévie *jamais*).

**Exemples.** ✅ « L'océan ne fait jamais de pause. Toi non plus. » · « Plongé, secoué, ressorti nickel. » ·
« Étanche IPX8, 30 m. Point. » ❌ « Notre solution premium de protection nomade pour vos appareils. »

### 2.4 Naming de gamme

Univers cohérent et évolutif : **Hamarea Sacoche** (étanche IPX8) · **Hamarea Lycra** (rashguard anti-UV) ·
**Hamarea Capuche** (poncho/hoodie de surf) · **Hamarea Cup** (gourde/mug isotherme) · **Hamarea Accessoires**.

---

## 3. Système visuel (brand book condensé)

> Principe SOTA 2026 : la tendance est aux **couleurs vives & saturées** (« dopamine design ») et à la
> **typographie grasse/kinétique** (Figma, tendances 2026). Mais **les teintes vives passent rarement le
> contraste sur blanc** : on les emploie **en accents**, avec des **variantes foncées « text-safe »**, et on
> **ne s'appuie jamais sur la couleur seule** (NN/g ; WCAG). Palette cœur limitée à **~3 couleurs**.

### 3.1 Palette « Énergie Océan »

| Rôle | Nom | Vif (accent) | Sûr texte/CTA (≥ 4,5:1 sur blanc) | Usage |
|---|---|---|---|---|
| **Primaire** | **Lagon** (turquoise) | `#22d3ee` / `#06b6d4` | `#0e7490` (600) · `#155e75` (700) | CTA principal, liens, fonds sombres (900 `#0a2e3a`) |
| **Secondaire** | **Corail** (corail/coucher de soleil) | `#ff6f57` (400) | `#c5301a` (700) | CTA secondaire « Acheter », badges promo/économies, accents énergiques |
| **Encre** | **Abysse** (bleu nuit quasi-noir) | — | `#0c1b24` | Texte, sections sombres (on conserve l'ancrage profond existant) |
| **Neutre** | **Sable** (sable chaud) | `#f8f6f1` (fond) | `#e6e1d6` (bordures) | Fond de page, cartes |
| **Tertiaire** | **Soleil** (ambre) | `#f6b53d` | `#92610a` | Highlights **parcimonieux** (jamais texte blanc sur ambre) |

- Chaque teinte vive est livrée avec une **variante foncée** pour rester on-brand en aplat **tout en gardant le
  texte lisible** (Wise Owl / StudioLimb, WCAG 2026 : ~79 % des homepages ratent le contraste — WebAIM 2025).
- **Ne pas coder le sens par la seule couleur** : ajouter icône/contour/libellé (succès/erreur, dispo/épuisé).
- **Implémentation** : on **re-mappe les tokens existants** (`--color-primary-*` → Lagon, `--color-secondary-*`
  → Corail, `--color-accent-*` → Soleil, `--color-bg` → Sable, `--color-foreground` → Abysse) pour que **tout le
  site adopte la nouvelle identité d'un coup**, sans réécrire chaque composant.

### 3.2 Typographie

> Le logo dicte le système : son wordmark est un **serif display à fort contraste**, sa baseline une **grotesque**
> (Aktiv Grotesk). On reproduit ce duo avec des polices Google déjà au projet — **pas** de grotesque condensée
> (Oswald) qui jurerait avec le wordmark serif.

- **Display / titres : `Fraunces`** (serif à fort contraste, optical sizing, graisses jusqu'à 900) — **conservée**
  car elle **s'accorde au wordmark HAMAREA**. L'impact « bold » sport vient des **graisses lourdes + grandes
  tailles** (clamp jusqu'à 6rem sur le hero), pas d'une condensée.
- **Texte courant & labels : `Inter`** (humaniste, ultra-lisible) — conservé ; utilisé en **MAJUSCULES lettrées**
  pour les eyebrows façon « JUST RUN & SWIM » (classe `.brand-eyebrow`).
- **Mise en œuvre Next.js** : `next/font/google` **auto-héberge** les polices (privacy + perf), calcule le
  `size-adjust` pour **éliminer le CLS**, `display:swap`, **importées une seule fois** dans le layout.

### 3.3 Logo, iconographie, motion, image

- **Logo** (fourni par le client) : wordmark **HAMAREA** en **serif display à fort contraste**, avec la baseline
  **« JUST RUN & SWIM »** (grotesque, lettrée) incrustée au centre. Monochrome → **recolorable** : intégré en
  **masque CSS** (`currentColor`) pour s'afficher en encre sur fond clair et en blanc sur le hero/footer sombres
  (composant `Logo`). Assets générés : `public/brand/hamarea-logo.svg` (vectoriel), `hamarea-logo.png`
  (**≥ 112 px**, pour le JSON-LD `Organization` — Google), `og-default.png` (1200×630, partage social).
- **Iconographie** : **Lucide** (déjà en place) — vagues, ancre, gouttes, soleil, vent. Cohérence garantie.
- **Motion** (cœur de métier 2026, Figma) : animations au scroll, micro-interactions (hover, états), transitions —
  **déjà** Framer Motion + `Reveal`/`ScrollProgress`/`CountUp`. **Toujours respecter `prefers-reduced-motion`** (déjà géré).
- **Direction photo/vidéo** : **authentique, née de la culture** (action surf/plage, UGC, vrais moments) — ce qui
  rend **Finisterre**/**Yeti** crédibles. **Bannir** le packshot « fond blanc AliExpress ».

---

## 4. SOTA 2026 — Architecture d'un site de marque

> Sources benchmark-grade : **Baymard, NN/g, Contentsquare**.

### 4.1 La home de marque = passerelle (pas convertisseur)
- ~**38 %** des parcours démarrent sur la home, mais elle **convertit rarement directement** : son job est
  **orientation + routage** vers catégories/fiches *(EcomHint — directionnel)*.
- Le **hero doit répondre « cette marque fait quoi ? »** en un écran : logo en haut à gauche + proposition de
  valeur dans la langue du visiteur + **un CTA primaire** (NN/g, 5 principes de la home).
- **Profondeur de session prédit la conversion** : +5,4 % quand elle augmente, −13,1 % quand elle baisse — donc
  la métrique d'une home est le **clic sortant**, pas la conversion sur page (Contentsquare 2025).
- **Scroll ~50 % et en baisse** : la moitié de la page n'est pas vue → mettre **l'étendue + un chemin clair en
  haut** ; le contenu de marque trop bas ne sera pas vu (Contentsquare 2025).

### 4.2 Montrer l'étendue de la gamme (le point clé du passage multi-produits)
- **Afficher au moins 40 % (cible 40-50 %) des types de produits** dès le 1er coup d'œil ; **22 %** des sites en
  montrent trop peu → les visiteurs croient que le site n'a pas ce qu'ils veulent et **partent** (Baymard).
- **Best-sellers** comme point d'entrée : **23 %** des utilisateurs l'utilisent, souvent en **premier** choix —
  c'est le **routeur vers le produit héros** (Baymard). → la **sacoche = best-seller mis en avant**.
- **Toute image lifestyle/inspirationnelle doit être cliquable/shoppable** ; **70 %** des sites échouent (Baymard).
- **Pas de pop-up agressif** en haut de home (55 % des sites le font ; réactions négatives — Baymard/NN/g).

### 4.3 Ordre de sections (synthèse, mobile-first)
`(1) Hero` = valeur + identité + 1 CTA → `(2) Univers produits` (étendue : sacoche **Dispo** + teasers **Bientôt**) →
`(3) Spotlight best-seller` (sacoche → `/sacoche`) → `(4) Preuve sociale / UGC` → `(5) Engagement océan` →
`(6) Manifeste (teaser → /about)` → `(7) Waitlist / newsletter` → `(8) Footer riche`. (Journée « valeur → décision → confiance → conversion ».)

### 4.4 Navigation (IA)
- Catalogue **de niche** → **nav horizontale simple de 5-7 entrées** (pas de méga-menu, réservé aux gros
  catalogues). **Headers cliquables**, **scope visible**, **« Voir tout »** sur mobile (Baymard/NN/g).
- La nav est le **point faible n°1 du secteur** (58 % desktop / 67 % mobile « médiocre à mauvais » — Baymard) →
  **un vrai différenciateur** si on la soigne.
- **Nav cible Hamarea** : **Accueil · La Sacoche · L'Univers · À propos** + (recherche, compte, panier, langue).

### 4.5 Branding ↔ conversion (« brandformance »)
- Storytelling et CTA clairs **se renforcent** ; l'échec, c'est le contenu de marque qui **bloque** le chemin
  produit. Garder le **manifeste en teaser** sur la home, la profondeur sur **/about**, **chaque bloc shoppable**.
- ⚠️ **Méfiance sur les stats de storytelling** (« 63 % achètent une marque à histoire », « 90 % des décisions
  sont émotionnelles », « +270 % avec des avis ») : **non vérifiables / blogs d'agence**. Ce qui est mesurable :
  l'**A/B test de CTA** et les **avis** (volume + note près du CTA). Investir la vérif là-dessus.

### 4.6 Repères de conversion (poser des objectifs réalistes)
- CVR globale ~**1,9-2 %** ; Shopify ~**2,5-3 %** ; **mode/apparel 2-3 %** ; **> 3,2 %** = top-20 %, **> 4,7 %** = top-10 %.
- Contentsquare 2026 : **récurrents 2,9 %** vs **nouveaux 1,7 %** ; **desktop ~74 % > mobile**.
- **Vitesse = levier dur** : le rebond grimpe ~**32 %** quand le chargement passe de 1 s à 3 s → **vidéo/anim
  hero lourdes ont un coût réel de conversion** (NN/g, Contentsquare).

---

## 5. SOTA 2026 — Produits « à venir », waitlist & RGPD

### 5.1 Coming-soon / teaser (UX)
- Bloc **mono-objectif** : **un seul CTA** = capter l'e-mail (« Rejoindre la liste », « Accès prioritaire »,
  « Sois prévenu ») ; les CTA concurrents diluent (Shopify, 2025).
- **Incentiver** l'inscription (early-bird, accès anticipé, exclusivité) ; **date de sortie + compte à rebours**
  *honnêtes* pour créer de l'urgence et des retours (Shopify).
- ⚠️ **Baymard** : presque **personne n'utilise un « Notify me »**, surtout s'il **force la création de compte**
  → **e-mail seul, sans compte**. Et ~**30 %** des utilisateurs partent si on dit juste « épuisé » → préférer une
  **date / pré-commande** quand c'est possible.
- **Laisser l'utilisateur choisir quels produits** l'intéressent (auto-segmentation) → alertes pertinentes,
  moins de désinscriptions (Shopify).

### 5.2 Capture e-mail qui convertit
- **Un seul champ e-mail** (le multi-champ baisse la conversion ; profilage progressif ensuite) ; **CTA bénéfice**
  (« Accès prioritaire ») > « Envoyer » (Waitlister, 2025).
- **Mobile-first** : cibles **≥ 44 px**, < 3 s, CTA sticky.
- **Preuve sociale dynamique** (compteur « 1 247 inscrits », inscriptions en temps réel) > statique *(vendeur — directionnel)*.
- **Repères** (vendeur, orientés SaaS → **mous** pour le DTC) : trafic froid **2-5 %**, chaud **6-12 %**.
  **Convertir vite** la liste (semaines), avant qu'elle refroidisse.

### 5.3 Conformité UE (RGPD/ePrivacy) — **à respecter dès le 1er e-mail**
- **Base légale = consentement préalable (opt-in)** pour le marketing B2C ; consentement **libre, spécifique,
  éclairé, univoque** par **action positive** → **case décochée**, **jamais pré-cochée**, **pas** via l'acceptation
  des CGU (CNIL ; Mailchimp).
- **Case granulaire**, mention de l'usage des données, **lien vers la politique de confidentialité**,
  **retrait aussi simple que l'inscription** (Klaviyo).
- **Double opt-in** : **non explicitement imposé** par le RGPD à l'échelle UE, mais **fortement recommandé**
  (preuve du consentement — principe d'*accountability*) ; **quasi-obligatoire en Allemagne** (BGH/DSK), avec un
  **e-mail de confirmation neutre** (sans marketing). En France (CNIL) : opt-in requis, double opt-in recommandé.
- **Chaque e-mail** : identité de l'expéditeur claire + **désinscription** simple et fonctionnelle.
- **Journaliser le consentement** : wording exact affiché + horodatage + source + version du formulaire (ce
  qu'un régulateur demandera).
- ⚠️ Compromis : ~**61 %** ne confirment jamais le double opt-in (taux de confirmation ~39 % — Mailchimp) → la
  liste rétrécit, mais la **preuve** prime. *(Hamarea : on stocke le consentement + on prévoit le double opt-in.)*

---

## 6. SOTA 2026 — CRO & UX e-commerce (rappel chiffré)

> Sources primaires : **Baymard, Stripe**. Chiffres **fournisseurs signalés**.

- **Abandon panier ≈ 70,2 %** (Baymard, 50 études). Causes : **frais surprises 39 %** (n°1), compte forcé 19 %,
  défiance CB 19 %, checkout trop long 18 %, total non visible 14 %. → **transparence des coûts = levier n°1**.
- **Refondre le checkout** peut donner **+35 %** de conversion ; viser **~8-14 champs** (moyenne US ~11,3 ;
  ~23,5 éléments vs 12-14 optimal) ; **guest checkout** + création de compte **après** l'achat (Baymard).
- **Mobile** : ~**59 %** des ventes 2025, ~**73 %** des sessions, **convertit sous le desktop** (écart qui se
  resserre) ; **sticky add-to-cart +5-12 %**, hauteur **≥ 56 px** *(vendeur)*.
- **Wallets express** (Stripe, avr. 2025) : **Apple Pay +22,3 %** de conversion / +22,5 % de revenu ; le proposer
  **tôt** via l'Express Checkout Element = **×2** ; **+1 moyen de paiement pertinent = +7,4 %** conversion / +12 % revenu.
- **BNPL** : **AOV +20-40 %** typique *(chiffres fournisseurs)*.
- **Preuve sociale / UGC** : **93-97 %** lisent des avis ; ceux qui **engagent avec avis/UGC** convertissent
  **+144 %** / +162 % de revenu par visiteur *(Bazaarvoice Shopper Index — fournisseur)* ; **10 avis → +45 %**.
- **Port offert** : seuil → **AOV +20-40 %** ; **barre de progression dynamique +15-25 %** ; seuil optimal
  **~+20-30 % de l'AOV** *(vendeur)*. *(Hamarea : seuil 39 € déjà calibré + barre dans le drawer.)*

---

## 7. SOTA 2026 — Performance & technique (Next.js 15)

> Sources primaires : **web.dev/Google, nextjs.org, W3C/WCAG, Google Search Central**.

### 7.1 Core Web Vitals (75e centile terrain, fenêtre CrUX 28 j)
- **LCP ≤ 2,5 s** · **INP ≤ 200 ms** (a remplacé FID le 12/03/2024) · **CLS ≤ 0,1**.
- **Vitesse = argent** : **+0,1 s** de vitesse mobile → **+8,4 %** de conversion retail / **+9,2 %** d'AOV
  (Deloitte/Google « Milliseconds Make Millions »).

### 7.2 Images / polices / vidéo (Next.js)
- `next/image` sort **WebP par défaut** ; **AVIF non activé d'office** → `formats:['image/avif','image/webp']`
  (préfère AVIF, fallback WebP). **Déjà fait dans `next.config.ts` ✓.**
- Chargement **lazy par défaut** → image **LCP** en **`priority`** (Next 15 ; **NB** : sur Next 16 `priority`
  est déprécié au profit de `preload`). **`sizes` quasi-obligatoire** (sinon `100vw` → fichiers surdimensionnés).
  **`width/height` ou `fill`** pour réserver le ratio et **éviter le CLS**. `quality` défaut **75**.
- `next/font` **auto-héberge** + `size-adjust` (zéro CLS), **`display:swap`**, **import unique** en layout,
  **polices variables** de préférence.
- **Vidéo** : **`poster`** (évite le CLS) + dimensions explicites + **`preload="none"/"metadata"`** hors écran.
  *(Hamarea : reels en `preload="none"` ✓ ; **posters manquants** → à ajouter.)*

### 7.3 SEO & données structurées
- **JSON-LD** (recommandé Google). **`Organization` / sous-type `OnlineStore`** sur **UNE** page (home ou about),
  **pas** sur toutes : `name`, `logo` (**≥ 112×112**, crawlable), `url`, `sameAs`, `address`, contact. **Manquant
  aujourd'hui** → **à ajouter** (élément clé d'un *site de marque*).
- **`Product` + `Offer`** (`price`, `priceCurrency`, `availability`) ; **`brand` = objet `Brand`**, pas une string ;
  `BreadcrumbList`, `Review`/`AggregateRating`, `ProductGroup` (variantes). *(Hamarea : `Product`/`Offer`/`FAQ`/
  `Breadcrumb` déjà sur la sacoche ; avis derrière flag.)*
- **hreflang bidirectionnel + auto-référent + `x-default`** ; **canonical auto-référent par locale** (sinon Google
  ignore les hreflang). **Sous-répertoires** (`/fr/ /en/…`) = meilleur choix multi-marché après les ccTLD.

### 7.4 Accessibilité (WCAG 2.2)
- **Nouveau SC 2.5.8 — Taille de cible (min, AA) : ≥ 24×24 px** (ou exception d'espacement). **SC 2.5.5 (AAA) :
  44×44 px.** *(Hamarea : BuyBox/steppers déjà à 44 px ✓ ; vérifier swatches/sticky bar.)*
- **Contraste** : **4,5:1** texte normal · **3:1** grand texte · **3:1** composants UI/icônes (SC 1.4.3 / 1.4.11).
- **SC 2.4.11 Focus Appearance (AA)** : indicateur ≥ périmètre 2 px, contraste ≥ 3:1. *(`:focus-visible` déjà posé ✓.)*

---

## 8. Conformité UE 2026 (contrainte dure)

- **Omnibus (Dir. (EU) 2019/2161, appl. 28/05/2022)** : tout « −X % » référence le **prix le plus bas des 30
  derniers jours** (art. 6a 98/6/CE) ; **faux avis interdits** → **divulguer si/comment** les avis sont vérifiés ;
  classements payants à divulguer. **Amendes jusqu'à ≥ 4 % du CA** (ou 2 M€).
- **Droit de rétractation 14 j** (Dir. 2011/83/UE) sans motif (départ : **livraison** des biens) ; **formulaire-type**
  à fournir ; **défaut d'information ⇒ +12 mois**.
- ⚠️ **NOUVEAU — « bouton de rétractation » obligatoire au 19 juin 2026** : pour les contrats à distance via
  interface en ligne, une **fonction de rétractation facilement accessible** doit exister pendant les 14 j.
  **Échéance imminente** → à intégrer *(analyses William Fry / Taylor Wessing ; vérifier le texte final EUR-Lex).* 
- **Cookies (CNIL)** : **refuser aussi simple qu'accepter**, **même 1er niveau**, même poids visuel, même nb de
  clics. *(Hamarea : bandeau de consentement présent → vérifier l'équivalence accept/refus.)*
- **Consent Mode v2** **obligatoire EEE depuis mars 2024** pour Google Ads/GA4 (`ad_user_data`, `ad_personalization`
  en plus de `ad_storage`/`analytics_storage`).

---

## 9. Rapport des améliorations manquantes (gap analysis)

> Ce qui manque au site **actuel** pour être un **site de marque SOTA 2026**. Sévérité : 🔴 bloquant marque ·
> 🟠 fort impact · 🟡 moyen. Statut : ✅ livré dans ce chantier · ◐ partiel · ☐ à faire.

### 9.1 🔴 Identité & structure de marque
| # | Manque | Action | Statut |
|---|---|---|---|
| M1 | **Pas de home de marque** : l'accueil = fiche sacoche | Créer une **home de marque** (passerelle + univers + waitlist) | ✅ |
| M2 | **Sacoche non isolée** sur sa page | Déplacer la landing sacoche sur **`/sacoche`** | ✅ |
| M3 | **Identité visuelle non alignée** (premium serif) au positionnement sport/océan | **Palette Lagon/Corail + Oswald** (re-map des tokens) | ✅ |
| M4 | **Étendue de gamme invisible** (Baymard 40-50 %) | **Univers produits** : sacoche **Dispo** + 4 teasers **Bientôt** | ✅ |
| M5 | **Nav par ancres**, pas multi-page | **Nav de marque** (Accueil · La Sacoche · L'Univers · À propos) | ✅ |

### 9.2 🟠 Acquisition, preuve, conformité
| # | Manque | Action | Statut |
|---|---|---|---|
| M6 | **Aucune capture d'audience** (ni waitlist ni newsletter) | **Waitlist RGPD** (case décochée, e-mail seul, consentement journalisé, auto-segmentation produit) branchée Supabase | ✅ |
| M7 | **`Organization`/`OnlineStore` absent** (clé d'un site de marque) | Ajouter le **JSON-LD `Organization`/`OnlineStore`** sur la home | ✅ |
| M8 | **Manifeste/valeurs non surfacés** | **Engagement océan + manifeste teaser** (shoppable, lien /about) | ✅ |
| M9 | **i18n** de la nouvelle copie marque (fr/en/es/de) | **`brand-content.ts`** typé 4 locales | ✅ |
| M10 | **Avis fabriqués** (risque Omnibus) | Garder le schéma avis **derrière flag** ; brancher une **vraie source** | ◐ |
| M11 | **Presse non sourcée** / « édition limitée » (Omnibus) | Sourcer ou retirer | ☐ |
| M12 | ⚠️ **Bouton de rétractation UE (19/06/2026)** | Ajouter la fonction de rétractation + CGV/rétractation | ☐ |
| M13 | **Consent Mode v2 / tracking serveur** (CAPI) | À brancher avec IDs réels | ☐ |

### 9.3 🟡 Conversion, perf, finition
| # | Manque | Action | Statut |
|---|---|---|---|
| M14 | **Wallets express / BNPL on-page** (Apple Pay +22,3 %) | Express Checkout Element (clés + domaine) | ☐ |
| M15 | **UGC / avis-photo** près du hero | Bande UGC marque + vraie source d'avis | ◐ |
| M16 | **Posters vidéo** manquants (CLS/perf) | Générer un poster par reel | ☐ |
| M17 | **Best-seller comme routeur** (23 %) | **Spotlight sacoche** sur la home → `/sacoche` | ✅ |
| M18 | **Images sources lourdes** | Compresser/transcoder en amont | ☐ |
| M19 | **Sentry / tests E2E / budget Lighthouse** | Observabilité + CI | ☐ |

---

## 10. Architecture cible

### 10.1 Sitemap
```
/                     ← HOME DE MARQUE (nouveau) : hero marque · univers · spotlight sacoche · preuve · océan · manifeste · waitlist
/sacoche              ← Landing produit sacoche (déplacée depuis /) — hero achat + 11 sections + sticky bar
/products /categories ← Catalogue Supabase (existant)
/about                ← Manifeste complet (existant, à enrichir)
/contact /legal/*     ← (existant)
/account/* /admin/*   ← (existant)
[à venir] /lycra /capuche /cup … ← pages coming-soon dédiées (P1)
```

### 10.2 Navigation
- **Header** : `Accueil` · `La Sacoche` (→ `/sacoche`) · `L'Univers` (→ `/#univers`) · `À propos` + recherche /
  compte / panier / langue. Overlay transparent sur les pages à hero plein écran (`/` et `/sacoche`).
- **Footer** : colonnes **Boutique** (La Sacoche, L'Univers, Bientôt) · **Marque** (À propos, Engagement océan,
  Contact) · **Compte** · **Légal** (CGV, Confidentialité, Mentions, **Rétractation 14 j**).

---

## 11. Roadmap priorisée

**P0 — Faire exister la marque (ce chantier)**
1. ✅ Identité : palette Lagon/Corail + Oswald (re-map tokens).
2. ✅ Home de marque (hero · univers · spotlight · preuve · océan · manifeste · waitlist).
3. ✅ Sacoche → `/sacoche` ; nav de marque ; footer ; copie fr/en/es/de.
4. ✅ Waitlist RGPD branchée Supabase + `Organization`/`OnlineStore` JSON-LD.

**P1 — Convertir & se conformer**
5. ☐ **Bouton de rétractation (19/06/2026)** + page CGV/rétractation.
6. ☐ **Express Checkout / Apple-Google Pay** + BNPL on-page.
7. ◐ **Vraie source d'avis** (Judge.me/Loox ou Supabase) → activer le schéma avis.
8. ☐ **Consent Mode v2 + tracking serveur** (Meta CAPI/TikTok) avec IDs réels.
9. ☐ **Double opt-in** waitlist (e-mail de confirmation neutre) + e-mails Resend.

**P2 — Étendre & polir**
10. ☐ Pages coming-soon dédiées `/lycra` `/capuche` `/cup` (+ pré-commande quand pertinent).
11. ☐ Posters vidéo, compression images, UGC réel.
12. ☐ Sentry + Playwright (E2E checkout) + budgets Lighthouse en CI.
13. ☐ Sourcer/retirer presse & « édition limitée » (Omnibus).

---

## 12. Sources

**Primaires / benchmark (à privilégier)**
- NN/g — [Tone of Voice (4 dimensions)](https://www.nngroup.com/articles/tone-of-voice-dimensions/) · [Impact du ton](https://www.nngroup.com/articles/tone-voice-users/) · [Homepage : 5 principes](https://www.nngroup.com/articles/homepage-design-principles/) · [Menu Design](https://www.nngroup.com/articles/menu-design/) · [Accessibilité visuelle](https://www.nngroup.com/articles/visual-treatments-accessibility/) · [Couleur](https://www.nngroup.com/articles/color-enhance-design/)
- Baymard — [Navigation/Homepage UX 2025](https://baymard.com/blog/ecommerce-navigation-best-practice) · [Étendue de gamme en home](https://baymard.com/blog/inferring-product-catalog-from-homepage) · [Abandon panier](https://baymard.com/lists/cart-abandonment-rate) · [Champs de checkout](https://baymard.com/blog/checkout-flow-average-form-fields) · [Product page UX 2026](https://baymard.com/blog/current-state-ecommerce-product-page-ux) · [« View All » mobile](https://baymard.com/blog/mobile-main-nav-view-all)
- Contentsquare — [Benchmark conversions 2026](https://contentsquare.com/guides/digital-experience-benchmark/conversions/) · [Benchmarks 2025](https://contentsquare.com/press/2025-digital-experience-benchmarks/)
- Stripe — [Impact conversion des moyens de paiement](https://stripe.com/blog/testing-the-conversion-impact-of-50-plus-global-payment-methods) · [+10,5 % de revenu checkout](https://stripe.com/newsroom/news/payments-revenue-uplift)
- web.dev/Google — [Web Vitals](https://web.dev/articles/vitals) · [INP devient CWV](https://web.dev/blog/inp-cwv-march-12) · Deloitte/Google [Milliseconds Make Millions](https://www.deloitte.com/ie/en/services/consulting/research/milliseconds-make-millions.html)
- Next.js — [Image](https://nextjs.org/docs/app/api-reference/components/image) · [Fonts](https://nextjs.org/docs/app/getting-started/fonts) · Vercel [next/font](https://vercel.com/blog/nextjs-next-font)
- Google Search Central — [Organization](https://developers.google.com/search/docs/appearance/structured-data/organization) · [E-commerce](https://developers.google.com/search/docs/specialty/ecommerce/include-structured-data-relevant-to-ecommerce) · [hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions) · [Multi-régional](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- W3C/WAI — [SC 2.5.8 cibles (min)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) · [SC 2.5.5 (AAA)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) · [Contraste 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum) · [Non-text 1.4.11](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html) · [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- CNIL — [Prospection par e-mail](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique) · [Cookies : refus aussi simple](https://www.cnil.fr/en/cookies-equally-easily-accepted-or-refused-cnil-sends-second-series-orders-comply) · Google [Consent Mode v2](https://support.google.com/google-ads/answer/13695607)
- EUR-Lex — [Droit de rétractation / CRD 2011/83/UE](https://eur-lex.europa.eu/EN/legal-content/summary/consumer-information-right-of-withdrawal-and-other-consumer-rights.html) · [Omnibus 2019/2161](https://eur-lex.europa.eu/eli/dir/2019/2161/oj)

**Secondaires / agences / commentaires (directionnels)**
- Figma [Tendances web 2026](https://www.figma.com/resource-library/web-design-trends/) · Ebaqdesign [Archétypes](https://www.ebaqdesign.com/blog/brand-archetypes) · Design Work Life [Polices sport 2026](https://designworklife.com/35-sports-fonts-that-score-big-in-year/) · Design Shack [Polices condensées](https://designshack.net/articles/typography/best-condensed-narrow-fonts/) · StudioLimb [Contraste WCAG 2026](https://www.studiolimb.com/guides/wcag-color-contrast-guide.html) · Wise Owl [Couleurs accessibles](https://wiseowlmarketing.com/accessible-website-colors-that-pass-wcag/)
- Marques : Patagonia [Core Values](https://www.patagonia.com/core-values/) · Finisterre [History](https://finisterre.com/en-us/pages/history) · Vissla [Sustainability](https://www.vissla.com/pages/sustainability) · Zamora [Yeti narrative](https://zamora.design/why-yetis-strategic-narrative-is-one-of-the-most-effective-brand-stories-ever-told/) · The Brand Gym [Liquid Death](https://thebrandgym.com/mudering-a-market-with-daring-distinctiveness-liquid-death/) · Highsnobiety [Vuori](https://www.highsnobiety.com/p/what-is-vuori-brand/)
- Waitlist / coming-soon : Shopify [Coming soon](https://www.shopify.com/blog/coming-soon-page) · Waitlister [Optimisation](https://waitlister.me/growth-hub/guides/waitlist-landing-page-optimization-guide) · GetWaitlist [Benchmarks](https://getwaitlist.com/blog/waitlist-benchmarks-conversion-rates) · Klaviyo [Consentement RGPD](https://help.klaviyo.com/hc/en-us/articles/360003536031) · Mailchimp [Single vs double opt-in](https://mailchimp.com/resources/why-single-opt-in-and-an-update-for-our-eu-customers/)
- CRO/UGC : Shopify [Shop Pay](https://www.shopify.com/blog/shop-pay-checkout) · Bazaarvoice [UGC](https://www.bazaarvoice.com/blog/the-product-review-imperative-why-ugc-is-your-1-conversion-tool/) · Capital One [Avis](https://capitaloneshopping.com/research/online-reviews-statistics/) · Statista [M-commerce](https://www.statista.com/topics/11883/mobile-commerce-worldwide/) · Triple Whale [Benchmarks 2025](https://www.triplewhale.com/blog/ecommerce-benchmarks)
- UE (commentaires) : William Fry [Bouton de rétractation 06/2026](https://www.williamfry.com/knowledge/world-consumer-rights-day-part-3-mandatory-withdrawal-button-coming-june-2026/) · Taylor Wessing [Withdrawal button](https://www.taylorwessing.com/en/insights-and-events/insights/2026/02/withdrawal-button-as-compliance-risk-for-eu-and-non-eu-businesses) · Demodia [Double opt-in DE](https://demodia.com/articles/revenue-operations/is-double-opt-in-really-required-for-email-marketing-in-germany)

> **Fiabilité.** Identité, architecture, perf, accessibilité et droit UE s'appuient sur des **sources primaires**.
> Les **lifts de conversion fournisseurs** (Shop Pay, BNPL, UGC, waitlist) sont **directionnels** (orientés
> utilisateurs éligibles/récurrents) — à confirmer par A/B test. Les chiffres « storytelling » très cités sont
> **non vérifiables** : ne pas les présenter comme des garanties de conversion.
