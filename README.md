# Hamarea

E-commerce sur-mesure international — produits & accessoires soignés.
Charte **bleu nuit / vert sauge / marron terre**.

Stack : **Next.js 15 (App Router)** · TypeScript strict · Tailwind v4 ·
Supabase (Postgres + Auth + Storage + RLS) · next-intl · Zustand ·
Stripe (à brancher) · Resend / Shippo (à brancher).

---

## Démarrer en local

```bash
# 1. Installer les dépendances
npm install

# 2. Variables d'environnement
cp .env.example .env.local
# puis renseigner NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY (au minimum)

# 3. Appliquer les migrations Supabase
#    Option A — Supabase CLI :
#       supabase link --project-ref <ref>
#       supabase db push
#    Option B — MCP server :
#       Pour chaque fichier `supabase/migrations/*.sql`, appeler `apply_migration`.

# 4. Promouvoir un compte admin
#    Dans Supabase SQL editor :
#       update profiles set role = 'admin' where email = 'moi@hamarea.com';

# 5. Lancer le dev
npm run dev
# http://localhost:3000  (FR par défaut, /en /es /de disponibles)
```

## Scripts

| Script | Action |
|---|---|
| `npm run dev` | Démarre Next en mode dev |
| `npm run build` | Build prod |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/{login, signup}/
│   │   ├── account/{orders, addresses, wishlist}/
│   │   ├── admin/{products, orders, stock, customers, ...}/
│   │   ├── products/[slug]/
│   │   ├── categories/, cart/, checkout/
│   │   └── layout.tsx, page.tsx
│   ├── api/webhooks/stripe/route.ts
│   ├── sitemap.ts, robots.ts, layout.tsx, globals.css
├── components/{ui, shop, account}/
├── lib/{supabase, queries, utils}.ts
├── i18n/{routing, request, navigation}.ts
├── stores/cart.ts
├── middleware.ts          # i18n + auth admin
messages/{fr,en,es,de}.json
supabase/migrations/0001..0006_*.sql
.github/workflows/ci.yml
```

## Schéma de base

23 tables couvrant : profils & adresses · catalogue (catégories, produits,
variantes, images) · stock multi-entrepôt + mouvements audités · panier ·
commandes / lignes / paiements / expéditions / remboursements · coupons ·
avis · wishlist · newsletter · audit log · taux de change · pages CMS ·
réglages boutique. Toutes les tables ont **RLS activée** avec policies
isolant chaque utilisateur, et un accès admin/staff via `profiles.role`.

Voir `supabase/migrations/` pour le détail.

## Roadmap

- [x] **Phase 0** — Setup projet
- [x] **Phase 1** — Schéma DB, RLS, auth (login, signup, account)
- [x] **Phase 2** — Catalogue public (home, list, detail, i18n)
- [x] **Phase 2** — Panier persistant côté client
- [ ] **Phase 3** — Stripe Payment Element + webhook + emails Resend
- [ ] **Phase 4** — Espace client complet (factures PDF, retours)
- [x] **Phase 5** — Admin (dashboard, produits, commandes, stock, clients)
- [ ] **Phase 6** — Étiquettes Shippo + tracking auto
- [ ] **Phase 7** — Coupons UI, avis, newsletter, SEO avancé
- [ ] **Phase 8** — RGPD complet, CGV, déploiement Vercel

Voir aussi le rapport complet de planification dans
`/root/.claude/plans/je-veux-une-site-proud-meerkat.md`.

## Couleurs

| Token | Valeur | Usage |
|---|---|---|
| `--color-primary-600` | `#1e3a5f` | Bleu nuit (CTA principal, liens) |
| `--color-secondary-400` | `#4a7c59` | Vert sauge (accents naturels, statut OK) |
| `--color-accent-400` | `#8b5a3c` | Marron terre (promos, premium) |
| `--color-bg` | `#faf7f2` | Fond beige clair |

## Sécurité

- RLS sur **toutes** les tables (lecture publique limitée à `status='active'`).
- Le client browser n'utilise que la **publishable key**.
- La **service_role key** ne sert que dans `lib/supabase/admin.ts` et les
  webhooks (`/api/webhooks/*`) — jamais exposée côté client.
- Webhooks idempotents via `webhook_events(provider, event_id)` unique.
- Décrément du stock atomique côté Postgres (`decrement_stock_for_order` RPC).
