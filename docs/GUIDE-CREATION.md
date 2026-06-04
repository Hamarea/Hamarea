# Guide de création — Hamarea (de zéro à la production)

> Pas-à-pas complet pour lancer la boutique : créer les comptes, **générer chaque
> clé d'API**, les **placer en local (`.env.local`) et sur Vercel**, appliquer la
> base, tester, déployer.
>
> Choix de stack retenus : **WhatsApp click-to-chat** (gratuit, sans API),
> **login Google + e-mail**, **Apple Pay / Google Pay via Stripe**, e-mails **Resend**.

---

## 0. Comptes à créer & coûts

| Service | Rôle | Coût |
|---|---|---|
| **Supabase** | Base de données, Auth, Storage | 0 € (Free) → 25 $/mo si dépassement |
| **Stripe** | Paiement CB + Apple Pay / Google Pay | 0 € fixe · ~1,5 % + 0,25 €/vente |
| **Resend** | E-mails (confirmation, expédition) | 0 € (3 000 mails/mois) |
| **Google Cloud** | Login « Continuer avec Google » | 0 € |
| **Vercel** | Hébergement Next.js | 0 € (Hobby) → 20 $/mo (Pro) |
| **WhatsApp** | Bouton click-to-chat | **0 €** (juste un numéro) |
| **Domaine** | nom de domaine | ~10–15 €/an |

---

## 1. Récupérer le projet en local

```bash
git clone <repo> && cd Hamarea
git checkout claude/dreamy-ptolemy-QjEa4
npm install
cp .env.example .env.local      # on remplit .env.local dans la suite
```

> `.env.local` est **ignoré par git** (jamais commité). Les vraies clés y vivent
> en local ; en production elles vivent dans **Vercel** (section 5).

---

## 2. Les variables d'environnement — vue d'ensemble

> ⚠️ Règle d'or : une variable `NEXT_PUBLIC_*` est **exposée au navigateur**
> (ne JAMAIS y mettre un secret). Tout le reste est **serveur uniquement**.

| Variable | Type | Où l'obtenir | Requis pour |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase → API | Base + Auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase → API | Base + Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** | Supabase → API | Webhooks, admin |
| `NEXT_PUBLIC_SITE_URL` | public | toi (URL du site) | SEO, redirections |
| `NEXT_PUBLIC_SITE_NAME` | public | toi (`Hamarea`) | E-mails, SEO |
| `STRIPE_SECRET_KEY` | **secret** | Stripe → API keys | Paiement |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | public | Stripe → API keys | Paiement (wallets) |
| `STRIPE_WEBHOOK_SECRET` | **secret** | Stripe → Webhooks | Réconciliation commandes |
| `RESEND_API_KEY` | **secret** | Resend → API Keys | E-mails |
| `RESEND_FROM_EMAIL` | serveur | toi (domaine vérifié) | E-mails |
| `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH` | public | toi (`true`/`false`) | Bouton Google |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | public | toi (numéro) | Bouton WhatsApp |
| `NEXT_PUBLIC_WHATSAPP_MESSAGE` | public | toi (texte) | Bouton WhatsApp |
| `NEXT_PUBLIC_ENABLE_REVIEW_SCHEMA` | public | toi (`false`) | JSON-LD avis |
| *Tracking (optionnel)* | mixte | GA / Meta / TikTok | Pub & analytics |

---

## 3. Créer chaque clé, étape par étape

