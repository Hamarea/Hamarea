# Hamarea — Plan d'action des corrections (juin 2026)

> Plan séquencé pour toutes les corrections du rapport `RAPPORT-ETAT-2026-06.md`.
> Légende responsable : 🤖 = fait/à faire en **code** (moi) · 👤 = action **toi**
> (Supabase / Vercel / Stripe / terminal). Statut : ✅ fait · ⏳ à lancer · 🔧 optionnel.

---

## Vue d'ensemble (ordre conseillé)
1. **Phase 0** — Débloquer l'admin (SQL) — *immédiat, sans redéploiement*
2. **Phase 1** — Publier les correctifs code (deploy)
3. **Phase 2** — Encaisser (Stripe + env) — *pour vendre pour de vrai*
4. **Phase 3** — Robustesse & hygiène — *optionnel*

---

## Phase 0 — 🔴 Débloquer l'admin (≈5 min, AUCUN redéploiement)

| # | Action | Resp. | Statut |
|---|---|---|---|
| 0.1 | Coller la migration **`0015`** dans Supabase → SQL Editor (helper `is_staff()` + réécriture `profiles_admin_all`) | 👤 Supabase | ⏳ |
| 0.2 | Recharger `hamarea-shop.com/admin` (reconnecté) | 👤 | ⏳ |

**Pourquoi** : récursion RLS sur `profiles` → 500 sur la lecture du rôle → admin jamais reconnu.
**Vérif** : console réseau → `GET /rest/v1/profiles?select=role` renvoie **200** (plus 500) ; tu entres dans `/admin`.
**Fichier** : `supabase/migrations/0015_fix_rls_recursion.sql`.

---

## Phase 1 — 🟠 Publier les correctifs code (≈3 min)

| # | Action | Resp. | Statut |
|---|---|---|---|
| 1.1 | Redirection login admin → `/admin` (email + Google) | 🤖 code | ✅ poussé |
| 1.2 | `not-found` racine + `dynamicParams` → `/favicon.ico`, `.ext` = **404** propre | 🤖 code | ✅ poussé |
| 1.3 | Lien « Tableau de bord » → `/admin` dans l'espace compte (admin/staff) | 🤖 code | ✅ poussé |
| 1.4 | Favicon de marque (`icon.svg`) | 🤖 code | ✅ poussé |
| 1.5 | **Déployer** : `git pull origin claude/dropshipping-site-setup-U742N` puis `npx vercel --prod` | 👤 terminal | ⏳ |

**Vérif** : login admin → atterrit sur `/admin` ; `/favicon.ico` → 404 (plus 500) ; onglet avec icône.

---

## Phase 2 — 💳 Encaisser (≈20 min) — pour vendre pour de vrai

> Le **code** de paiement est déjà solide (prix recalculé serveur, webhook idempotent,
> décrément stock). Il manque uniquement la **configuration**.

| # | Action | Resp. | Statut |
|---|---|---|---|
| 2.1 | Vercel → Env (Production) : `STRIPE_SECRET_KEY` (`sk_live_…`), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_live_…`) | 👤 Vercel | ⏳ |
| 2.2 | Vercel → Env (Production) : confirmer `SUPABASE_SERVICE_ROLE_KEY` (server-only, requis par le webhook) | 👤 Vercel | ⏳ |
| 2.3 | Stripe → Developers → Webhooks → Add endpoint `https://hamarea-shop.com/api/webhooks/stripe`, events `checkout.session.completed` (+ `payment_intent.succeeded`) | 👤 Stripe | ⏳ |
| 2.4 | Copier le **Signing secret** (`whsec_…`) → Vercel Env `STRIPE_WEBHOOK_SECRET` (Production) | 👤 Vercel | ⏳ |
| 2.5 | **Redéployer** (`vercel --prod`) pour intégrer les clés `NEXT_PUBLIC_*` | 👤 terminal | ⏳ |
| 2.6 | **Test en mode TEST** (clés `*_test`, carte `4242 4242 4242 4242`) → commande visible dans `/admin/orders` + stock décrémenté + e-mail | 👤 | ⏳ |
| 2.7 | Basculer en **live** une fois le test OK | 👤 | ⏳ |

**Vérif** : un achat test crée une commande `paid`, décrémente le stock, et la page succès s'affiche.

---

## Phase 3 — 🔧 Robustesse & hygiène (optionnel)

| # | Action | Resp. | Statut |
|---|---|---|---|
| 3.1 | **Reconnecter Git ↔ Vercel** (ou transférer le dépôt sur StudioVBG) → auto-déploiement à chaque push (fini le `vercel --prod` manuel) | 👤 Vercel/GitHub | 🔧 |
| 3.2 | Migration **`0016`** : passer les autres policies `*_admin_all` à `using (public.is_staff())` (perf + cohérence) | 🤖 code | 🔧 |
| 3.3 | Étendre `priceCart` pour lire le **catalogue complet** (`products`) si tu veux vendre plus que la sacoche | 🤖 code | 🔧 |
| 3.4 | **Seed catalogue** (produits / variantes / inventaire / entrepôt par défaut) avec les bons SKU → le décrément de stock devient effectif | 👤 / 🤖 | 🔧 |
| 3.5 | Renseigner les IDs **analytics** (GA / Meta / TikTok) + activer Web Analytics / Speed Insights dans Vercel | 👤 Vercel | 🔧 |
| 3.6 | Vérifier la **conformité prix barré (Omnibus)** (afficher le prix le plus bas des 30 derniers jours) | 👤 métier | 🔧 |
| 3.7 | Appliquer les migrations Supabase manquantes si besoin (0001→0015) via `supabase db push` ou SQL Editor | 👤 Supabase | 🔧 |

---

## Récapitulatif « qui fait quoi »
- **🤖 Déjà fait (code, poussé)** : redirections login, fix routing 500, lien admin, favicon, migration `0015`, rapport + ce plan.
- **👤 À toi (bloquant)** : exécuter `0015` (Phase 0) · `vercel --prod` (Phase 1) · clés Stripe + webhook + service-role (Phase 2).
- **🤖/🔧 Sur demande** : migration `0016`, `priceCart` catalogue, seed.

> **Chemin critique pour vendre** : 0.1 → 1.5 → 2.1…2.7.

*Plan établi le 2026-06-05.*
