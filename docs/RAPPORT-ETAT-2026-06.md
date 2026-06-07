# Hamarea — Rapport d'état complet & corrections (juin 2026)

> Audit complet : stack, base de données (tables / fonctions / RLS), actions,
> gestion des comptes admin & clients, UI/UX, et liste priorisée des corrections.

---

## 0. Résumé exécutif

Le site **est en ligne** (build « Just Run & Swim », domaine `hamarea-shop.com`,
auth Supabase câblée). La stack est **SOTA 2026** et l'architecture est saine.
**Un bug critique** bloquait toute la gestion des rôles : une **récursion RLS sur
`profiles`** faisait planter en **500** chaque lecture du rôle côté client → aucun
admin n'était reconnu. Il est corrigé par la migration **`0015`** (à appliquer dans
Supabase). Trois corrections de routing/redirection sont faites en code (à déployer).

| Sévérité | Sujet | État |
|---|---|---|
| 🔴 Critique | Récursion RLS `profiles` → 500 → admin cassé | **Corrigé → migration 0015 (SQL à exécuter)** |
| 🟠 Élevé | Login ne redirige pas l'admin vers `/admin` | Corrigé (code) — à déployer |
| 🟠 Élevé | `/favicon.ico` & chemins « .ext » → 500 | Corrigé (code) — à déployer |
| 🟡 Moyen | Aucun lien vers `/admin` dans l'UI | Corrigé (code) — à déployer |
| 🟡 Moyen | Variables d'env **Production** (Stripe/Supabase) à vérifier | À vérifier |
| 🟡 Moyen | Auto-déploiement Git Vercel cassé (dépôt déplacé) | Contournement `vercel --prod` ; à reconnecter |

---

## 1. Stack (évaluation SOTA 2026)

| Domaine | Techno | SOTA ? |
|---|---|---|
| Framework | **Next.js 15.5** (App Router, RSC, Server Actions) | ✅ |
| UI | **React 19** | ✅ |
| Langage | **TypeScript strict** | ✅ |
| Styles | **Tailwind CSS v4** | ✅ |
| Composants | **Radix UI** + `class-variance-authority` + `lucide-react` | ✅ |
| Animations | **framer-motion** | ✅ |
| i18n | **next-intl** (fr/en/es/de, `localePrefix: as-needed`) | ✅ |
| Données/Auth | **Supabase** (Postgres + Auth + Storage + RLS) | ✅ |
| State | **Zustand** + **@tanstack/react-query** | ✅ |
| Forms/validation | **react-hook-form** + **zod** | ✅ |
| Paiement | **Stripe** (Payment Element / Checkout) | ✅ (clés prod à confirmer) |
| E-mail / Expédition | **Resend** / **Shippo** | ⚠️ à brancher (no-op si vide) |

**Verdict stack : excellente, à jour.** Rien à refondre.

---

## 2. Base de données

### 2.1 Tables (28)
- **Comptes** : `profiles`, `addresses`
- **Catalogue** : `categories`, `products`, `product_variants`, `product_images`,
  `suppliers`, `warehouses`, `inventory`, `stock_movements`
- **Commerce** : `carts`, `cart_items`, `orders`, `order_items`, `payments`,
  `shipments`, `refunds`, `coupons`
- **Marketing/divers** : `reviews`, `wishlists`, `wishlist_items`,
  `newsletter_subscribers`, `audit_logs`, `exchange_rates`, `pages`, `shop_settings`
- **Infra** : `webhook_events`, `rate_limits`

