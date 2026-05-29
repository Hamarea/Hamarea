# Audit SOTA 2026 — Landing dropshipping mono-produit « Hamarea »

> Rapport complet : analyse de l'existant · erreurs & risques classés par sévérité ·
> documentation de référence (state-of-the-art 2026) · stack recommandée ·
> plan de correction priorisé. La dernière section liste **ce qui a déjà été
> corrigé** dans ce commit et **ce qui reste à faire**.
>
> Date : 2026-05-29 · Périmètre : `Hamarea/Hamarea` (Next.js 15 + Supabase + Stripe + Tailwind v4).

---

## 0. Résumé exécutif

Hamarea est une **landing page de vente mono-produit** (sacoche étanche IPX8) bâtie sur
une base technique moderne et propre (Next.js 15 App Router, TS strict, RLS Supabase,
décomposition en composants soignée). La structure de conversion est déjà bonne :
hero plein écran, preuve sociale, USP, démonstration, vidéos verticales, comparatif,
**packs quantitatifs (decoy/anchoring)**, avis, FAQ, barre d'achat sticky.

Mais l'audit révèle **un défaut de sécurité critique**, un **pipeline de paiement
non fonctionnel**, plusieurs **risques de conformité UE (Omnibus/RGPD)**, des **fuites
de performance (Core Web Vitals)** et une **internationalisation en trompe-l'œil**.

**Verdict :** excellent socle, mais **non commercialisable en l'état** tant que la faille
de prix et le tunnel de paiement ne sont pas corrigés, et **exposé juridiquement** par
les faux signaux (compte à rebours figé, avis fabriqués, faux prix barré permanent).

| Domaine | Note /10 (avant) | Note /10 (après ce commit) |
|---|---|---|
| Sécurité paiement | 2 | 7 |
| Conformité UE (Omnibus/RGPD) | 3 | 6 |
| Performance / CWV | 5 | 7,5 |
| Conversion / CRO | 6,5 | 7,5 |
| SEO technique | 5 | 8 |
| i18n / accessibilité | 3 | 5 |
| Fiabilité / DX | 6 | 6,5 |

---

## 1. Méthodologie & périmètre

- **Analyse de l'existant** : lecture exhaustive du code (`src/app`, `src/components`,
  `src/lib`, `src/stores`, `middleware`, `next.config`, `globals.css`, migrations,
  CI, assets `public/`).
- **Veille SOTA 2026** : deux recherches documentaires sourcées (Baymard Institute,
  Nielsen Norman Group, Stripe, Google/web.dev, Next.js/Vercel, Supabase, EUR-Lex,
  FTC, CNIL, Cialdini, Kahneman/Tversky). Sources citées en §4 et §8.
- **Périmètre exclu** : pas d'exécution de Lighthouse en condition réelle (pas de
  déploiement), pas d'audit DB live (aucun projet Supabase n'est nommé « Hamarea » et
  la landing n'utilise pas la base — voir §3.7).

---

## 2. Analyse de l'existant

### 2.1 Architecture & stack
- **Next.js 15.5 (App Router)**, React 19, TypeScript strict, Tailwind v4 (beta),
  next-intl (fr/en/es/de), Zustand (panier + couleur), Stripe SDK, Supabase (`@supabase/ssr`).
- Routing i18n `localePrefix: "as-needed"` (la locale par défaut `fr` n'est pas préfixée).
- Deux couches « produit » coexistent :
  - **`src/lib/product.ts` (statique)** → alimente la **landing** (`/[locale]/page.tsx`).
  - **Catalogue Supabase** (`src/lib/queries.ts`) → alimente `/[locale]/products/[slug]`.
- Backend e-commerce complet en base (23 tables, RLS partout, webhooks idempotents,
  RPC `decrement_stock_for_order`) — bien conçu mais **déconnecté** de la landing.

### 2.2 La landing, section par section (`/[locale]/page.tsx`)
`Hero (plein écran + BuyBox)` → `TrustBar` → `PressBar` → `UspGrid` → `HowItWorks` →
`VideoReel` → `ColorsShowcase` → `Comparison` → `BundlePicker` → `Testimonials` →
`Faq` → `CTA de clôture` → `StickyBuyBar`.

C'est une séquence de persuasion classique et pertinente (proche des recommandations
§4). Points forts : barre sticky (apparaît à `scrollY > 600`), packs 1/2/3 avec
remise progressive (decoy), reels 9:16 autoplay en `IntersectionObserver`, FAQ +
JSON-LD `FAQPage`, swatches couleur synchronisés via store Zustand.

