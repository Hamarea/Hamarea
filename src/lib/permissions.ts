// Client-safe permission definitions (no server imports), so both server
// (lib/auth.ts) and client components (customer-row) can import them.

export type Permission =
  | "orders.write"
  | "orders.refund"
  | "products.write"
  | "coupons.write"
  | "suppliers.write"
  | "settings.write"
  | "moderation.write";

export const ALL_PERMISSIONS: Permission[] = [
  "orders.write",
  "orders.refund",
  "products.write",
  "coupons.write",
  "suppliers.write",
  "settings.write",
  "moderation.write",
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "orders.write": "Commandes (statut, expédition)",
  "orders.refund": "Remboursements",
  "products.write": "Produits (fiches, variantes, stock)",
  "coupons.write": "Coupons",
  "suppliers.write": "Fournisseurs",
  "settings.write": "Réglages",
  "moderation.write": "Modération des avis",
};
