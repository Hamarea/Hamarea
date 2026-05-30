# Déploiement — checklist production (Hamarea)

> État de référence : commit `c933947` (= `main` = branche par défaut = `nifty-cori`).
> Build vérifié **vert** (typecheck + lint + `next build`, 113 pages statiques, i18n fr/en/es/de SSG).
> Hébergement cible : **Vercel** (Next.js 15, README Phase 8). CI GitHub (`.github/workflows/ci.yml`)
> ne fait que typecheck/lint/build — **il ne déploie pas**.

---

## 1. Pré-requis propriétaire (accès infra / base) — À FAIRE

### 1.1 Variables d'environnement (Vercel → Settings → Environment Variables, scope **Production**)
| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only**, ne jamais exposer |
| `NEXT_PUBLIC_SITE_URL` | **`https://www.hamarea-shop.com`** (corrige les URLs OG/canonical/sitemap/JSON-LD) |
| `NEXT_PUBLIC_SITE_NAME` | `Hamarea` |
| `NEXT_PUBLIC_ENABLE_REVIEW_SCHEMA` | **garder `false`** tant que les avis ne sont pas réels & vérifiables (risque Google + Omnibus) |
| `STRIPE_SECRET_KEY` | clé **live** en prod |
| `STRIPE_WEBHOOK_SECRET` | voir §1.3 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | clé **live** |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | e-mails transactionnels |
| `SHIPPO_API_KEY` | si l'étiquetage d'expédition est activé |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `META_PIXEL_ID`, `META_CAPI_TOKEN`, `TIKTOK_PIXEL_CODE`, `TIKTOK_ACCESS_TOKEN` | **optionnels** — no-op si vides ; les tags navigateur ne se chargent qu'**après consentement** (bandeau RGPD) |

### 1.2 Migrations Supabase — ⚠️ inclut un correctif de sécurité
Appliquer **toutes** les migrations `supabase/migrations/0001 → 0011`. Les **deux dernières sont nouvelles** (intégrées au merge `c933947`) :
- **`0010_fix_privilege_escalation.sql`** — correctif **sécurité** (escalade de privilèges) → **à appliquer avant/avec le déploiement**.
- **`0011_stock_decrement_sku_fallback.sql`** — décrément de stock (fallback SKU).

```bash
supabase link --project-ref elyrrdpfzbnavqhqmirv
supabase db push
# (ou appliquer 0010 & 0011 via le SQL editor / apply_migration)
```
> Je n'ai pas pu vérifier l'état des migrations en prod (permission MCP refusée) — **à confirmer côté Supabase**.

### 1.3 Webhook Stripe (prod)
- Endpoint : `https://www.hamarea-shop.com/api/webhooks/stripe`
- Événements : `checkout.session.completed` (+ `payment_intent.succeeded`).
- Reporter le **signing secret** dans `STRIPE_WEBHOOK_SECRET`.

### 1.4 Branche de déploiement
- La branche par défaut GitHub est `claude/dropshipping-site-setup-U742N` — **désormais identique à `main`** (`c933947`).
- Recommandé : sur Vercel, définir la **Production Branch = `main`** (et, dans les réglages GitHub, passer la *default branch* à `main`). Sans impact fonctionnel aujourd'hui puisque les deux sont alignées, mais plus clair.

---

## 2. Vérifications pré-déploiement — ✅ FAITES (sur `c933947`)
- ✅ `npm run typecheck` · `npm run lint` · `npm run build` verts.
- ✅ i18n fr/en/es/de en **SSG** (landing, panier, checkout, succès/annulation, about, contact, légal).
- ✅ En-têtes de sécurité (`next.config.ts`), images AVIF/WebP, prix recalculés côté serveur (anti-tampering).

---

## 3. Déclencher le déploiement
- **Vercel connecté à GitHub** : le push sur la branche de prod déclenche build+deploy automatiquement. `c933947` est déjà poussé → si Vercel pointe sur `main`/la branche par défaut, le déploiement part **dès que les variables d'env §1.1 sont en place**.
- **Sinon** (CLI) : `vercel --prod` depuis la racine.

---

## 4. Smoke tests post-déploiement
- [ ] `/`, `/en`, `/es`, `/de` s'affichent **dans la bonne langue** (hero, sections, FAQ, checkout).
- [ ] Bandeau **RGPD** visible ; « Tout refuser » ⇒ aucun tag tiers chargé (vérifier l'onglet Réseau).
- [ ] Parcours : ajout panier → **drawer** → `/checkout` → Stripe (mode test d'abord) → page **succès** vide le panier ; le **webhook** crée/maj la commande + décrémente le stock.
- [ ] `Ajouter — {prix}` formaté selon la locale ; barre **sticky** mobile (safe-area) ; cibles ≥ 44 px.
- [ ] `/robots.txt`, `/sitemap.xml`, JSON-LD `Product/FAQ/Breadcrumb` présents et cohérents.
- [ ] CWV : LCP hero < 2,5 s ; reels en `preload=none` (pas de blocage).

---

## 5. Post-déploiement
- [ ] Supabase **advisors** (sécurité + perf) après application des migrations.
- [ ] Surveiller les **logs du webhook Stripe** (premières commandes réelles).
- [ ] Confirmer que la prod ne sert plus l'ancien build (cf. `docs/RAPPORT-UI-UX-MOBILE-LIVE-2026-05-30.md` §1 — coquille « Clipper », 79 €, « édition limitée » doivent avoir disparu).

---

*Établi le 2026-05-30. Reste hors-scope (décision métier / assets) : posters des reels, Express Checkout/BNPL, prix barré conforme Omnibus, presse sourcée. Cf. `docs/AUDIT-SOTA-2026.md` §10.*