### 2.3 Commerce / paiement
- Panier client persistant (`localStorage` via `zustand/persist`).
- Tunnel : `/cart` → `/checkout` (formulaire adresse maison en 3 étapes) → `POST
  /api/checkout/session` → **Stripe Checkout hosted** (redirection).
- Webhook `POST /api/webhooks/stripe` : vérifie la signature, déduplique sur
  `webhook_events(provider, event_id)` (unique), puis traite l'événement.

### 2.4 Points forts à conserver
- RLS sur toutes les tables, isolation de la `service_role` (admin/webhooks).
- Idempotence webhook via contrainte unique (mécanisme correct).
- Validation Zod aux frontières d'API. `next/font` (Inter + Fraunces). TS strict.
- Décomposition composant claire, design tokens centralisés, CI (typecheck/lint/build).

---

## 3. Erreurs & risques, classés par sévérité

### 3.1 🔴 CRITIQUE — Sécurité

**E1. Falsification de prix au checkout.**
`src/app/api/checkout/session/route.ts` faisait confiance au champ `unitPriceCents`
**envoyé par le navigateur** et le transmettait tel quel à Stripe
(`price_data.unit_amount`). Un acheteur pouvait commander à **0,01 €**. `name`,
`image` et `currency` étaient également fournis par le client (faux libellés possibles).
→ **Corrigé** (§9, E1) : prix recalculé côté serveur depuis `lib/product.ts`.

**E2. Pipeline de fulfillment cassé.**
Le webhook écoutait `payment_intent.succeeded` et lisait `pi.metadata.order_id`, mais
la session était créée **sans métadonnée** et **aucune commande n'était créée**.
Conséquences : commandes jamais marquées « payées », stock jamais décrémenté, **adresse
client saisie puis jetée** (jamais transmise à Stripe ni persistée).
→ **Partiellement corrigé** (§9, E2) : gestion de `checkout.session.completed`, Stripe
collecte l'adresse. La **persistance de commande** reste à brancher (§10).

### 3.2 🟠 ÉLEVÉ — Conformité légale UE (2026)

**E3. Faux compte à rebours / fausse urgence figée.** Bannière
« −30 % jusqu'à dimanche » codée en dur → **dark pattern** sanctionné par la FTC et la
**directive Omnibus**. → **Corrigé** (bannière honnête sans deadline).

**E4. Faux prix barré permanent.** `compareAtCents 3990` vs `priceCents 2490` (−38 %)
affiché en permanence. Omnibus impose que tout prix de référence corresponde au **prix
le plus bas pratiqué les 30 derniers jours**. → **À traiter** (donnée métier) ;
`priceValidUntil` ajouté au JSON-LD.

**E5. Avis & notes fabriqués (4,8/5 · 1 247 avis · 12 500 ventes).** Présents
sur-page **et dans le JSON-LD** → risque d'**action manuelle Google** + interdiction
Omnibus des faux avis. → **Atténué** : le balisage `AggregateRating`/`Review` est
désormais **conditionné à un flag** (`NEXT_PUBLIC_ENABLE_REVIEW_SCHEMA`, off par défaut).
Source réelle d'avis à brancher (§10).

**E6. Mentions presse non sourcées** (« GQ France », « Marie Claire »…) et
**« Édition limitée » sur les 3 couleurs** (fausse rareté). → **À traiter** (métier).