### 3.1 Supabase — `URL` + `ANON_KEY` + `SERVICE_ROLE_KEY`
1. [supabase.com](https://supabase.com) → ton projet (réf. `elyrrdpfzbnavqhqmirv`) ou **New project**.
2. `Settings → API`. Copie :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys → anon / public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Project API keys → service_role** (clic « Reveal ») → `SUPABASE_SERVICE_ROLE_KEY`
     ⚠️ **Secret absolu** — ne jamais committer ni exposer au navigateur.

### 3.2 Google OAuth — login « Continuer avec Google »
1. [console.cloud.google.com](https://console.cloud.google.com) → crée/sélectionne un projet.
2. `APIs & Services → OAuth consent screen` : type **External**, renseigne nom, e-mail support, domaine, puis **Publish**.
3. `APIs & Services → Credentials → Create credentials → OAuth client ID` :
   - Type : **Web application**
   - **Authorized redirect URIs** :
     `https://elyrrdpfzbnavqhqmirv.supabase.co/auth/v1/callback`
4. Copie **Client ID** + **Client secret**.
5. Supabase → `Authentication → Providers → Google` : **active**, colle Client ID + Secret, **Save**.
6. Dans l'app : `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true` (sinon le bouton reste masqué).

### 3.3 Stripe — `SECRET_KEY` + `PUBLISHABLE_KEY` + `WEBHOOK_SECRET`
1. [dashboard.stripe.com](https://dashboard.stripe.com) → **mode Test** d'abord (interrupteur en haut).
2. `Developers → API keys` :
   - **Secret key** → `STRIPE_SECRET_KEY` (`sk_test_…`)
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_…`)
3. **Activer les wallets** : `Settings → Payment methods` → active **Apple Pay**, **Google Pay**, **Link**.
4. **Apple Pay – domaine** : `Settings → Payment method domains → Add domain` → ton domaine prod (Stripe gère le certificat).
   *(Apple Pay n'apparaît qu'en **HTTPS** sur un domaine vérifié → visible une fois déployé, pas en `localhost`.)*
5. **Webhook** : `Developers → Webhooks → Add endpoint`
   - URL : `https://TON-DOMAINE/api/webhooks/stripe`
   - Événements : **`checkout.session.completed`** + **`payment_intent.succeeded`**
   - Crée → copie le **Signing secret** → `STRIPE_WEBHOOK_SECRET` (`whsec_…`)
6. **Test du webhook en local** :
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   # → affiche un whsec_… LOCAL à mettre dans .env.local le temps des tests
   ```
   Carte test : `4242 4242 4242 4242`, date future, CVC au hasard.

### 3.4 Resend — `API_KEY` + `FROM_EMAIL` (+ DNS)
1. [resend.com](https://resend.com) → `Domains → Add Domain` (ex. `hamarea-shop.com`).
2. Ajoute chez ton registrar les enregistrements **DNS** fournis (SPF, DKIM, DMARC) → attends le statut **Verified** (sinon les mails partent en spam).
3. `API Keys → Create API Key` → `RESEND_API_KEY` (`re_…`).
4. `RESEND_FROM_EMAIL=no-reply@hamarea-shop.com` (doit appartenir au domaine vérifié).

### 3.5 WhatsApp — `NUMBER` (gratuit, sans API)
1. `NEXT_PUBLIC_WHATSAPP_NUMBER` = numéro international **en chiffres uniquement** (sans `+`, sans espaces). Ex. `33612345678`.
2. `NEXT_PUBLIC_WHATSAPP_MESSAGE` = texte pré-rempli (optionnel).
   → Le bouton flottant « Discuter sur WhatsApp » s'affiche automatiquement ; vide = masqué.

### 3.6 Tracking (optionnel — laisser vide au début)
`NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `META_PIXEL_ID`, `META_CAPI_TOKEN`,
`TIKTOK_PIXEL_CODE`, `TIKTOK_ACCESS_TOKEN` — no-op tant que vides ; les tags
navigateur ne se chargent qu'**après consentement** (bandeau RGPD).

---

## 4. Placer les clés en LOCAL (`.env.local`)

Ouvre `.env.local` et renseigne (exemple minimal pour tout faire tourner en test) :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://elyrrdpfzbnavqhqmirv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...        # anon/public
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...            # service_role (SECRET)

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=Hamarea

# Stripe (TEST)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...                    # celui du `stripe listen` en local

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=no-reply@hamarea-shop.com

# Login Google
NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true

# WhatsApp
NEXT_PUBLIC_WHATSAPP_NUMBER=33612345678
NEXT_PUBLIC_WHATSAPP_MESSAGE=Bonjour, j'ai une question sur ma commande
```

> Après modification de `.env.local`, **redémarre** `npm run dev` (les variables
> ne sont lues qu'au démarrage).

---

## 5. Placer les clés sur VERCEL (Production + Preview)

### Option A — Dashboard (recommandé)
1. [vercel.com](https://vercel.com) → importe le repo GitHub → projet créé.
2. `Settings → Environment Variables`. Pour **chaque** variable de la section 4 :
   - **Key** = nom (ex. `STRIPE_SECRET_KEY`)
   - **Value** = la valeur (en prod : clés **live** `sk_live_…` / `pk_live_…`)
   - **Environments** = coche **Production** (et **Preview** si tu veux tester les PR)
   - **Save**
3. Différences prod vs local :
   - `NEXT_PUBLIC_SITE_URL` = **`https://www.ton-domaine.com`** (pas localhost)
   - `STRIPE_*` = clés **live** + `STRIPE_WEBHOOK_SECRET` du webhook **prod** (section 3.5, pas celui du `stripe listen`)
4. **Redeploy** après tout changement de variable (`Deployments → … → Redeploy`).

### Option B — CLI
```bash
npm i -g vercel
vercel link
vercel env add STRIPE_SECRET_KEY production        # colle la valeur quand demandé
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
# …répéter pour chaque variable, puis :
vercel --prod
```

> ✅ Checklist : les **mêmes** variables qu'en `.env.local` doivent exister sur
> Vercel, **sauf** que `NEXT_PUBLIC_SITE_URL` et les clés Stripe passent en valeurs
> **prod/live**.

---

## 6. Base de données (migrations + admin)

```bash
supabase link --project-ref elyrrdpfzbnavqhqmirv
supabase db push          # applique supabase/migrations/0001 → 0013
```
⚠️ Inclut `0010_fix_privilege_escalation` (sécurité) — obligatoire.

Te promouvoir admin (SQL editor Supabase) :
```sql
update profiles set role = 'admin' where email = 'TON-EMAIL';
```

URLs de redirection Auth (`Authentication → URL Configuration`) :
- Site URL : `http://localhost:3000` puis l'URL prod
- Redirect URLs : `http://localhost:3000/auth/callback` **et** `https://www.ton-domaine.com/auth/callback`

---

## 7. Lancer en local & tester

```bash
npm run dev          # http://localhost:3000
npm run typecheck    # 0 erreur
npm run lint
npm run build        # build prod vert
```
Tests :
- Login **email** + **Google** (si `ENABLE_GOOGLE_AUTH=true`).
- Bouton **WhatsApp** visible (numéro configuré).
- Panier → checkout → carte test `4242…` → page succès → le webhook crée la commande + décrémente le stock.
- Admin → commande → renseigne un **tracking** + statut **shipped** → le client reçoit l'**e-mail d'expédition**.

> Apple Pay / Google Pay **on-page** : testables seulement en **HTTPS** sur le
> domaine vérifié (donc après déploiement), avec un appareil disposant d'un wallet.

---

## 8. Déployer
1. Variables Vercel en place (section 5) → **Deploy**.
2. Branche le **domaine** (Vercel → `Settings → Domains`).
3. Bascule Stripe en **live** + crée le webhook **prod**.

## 9. Après le déploiement (à refaire avec les URLs prod)
- [ ] Supabase Redirect URLs → ajoute l'URL prod.
- [ ] Webhook Stripe → endpoint prod `https://…/api/webhooks/stripe`.
- [ ] Apple Pay → domaine prod vérifié dans Stripe.
- [ ] Google OAuth → ajoute l'origine prod dans Google Cloud.
- [ ] Supabase **advisors** (sécurité + perf).
- [ ] RGPD (bandeau) · Omnibus (prix/avis réels) · **TVA** (à brancher).

---

## 10. Les 4 intégrations ajoutées (code)

| Brique | Fichiers clés | Activation |
|---|---|---|
| **WhatsApp** click-to-chat | `components/shop/whatsapp-button.tsx`, layout, footer | `NEXT_PUBLIC_WHATSAPP_NUMBER` |
| **Resend** e-mail expédition | `lib/email.ts`, `admin/orders/actions.ts` | `RESEND_API_KEY` + domaine vérifié |
| **Login Google** | `components/account/oauth-buttons.tsx`, login/signup | `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true` + provider Supabase |
| **Apple/Google Pay** on-page | `components/checkout/express-checkout.tsx`, `api/checkout/payment-intent` | clés Stripe + wallets activés + domaine Apple Pay |

Chaque brique suit le pattern maison **« no-op tant que la clé n'est pas là »** :
rien ne casse si une variable est absente.