### 2.2 Fonctions (9 + 1 nouvelle)
`handle_new_user` (création auto du profil à l'inscription), `set_updated_at`,
`decrement_stock_for_order`, `release_expired_reservations`,
`prevent_role_self_escalation` (anti-escalade de privilèges, 0010/0013),
`products_search_trigger`, `moderate_review`, `flag_review`, `rate_limit_hit`.
→ **+ `is_staff()`** ajoutée par la migration 0015 (helper de rôle anti-récursion).

### 2.3 Migrations (0001 → 0015)
0001 extensions/enums · 0002 profiles/adresses · 0003 catalogue · 0004 commerce ·
0005 marketing · 0006 RPC/stock · 0007 modération · 0008 durcissement ·
0009 perf RLS/index · **0010 anti-escalade (sécurité)** · 0011 décrément SKU ·
0012 rate-limit · 0013 RBAC permissions · 0014 waitlist · **0015 fix récursion RLS (NOUVEAU, critique)**.

### 2.4 🔴 Le bug critique : récursion RLS sur `profiles`
La policy `profiles_admin_all` filtrait `profiles` avec
`exists (select 1 from public.profiles …)` — une sous-requête **sur la table
qu'elle protège**. PostgreSQL détecte la récursion infinie (`42P17`) et renvoie
**500** sur toute lecture client de `profiles` (`GET /rest/v1/profiles?select=role`).
Comme le middleware, le layout `/admin` et le login lisent `profiles.role` via le
client (soumis au RLS), le rôle revenait vide → **l'admin n'était jamais reconnu**.
Le SQL Editor (qui contourne le RLS) marchait, d'où la confusion.

**Correctif (migration 0015) :** helper `is_staff()` en **SECURITY DEFINER** (lit le
rôle hors RLS, donc sans ré-entrer la policy) + réécriture de `profiles_admin_all`
avec `using (public.is_staff())`.

---

## 3. Actions serveur & API

**Server Actions (13)** : compte (profil, adresses, vie privée/RGPD, favoris) ;
admin (produits, produit[id], commandes, clients, coupons, fournisseurs,
modération, réglages) ; waitlist.

**Routes API** : `checkout/session`, `checkout/payment-intent`,
`webhooks/stripe`, `admin/export/orders`, `account/export` (RGPD), `auth/callback`
(PKCE OAuth/confirmation — corrigé pour rediriger les admins).

---

## 4. Gestion des comptes

### 4.1 Client
Inscription `/signup` → trigger `handle_new_user` crée le profil (`role = customer`)
→ espace `/account` : profil, commandes, adresses, favoris, **sécurité (MFA TOTP)**,
**confidentialité (export/suppression RGPD)**.

### 4.2 Admin / staff
- Rôle dans `profiles.role` (`admin` | `staff` | `customer`) + **RBAC fin**
  (`profiles.permissions[]`, migration 0013).
- Garde d'accès : **middleware** (`/admin`) + **layout admin** (double contrôle) +
  **MFA step-up** (no-lockout) + backstop « pas de Supabase → 404 ».
- Dashboard : produits, fournisseurs, commandes, clients, stock, coupons, avis,
  modération, réglages, audit.
- **Anti-escalade** : un user ne peut pas se promouvoir admin via l'API REST
  (trigger `prevent_role_self_escalation`).

> ⚠️ Tant que la récursion RLS (0015) n'est pas appliquée, **rien de tout cela ne
> fonctionne** côté client : la lecture du rôle 500. C'est LA correction prioritaire.

---

## 5. UI / UX
Design soigné (charte bleu nuit / sable, typo serif Fraunces + Inter), header/footer
marque, drawer panier, bandeau RGPD, WhatsApp click-to-chat, i18n 4 langues, page
marque + page produit dédiée `/sacoche`. **Favicon de marque** ajouté.
Points ouverts : analytics (consentement OK, IDs à renseigner), Speed Insights/Web
Analytics à activer dans Vercel.

---

## 6. Corrections livrées dans cette passe
1. **0015** — fix récursion RLS `profiles` (SQL). 🔴 **À exécuter dans Supabase.**
2. **Redirection login** — admin/staff → `/admin` (email + Google OAuth). _(code)_
3. **Routing 500** — `not-found` racine + `dynamicParams=false` → `/favicon.ico`,
   `/apple-touch-icon.png`, chemins « .ext » renvoient un **404 propre**. _(code)_
4. **Lien « Tableau de bord »** vers `/admin` dans l'espace compte (admin/staff). _(code)_
5. **Favicon de marque** (`src/app/icon.svg`). _(code)_

## 7. À faire (priorisé)
1. **Exécuter la migration 0015** (SQL Editor) → débloque l'admin. _(immédiat)_
2. **Déployer le code** (`git pull` + `vercel --prod`) → redirections + favicon.
3. **Vérifier les variables d'env Production** (Vercel) : `NEXT_PUBLIC_SUPABASE_URL`,
   `…_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`.
4. **Tester le tunnel d'achat** (panier → checkout Stripe → webhook → commande/stock).
5. **Reconnecter Git ↔ Vercel** (ou transférer le dépôt) pour l'auto-déploiement.
6. _(Optionnel)_ Migrer les autres policies `*_admin_all` vers `is_staff()` (perf).

---
*Rapport établi le 2026-06-05.*
