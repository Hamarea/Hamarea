# Audit d'architecture — Comptes Hamarea

> Périmètre : gestion des comptes **admin/staff** et **clients**, modèle de données,
> données connectées, suivi/observabilité admin, et confrontation aux standards **2026**.

## Synthèse & verdict

Fondation d'authentification/autorisation **moderne et saine** (Supabase Auth + RLS
partout + défense en profondeur), mais il manque les briques « avancées » pour être
réellement **SOTA 2026** (MFA/passkeys, journal d'audit exploité, RGPD self-service,
RBAC fin, observabilité).

**Note globale : ~6,5/10 — « solide mais pas encore état de l'art ».**

---

## 1. Architecture des comptes

Un seul système de comptes (Supabase Auth → `auth.users`) + table miroir
`public.profiles` (1-1, créée au signup par le trigger `handle_new_user`). Le type de
compte = colonne `role` (enum `user_role`).

| Rôle | Accès | Source |
|---|---|---|
| `customer` (défaut) | `/account` | `profiles.role` |
| `staff` | `/account` + `/admin` sauf gestion des rôles | `profiles.role` |
| `admin` | tout + gestion des rôles | `profiles.role` |

Chaîne d'auth (identique client/admin) :

```
signup/login → Supabase Auth → e-mail PKCE → /auth/callback
  → exchangeCodeForSession → cookies HttpOnly → middleware (refresh + getUser)
  → layout/page (getUser) → server action (requireUser/Staff/Admin) → RLS (auth.uid())
```

Défense en profondeur (4 couches) :
1. **Middleware** (`src/middleware.ts`) — refresh cookies ; redirige `/admin` + vérifie le rôle. `/account` est protégé par son layout, pas par une redirection middleware.
2. **Layout** — re-`getUser()` + redirection (backstop).
3. **Server actions** — `requireUser` / `requireStaff` / `requireAdmin`.
4. **RLS Postgres** — dernière ligne.

Bon réflexe : partout `auth.getUser()` (validation JWT serveur), jamais `getSession()`.

---

## 2. Comptes clients (`/account`)

| Fonction | Page | Action | Tables | État |
|---|---|---|---|---|
| Profil | `/account` | `updateProfile` | `profiles` | OK |
| Adresses (CRUD + défaut) | `/account/addresses` | `addAddress`/`deleteAddress`/`setDefaultAddress` | `addresses` | OK |
| Favoris | `/account/wishlist` | `removeFromWishlist` | `wishlists`,`wishlist_items` | OK |
| Commandes | `/account/orders` | lecture | `orders` | OK |
| Détail + suivi colis | `/account/orders/[id]` | lecture | `orders`,`order_items`,`shipments` | OK |
| Mot de passe | `/account/security` | `auth.updateUser` | `auth.users` | OK |
| Mot de passe oublié | `/(auth)/reset-password` | `resetPasswordForEmail` + callback PKCE | — | OK |

Validation Zod côté serveur + RLS `*_self_*`. Commandes en lecture seule côté client.

Manques : changement d'e-mail, suppression de compte (RGPD), export RGPD, gestion des
sessions, 2FA, login social (callback prêt, pas d'UI). Libellés FR codés en dur par endroits.

---

## 3. Comptes admin / staff (`/admin`)

| Module | Créer | Lire | Modifier | Suppr. | Garde |
|---|:--:|:--:|:--:|:--:|---|
| Commandes | ✗ | liste 100 + détail | statut, expédition/tracking | ✗ | `requireStaff` |
| Clients | ✗ | liste | rôle (admin only) | ✗ | `requireAdmin` |
| Produits | ✓ basique | liste | statut | ✗ | `requireStaff` |
| Stock | ✗ | lecture | ✗ | ✗ | — |
| Coupons | ✓ | liste | actif on/off | ✗ | `requireStaff` |
| Fournisseurs | ✓ | liste | ✗ | ✓ | `requireStaff` |
| Avis/Modération | ✗ | onglets | statut, note | ✗ | RPC (rôle en base) |
| Réglages | ✗ | lecture | site + livraison | ✗ | `requireStaff` |

Anti self-lockout sur les rôles. RBAC grossier (`staff ≈ admin`). Manques : recherche/
filtre/pagination, édition produit (variantes/prix/images), UI remboursement, détail client,
suspension de compte, export CSV.

---

## 4. Données connectées

~27 tables Postgres, RLS sur toutes. Services externes :

| Service | Usage | Sécurité |
|---|---|---|
| Supabase (Postgres + Auth) | source de vérité | RLS + `service_role` confiné |
| Stripe | paiement | webhook signé, écriture `service_role`, idempotence (`webhook_events`) |
| Resend | e-mails | no-op sans clé |
| GA4 / Meta Pixel | analytics navigateur | chargés après consentement (CMP) |
| Meta CAPI / TikTok | conversions serveur | e-mail haché SHA-256, no-op sans clé |

En attente de données : `exchange_rates` (multi-devise), calcul TVA, intégration transporteur.

---

## 5. Suivi de l'admin (observabilité)

- Tableau de bord : 4 KPI réels (revenu 30j, commandes, clients, stock bas). Imprécisions :
  « Clients » compte tous les profils ; « Commandes » est all-time vs revenu 30j. « Activité
  récente » = placeholder.
- Pas de graphiques, top-produits, AOV, conversion, abandon panier, cohortes, export.
- **Journal d'audit** : la table `audit_logs` n'est alimentée que par la modération d'avis ;
  les autres actions sensibles ne sont pas tracées et aucune UI ne le consulte. → chantier P0.

---

## 6. Verdict SOTA 2026

| Domaine | Note | Commentaire |
|---|:--:|---|
| Auth (socle) | 8/10 | SSR cookies, getUser, PKCE, confirmation e-mail |
| Auth avancée | 2/10 | pas de MFA/passkeys/social |
| Autorisation / RLS | 9/10 | RLS partout, least-privilege, initplan, hardening, fix élévation |
| RBAC | 5/10 | 3 rôles, staff≈admin |
| Protection abus | 3/10 | pas de rate-limit/captcha applicatif |
| Audit | 3/10 | table non exploitée, pas d'UI |
| RGPD | 5/10 | CMP ✅, pas d'export/suppression |
| Observabilité admin | 4/10 | KPI basiques, placeholders |
| Self-service client | 5/10 | manque e-mail/sessions/suppression |
| Qualité données | 7/10 | Zod + RLS + snapshots |

---

## 7. Recommandations priorisées

**P0** — MFA TOTP admin/staff · journal d'audit alimenté + UI + IP · RGPD self-service.
**P1** — rate-limit/Turnstile · recherche+pagination · UI remboursement · changement d'e-mail.
**P2** — RBAC à permissions · édition produit complète · observabilité (top-produits, AOV, export).
