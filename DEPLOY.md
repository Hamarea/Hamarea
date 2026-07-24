# Mise en ligne — Hamarea

Guide de déploiement **propre à ce repo**. Le code est prêt (build ✓ lint ✓
tests ✓) ; il ne reste qu'à brancher un hébergeur et poser les secrets.

> Stack : Next.js 15 (App Router) · Supabase (Postgres/Auth/Storage) · Stripe.
> Hébergeur recommandé : **Vercel** (support natif Next.js). Netlify /
> Cloudflare Pages / Docker fonctionnent aussi — seules les étapes 2 changent.

---

## Vue d'ensemble (5 étapes, ~20 min)

1. **Supabase** — appliquer les migrations, récupérer les clés.
2. **Vercel** — importer le repo, poser les variables d'env, choisir la branche de prod.
3. **Stripe** — créer le webhook vers le domaine, récupérer `whsec_…`.
4. **Domaine** — brancher le nom de domaine, fixer `NEXT_PUBLIC_SITE_URL`.
5. **Vérifier** — ouvrir `/admin/diagnostics` : tout doit être au vert.

---

## 1. Supabase (base de données)

Projet existant : `elyrrdpfzbnavqhqmirv` (voir `.env.example`).

1. Appliquer **toutes** les migrations `supabase/migrations/*.sql` (ordre
   croissant `0001 → …`) via la CLI Supabase (`supabase db push`) ou le SQL
   editor. Elles sont idempotentes.
2. Dashboard → **Project Settings → API**, noter :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - clé **anon / public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - clé **service_role** (secrète) → `SUPABASE_SERVICE_ROLE_KEY`
3. Créer un compte admin : s'inscrire sur le site déployé, puis passer son rôle
   à `admin` dans la table `profiles` (SQL editor).

---

## 2. Vercel (hébergement)

1. **vercel.com → Add New → Project → Import** le repo GitHub `Hamarea/Hamarea`.
2. Framework détecté automatiquement : **Next.js**. Ne rien changer au build
   (`next build`), Node ≥ 20.
3. **Production Branch** : choisir la branche à mettre en prod (voir la note
   « Branche » plus bas — il n'y a pas de `main` aujourd'hui).
4. **Environment Variables** → coller la liste ci-dessous (§ Variables d'env).
5. **Deploy.**

Chaque `git push` sur la branche de prod redéploie automatiquement ; les autres
branches obtiennent une URL de *preview*.

---

## 3. Stripe (paiement)

1. **Passer en mode Live** (clés `sk_live_…` / `pk_live_…`).
2. **Developers → Webhooks → Add endpoint** :
   - URL : `https://TON-DOMAINE/api/webhooks/stripe`
   - Événements : **`checkout.session.completed`** et
     **`payment_intent.succeeded`** (les deux — le second est un filet de
     sécurité pour l'Express Checkout).
3. Copier le **Signing secret** `whsec_…` → `STRIPE_WEBHOOK_SECRET`.
4. (Recommandé) Activer Apple Pay / Google Pay dans Stripe pour le paiement
   express 1-tap ajouté au tiroir.

> ⚠️ Sans `STRIPE_WEBHOOK_SECRET` correct, les commandes ne passeront **jamais**
> en « payée » (ni stock décrémenté, ni e-mail). C'est le piège n°1.

---

## 4. Domaine

1. Vercel → **Settings → Domains** → ajouter le domaine, suivre le DNS.
2. Poser `NEXT_PUBLIC_SITE_URL = https://TON-DOMAINE` (sans slash final) — sert
   aux liens absolus, aux images produit envoyées à Stripe et au SEO.

---

## 5. Vérifier (le réflexe à garder)

Ouvrir **`/admin/diagnostics`** (connecté en admin). La page teste **en direct**
chaque service : Supabase (lecture + écritures), Stripe (clé, wallet, webhook),
Resend, pixels. Objectif : **« Tout est paramétré »** (aucune ligne rouge).

Puis un **achat test** de bout en bout (carte de test si encore en mode test,
sinon une vraie CB remboursée) : la commande doit apparaître dans
`/admin/orders` au statut **payée**.

---

## Variables d'environnement (à poser chez l'hébergeur)

### Requises — sans elles, pas de vente
| Variable | Où la trouver | Public ? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API | oui |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API | oui |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API | **secret** |
| `STRIPE_SECRET_KEY` | Stripe (Live) | **secret** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe (Live) | oui |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks | **secret** |
| `NEXT_PUBLIC_SITE_URL` | ton domaine | oui |

### Recommandées
| Variable | Rôle |
|---|---|
| `RESEND_API_KEY` + `RESEND_FROM_EMAIL` | e-mails de confirmation |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | bouton support WhatsApp (chiffres only, ex. `33612345678`) |

### Optionnelles (tracking / no-op tant que vides)
`NEXT_PUBLIC_GA_ID` · `NEXT_PUBLIC_META_PIXEL_ID` · `META_CAPI_TOKEN` ·
`TIKTOK_PIXEL_CODE` · `TIKTOK_ACCESS_TOKEN` · `SHIPPO_API_KEY`

> Ne mets **jamais** une clé `SERVICE_ROLE` / `STRIPE_SECRET` / `whsec` dans une
> variable préfixée `NEXT_PUBLIC_` — elle serait exposée au navigateur.

---

## Note « Branche de prod »

Aujourd'hui il n'y a **pas de branche `main`** (la branche par défaut du repo
est une branche `claude/…`), alors que la CI GitHub Actions se déclenche sur
`main`. Deux options avant de brancher Vercel :

- **A.** Créer une branche `main` propre à partir de la branche à publier, la
  définir comme branche par défaut GitHub **et** comme *Production Branch* Vercel.
- **B.** Pointer Vercel directement sur la branche à publier (plus rapide, mais
  la CI `on: push: [main]` ne se déclenchera pas tant que `main` n'existe pas).

L'option **A** est la plus saine à long terme.

---

## Ce qui reste hors-repo (à ta charge)

Le déploiement a besoin d'accès que le code ne contient pas (par sécurité) :
compte Vercel, clés Live Stripe, secrets Supabase, DNS du domaine. Une fois
posés chez l'hébergeur, la boutique est en ligne — et `/admin/diagnostics` te
confirme que tout répond.