**E7. RGPD / ePrivacy : aucun bandeau de consentement** et aucun tracking — bloquant
dès qu'un pixel Meta/TikTok/GA sera ajouté (cookies non essentiels = opt-in explicite,
bouton « Tout refuser » au 1er niveau). → **À implémenter** (§10).

**E8. Incohérence livraison.** Seuil de port offert à **79 €** pour un produit à
**24,90 €** (jamais atteint, même en pack ×3 ≈ 56 €), alors que le hero promettait
« Livraison 48h offerte » → promesse trompeuse. → **Corrigé** : seuil recalibré à 39 €
et **tout le copy aligné**.

### 3.3 🟠 ÉLEVÉ — Performance / Core Web Vitals

**E9. Hero = 3 images plein écran montées simultanément** (`HeroImage` client,
toggle d'opacité). → **Corrigé** : une seule image LCP rendue.

**E10. AVIF non activé** dans `next.config` (WebP seul par défaut). → **Corrigé**
(`formats: ['image/avif','image/webp']`).

**E11. ~11 Mo de vidéos `.mp4` brutes** (`/public/reels`, 2,9 + 3,1 + 5,1 Mo), non
transcodées, sans `poster`, premier reel en `preload="auto"`. → **Corrigé** :
`preload="none"`. Transcodage/poster recommandés (§10).

**E12. Auth Supabase exécutée dans le middleware sur CHAQUE page** (y compris la
landing) → round-trip réseau inutile à chaque navigation (coût TTFB). → **Corrigé** :
`getUser()` limité à `/admin` et `/account`.

**E13. Visuels lourds** (hero/colors 0,5 Mo chacun) servis via `next/image` (optimisés
à la volée) — acceptable, mais sources à compresser en amont (§10).

### 3.4 🟡 MOYEN — Conversion / CRO

- **E14. Pas de wallet express** (Apple Pay/Google Pay/Link) ni de « Acheter
  maintenant » direct : le plus gros levier de conversion (Stripe : Apple Pay
  **+22,3 %** de conversion). Le redirect Checkout hosted les expose tout de même.
- **E15. Histoire promo incohérente** : −38 % (barré) vs −30 % (bannière) vs −15/−25 %
  (packs). → bannière corrigée ; harmoniser le reste (métier).
- **E16. CTA « Ajouter au panier »** uniquement (pas de raccourci paiement) ; le tunnel
  maison ajoutait une **double saisie d'adresse**. → **Corrigé** (tunnel simplifié).
- **E17. Boutons recherche / menu mobile non fonctionnels** dans le header. → backlog.

### 3.5 🟡 MOYEN — SEO technique

- **E18. `metadataBase` absent** → images OG en chemin relatif cassées. → **Corrigé**.
- **E19. Pas de canonical ni hreflang** sur la home. → **Corrigé** (`generateMetadata`).
- **E20. Sitemap incohérent** : préfixe systématiquement `/${locale}` alors que
  `as-needed` ne préfixe pas `fr` → URLs non canoniques. → **Corrigé** + `lastModified`
  + alternates hreflang.
- **E21. JSON-LD produit pauvre** : pas de `priceValidUntil`, ni `shippingDetails`, ni
  `hasMerchantReturnPolicy`, ni `BreadcrumbList`. → **Corrigé**.

### 3.6 🟡 MOYEN — i18n & accessibilité

- **E22. Landing 100 % en français codé en dur.** Tous les composants produit
  (`hero`, `usp`, `bundle`, `faq`, `testimonials`, `comparison`, `how-it-works`…)
  ignorent next-intl ; `/en` `/es` `/de` affichent du français. `formatMoney` figé
  `fr-FR`/`EUR`. → **À faire** (chantier dédié, §10) — non corrigé dans ce commit.
- **E23. Accessibilité** : pas de `prefers-reduced-motion`, accordéon FAQ sans
  `aria-controls`. → **Corrigé**.

### 3.7 🟡 MOYEN — Fiabilité / intégrité des données

- **E24. Deux sources produit** (statique vs Supabase) non synchronisées : prix, avis,
  **stock** de la landing sont fictifs/indépendants de la base.
- **E25. CI sans tests** (ni Vitest ni Playwright ni budget Lighthouse).
- **E26. Pas d'observabilité** (Sentry) ni d'`error.tsx`/`global-error.tsx`.

---

## 4. Documentation SOTA 2026 — CRO & science de la persuasion

> Synthèse sourcée. Repères : conversion e-commerce moyenne **1,8–3 %**, top 10 % **>4,7 %**
> (souvent panier < 80 $) ; **mobile ≈ 70 %** du trafic ; **abandon panier 70,2 %**
> (Baymard, 2025–26), dont une part « réparable » valant **+35 % de conversion**.

### 4.1 Formule hero qui convertit (mobile-first)
1. **Titre orienté bénéfice** (transformation), pas le nom produit. (NN/g : ~57 % de
   l'attention est above-the-fold, mais on ne scrolle que si la promesse est forte.)
2. **Média réel en situation / UGC** (jamais une photo fond blanc « AliExpress »).
3. **Note + nombre d'avis** juste sous le titre (densité de preuve au point de décision).
4. **CTA primaire visible dès le 1er écran**, contraste fort (Von Restorff), grande
   cible tactile (Fitts) → **barre sticky** en bas sur mobile.
5. **Prix + ancre + micro-copy de réassurance** adjacents au CTA.
6. **Bandeau de confiance** ; les sceaux lourds vont au **checkout**, pas au hero.

### 4.2 Boîte à outils persuasion (et application produit)
- **Cialdini** : preuve sociale, rareté/urgence **réelles**, autorité, réciprocité,
  engagement, sympathie, unité. UGC sur fiche produit : **+161 %** de conversion
  (Taggbox) ; avis engagés **+144 %**.
- **Économie comportementale** : aversion à la perte (×2 vs gain équivalent),
  **ancrage** (prix de référence **réel** sous Omnibus), **effet decoy** (offre 1/2/3
  où la cible paraît évidente), framing de bundle.
- **Lois UX** : Hick (un CTA dominant par écran), Fitts (cible large dans le pouce),
  Von Restorff (CTA = élément le plus contrasté), position sériale (bénéfice fort en
  premier, garantie en dernier), Zeigarnik (barre de progression checkout), peak-end.

### 4.3 Confiance & inversion du risque (ce que Baymard mesure)
Top raisons d'abandon : **coûts additionnels trop élevés 39 %**, délai trop long 21 %,
manque de confiance CB 19 %, **création de compte forcée 19 %**, checkout trop long 18 %,
politique de retour 15 %, total non visible 14 %, pas assez de moyens de paiement 10 %.
→ **Transparence des coûts = levier n°1** ; garantie + retours gratuits = inversion du
risque ; **un seul** sceau de sécurité reconnaissable près des champs CB (+15–32 % pour
une marque inconnue).

### 4.4 Mobile, offre, checkout
- **Barre CTA sticky** dans la zone du pouce ; **checkout invité obligatoire**.
- **Minimiser les champs** : idéal **7–8 champs** vs 14,9 en moyenne (≈ ×2 trop long).
- **Paliers quantité / bundles** + **seuil de port offert ~20–30 % au-dessus de l'AOV**
  (barre de progression dynamique : +15–25 %). **BNPL** (Klarna/Afterpay) près du prix.
- **Wallets express** = le meilleur ROI d'un seul changement (Apple Pay **+22,3 %**,
  Shop Pay **×1,72** de complétion — Stripe/Shopify).

### 4.5 Message match & vitesse
- **Continuité pub → hero** (titre/offre/visuel) : bounce 40–60 % vs 60–90 %.
- **CWV** : LCP < 2,5 s, INP < 200 ms, CLS < 0,1 ; ~4–8 % de conversion perdus par
  seconde de LCP au-delà du seuil.

### 4.6 Conformité UE (contrainte dure, pas une note de bas de page)
- **Omnibus** : tout « −X % » référence le **prix le plus bas des 30 derniers jours** ;
  faux avis interdits (vérification d'achat requise). Sanctions jusqu'à **4 % du CA**.
- **Directive droits des consommateurs** : **rétractation 14 jours** (à afficher ;
  défaut d'information ⇒ +12 mois).
- **RGPD/ePrivacy** : cookies non essentiels en **opt-in**, « Tout refuser » d'égale
  importance au 1er niveau (CNIL a sanctionné Google **325 M€** en 2025).

---

## 5. Documentation SOTA 2026 — Stack technique & performance

### 5.1 Core Web Vitals (seuils & enjeux)
| Métrique | Bon | Mesure |
|---|---|---|
| **LCP** | ≤ 2,5 s | chargement (souvent l'image hero) |
| **INP** (remplace FID depuis 03/2024) | ≤ 200 ms | réactivité (souvent JS tiers + sur-hydratation) |
| **CLS** | ≤ 0,1 | stabilité visuelle (espaces non réservés) |
Évalués au **75ᵉ centile terrain (CrUX)**. Deloitte : **+0,1 s** de vitesse mobile ⇒
**+8,4 %** de conversion retail.

### 5.2 Next.js 15 — bonnes pratiques
- **Server Components par défaut** ; `'use client'` aux **feuilles** uniquement
  (réduit le bundle, améliore l'INP). Baseline ~87 Ko de runtime client.
- **Streaming/Suspense** ou **PPR (incrémental)** sur la fiche : shell statique au CDN
  + trous dynamiques (prix/stock) streamés.
- **`next/image`** : `formats:['image/avif','image/webp']`, **un** hero
  eager/`priority` (NB : sur Next 16, `priority` → `loading="eager"`+`fetchPriority="high"`),
  `sizes` partout, `placeholder="blur"`, `quality` ~75.
- **`next/font`** auto-hébergé `display:swap`. **`next/dynamic`** pour les widgets lourds.
- **Edge** pour middleware/shell ; **Node** obligatoire pour Stripe/webhooks/`service_role`.
- **Cache** : en Next 15, `fetch` **n'est plus caché par défaut** → opt-in explicite ;
  ISR + **revalidation par tag** déclenchée par un webhook DB Supabase.

### 5.3 Paiement, tracking, SEO, fiabilité
- **Stripe** : **Express Checkout Element** (Apple/Google Pay/Link/Klarna) au-dessus du
  **Payment Element** ; webhooks **Node**, idempotents, ACK rapide + traitement async ;
  **Radar** anti-fraude ; BNPL via Payment Element.
- **Tracking privacy-first** : **>50 %** des conversions navigateur ne sont plus
  trackées (ITP/iOS 26). → **Meta CAPI + TikTok Events API côté serveur**, dédupliqués
  via `event_id` (couverture ~90–98 %), **Consent Mode v2 (Advanced)** obligatoire EEE,
  GA4 + **Vercel Speed Insights** (RUM CWV) + **PostHog** (funnels/replay).
- **SEO** : JSON-LD `Product/Offer/AggregateRating/BreadcrumbList/FAQ` **dans le HTML
  initial**, valeurs cohérentes avec la page ; `generateMetadata` (canonical/OG/hreflang).
- **Fiabilité** : Zod aux frontières, `error.tsx`/`global-error.tsx`, **Sentry**,
  **Playwright** (E2E checkout en test mode) + **Vitest** + budget Lighthouse en CI.

### 5.4 Stack de référence 2026 (cible)
| Couche | Choix |
|---|---|
| Framework | Next.js 15 App Router, React 19, **PPR** sur la fiche, TS strict |
| Rendu | Shell statique edge + dynamique streamé ; **Node** pour Stripe/webhooks |
| Images | `next/image` AVIF→WebP, 1 hero eager, `sizes`, blur, CDN |
| Paiement | Stripe **Payment + Express Checkout Element**, webhooks idempotents, Radar |
| Tracking | **CAPI + TikTok Events API serveur**, dédup pixels, **Consent Mode v2** |
| RUM/Analytics | Vercel Speed Insights + PostHog |
| Email/Avis | Resend (transac.) + Klaviyo (cycle de vie) + Judge.me/Loox (avis) |
| Fiabilité | Sentry + Zod + error boundaries |
| Tests/CI | Playwright + Vitest + budgets Lighthouse/bundle |
| Hébergement | Vercel (edge), **co-localisé** avec la région Supabase |

---

## 6. Plan de correction priorisé

**P0 — Sécurité & paiement (bloquant)**
1. ✅ Prix recalculé serveur (anti-tampering).
2. ◐ Persistance de commande + `metadata.order_id` → webhook marque payé + décrémente stock.
3. ✅ Durcissement session Stripe (adresse, codes promo, idempotence).

**P1 — Conformité & confiance**
4. ✅ Bannière honnête (suppression deadline figée).
5. ✅ Avis structurés derrière flag (anti-faux-avis).
6. ☐ Bandeau **consentement RGPD** + **Consent Mode v2** + tracking serveur (CAPI/TikTok).
7. ☐ Prix barré conforme Omnibus (historique 30 j) ; presse sourcée ; « édition limitée » justifiée.
8. ✅ Seuil de port offert cohérent (39 €) + copy aligné.

**P2 — Performance, conversion, SEO, i18n**
9. ✅ AVIF/WebP, hero unique, reels `preload=none`, middleware scoping, headers sécurité.
10. ✅ SEO : `metadataBase`, canonical/hreflang, sitemap, JSON-LD enrichi, BreadcrumbList.
11. ✅ Accessibilité : reduced-motion, focus-visible, accordéon FAQ.
12. ☐ **i18n réelle** de la landing (next-intl partout, `formatMoney` localisé).
13. ☐ **Express Checkout / Payment Element** on-page (Apple/Google Pay) + BNPL.
14. ☐ Transcodage vidéos + posters ; compression sources images.
15. ☐ Sentry + Playwright (E2E checkout) + Vitest + budget Lighthouse en CI.

Légende : ✅ fait dans ce commit · ◐ partiel · ☐ à faire.

---

## 7. Scorecard conversion (les ~15 facteurs à plus fort impact)
1. Wallets express · 2. Transparence des coûts · 3. Titre orienté bénéfice ·
4. Média réel/UGC · 5. Vitesse/CWV · 6. CTA sticky mobile · 7. Avis près du titre ·
8. Checkout invité + champs minimaux · 9. Inversion du risque (garantie/retours) ·
10. Un CTA dominant · 11. Ancrage + bundles · 12. Seuil port offert + barre de progression ·
13. BNPL près du prix · 14. Un sceau de confiance au checkout · 15. Message match pub↔hero.
**Overlay conformité (non négociable UE)** : pas de faux timer/rareté/prix barré, avis
authentiques, rétractation 14 j affichée, consentement cookies « Tout refuser ».

---

## 8. Sources principales
Baymard (cart abandonment 2025-26, checkout, trust badges) · NN/g (fiches produit,
above-the-fold) · Stripe (payment methods Apr 2025, Express Checkout, webhooks,
Radar, Klarna) · Google web.dev (CWV, mai 2025) & Search Central (structured data) ·
Next.js/Vercel (Server Components, PPR, Image, caching, Speed Insights, Edge) ·
Supabase (SSR Next.js) · EUR-Lex / Your Europe (Omnibus, droit de rétractation) ·
FTC (dark patterns 2022) · CNIL/RGPD (Consent Mode v2, 2025) · Cialdini (*Influence*) ·
Kahneman & Tversky (prospect theory). Détail des URLs dans les briefings de recherche.

---

## 9. Détail des corrections appliquées dans ce commit

| ID | Fichier(s) | Correction |
|---|---|---|
| E1 | `lib/product.ts`, `api/checkout/session/route.ts` | `PACK_DISCOUNTS`/`unitPriceForPack`/`colorByName` ; la route **ignore le prix client** et recalcule depuis le catalogue ; rejette produit/couleur inconnus. |
| E2 | `api/webhooks/stripe/route.ts`, `route.ts` | Gestion `checkout.session.completed` (+`payment_intent.succeeded`) ; Stripe collecte l'adresse (`shipping_address_collection`) ; `metadata`+`payment_intent_data.metadata` ; `idempotencyKey` ; `runtime="nodejs"` ; try/catch → 502. |
| E3 | `[locale]/layout.tsx` | Bannière sans faux compte à rebours. |
| E5 | `product/product-jsonld.tsx` | `AggregateRating`/`Review` **derrière `NEXT_PUBLIC_ENABLE_REVIEW_SCHEMA`** (off par défaut). |
| E8 | `lib/product.ts`, `trust-bar.tsx`, `buy-box.tsx`, `checkout-client.tsx` | `SHIPPING` centralisé, seuil **39 €**, copy aligné + barre « plus que X € ». |
| E9 | `product/hero-image.tsx` | Une seule image LCP (au lieu de 3). |
| E10,E13 | `next.config.ts` | AVIF/WebP, `minimumCacheTTL`, en-têtes sécurité, `poweredByHeader:false`. |
| E11 | `product/video-reel.tsx` | `preload="none"`. |
| E12 | `middleware.ts` | Auth Supabase limitée à `/admin` et `/account`. |
| E16 | `checkout/checkout-client.tsx` | Tunnel 1 étape (email + livraison) ; fin de la double saisie d'adresse. |
| E18,E19 | `app/layout.tsx`, `[locale]/page.tsx` | `metadataBase` ; `generateMetadata` canonical + hreflang + OG url. |
| E20 | `app/sitemap.ts` | Préfixe locale `as-needed`, `lastModified`, alternates hreflang. |
| E21 | `product/product-jsonld.tsx` | `Offer` + `priceValidUntil` + `shippingDetails` + `hasMerchantReturnPolicy` + `BreadcrumbList`. |
| E23 | `globals.css`, `product/faq.tsx` | `prefers-reduced-motion`, `:focus-visible`, accordéon `aria-controls`/`region`. |

---

## 10. Reste à faire (nécessite décision métier, identifiants ou chantier dédié)

- **Persistance de commande** (E2) : créer la ligne `orders` à la création de session,
  poser `metadata.order_id`, laisser le webhook marquer payé + décrémenter le stock.
- **RGPD/tracking** (E7) : CMP + Consent Mode v2 + Meta CAPI / TikTok Events API serveur
  (requiert IDs pixel/compte) — *non livré pour éviter un bandeau à moitié conforme*.
- **i18n réelle de la landing** (E22) : externaliser tous les textes vers next-intl
  (fr/en/es/de) + `formatMoney` localisé.
- **Express Checkout / Payment Element** on-page (E14) + **BNPL** (Klarna/Afterpay).
- **Omnibus** (E4/E6) : prix barré basé sur l'historique 30 j ; presse sourcée ou retirée ;
  « édition limitée » uniquement si réelle ; **vraie source d'avis** (Judge.me/Loox ou
  Supabase) avant d'activer `NEXT_PUBLIC_ENABLE_REVIEW_SCHEMA`.
- **Médias** (E11/E13) : transcoder/compresser vidéos (+ posters) et images sources.
- **Fiabilité** (E25/E26) : Sentry, `error.tsx`/`global-error.tsx`, Playwright (E2E
  checkout en Stripe test mode), Vitest, budgets Lighthouse en CI.
- **Données** (E24) : réconcilier la source produit statique et le catalogue Supabase.
