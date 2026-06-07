/**
 * Moteur de coupons — PUR (aucun import serveur/DB), donc testable et importable
 * partout. La couche route charge le coupon en DB (client admin) puis appelle
 * ces fonctions ; le webhook incrémente `used_count` au paiement.
 *
 * Règle d'or commerce : le calcul de la remise est AUTORITAIRE côté serveur
 * (cf. skill hamarea-backend › reference/commerce-flow.md). Le client n'envoie
 * qu'un `code` ; jamais un montant de remise.
 */

export type CouponType = "percent" | "fixed";

/** Forme minimale d'une ligne `coupons` nécessaire au calcul. */
export type CouponInput = {
  code: string;
  type: CouponType;
  /** percent → 1..100 ; fixed → montant en centimes. */
  value: number;
  min_subtotal_cents: number;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  used_count: number;
  active: boolean;
};

export type CouponRejection =
  | "inactive"
  | "not_started"
  | "expired"
  | "min_subtotal"
  | "usage_limit";

export type CouponContext = {
  /** Horodatage d'évaluation en ms (par défaut: maintenant). Injectable pour les tests. */
  nowMs?: number;
  subtotalCents: number;
};

/** Messages prêts à afficher (FR) pour chaque motif de refus. */
export const COUPON_REJECTION_MESSAGE: Record<CouponRejection, string> = {
  inactive: "Ce code n'est plus actif.",
  not_started: "Ce code n'est pas encore valable.",
  expired: "Ce code a expiré.",
  min_subtotal: "Le montant minimum pour ce code n'est pas atteint.",
  usage_limit: "Ce code a atteint sa limite d'utilisation.",
};

/**
 * Valide un coupon dans son contexte (état, fenêtre de validité, quota, minimum).
 * Retourne `{ ok: true }` ou `{ ok: false, reason }`.
 */
export function validateCoupon(
  coupon: CouponInput,
  ctx: CouponContext,
): { ok: true } | { ok: false; reason: CouponRejection } {
  const now = ctx.nowMs ?? Date.now();

  if (!coupon.active) return { ok: false, reason: "inactive" };

  if (coupon.starts_at && now < Date.parse(coupon.starts_at)) {
    return { ok: false, reason: "not_started" };
  }
  if (coupon.ends_at && now > Date.parse(coupon.ends_at)) {
    return { ok: false, reason: "expired" };
  }
  if (
    coupon.usage_limit != null &&
    coupon.used_count >= coupon.usage_limit
  ) {
    return { ok: false, reason: "usage_limit" };
  }
  if (ctx.subtotalCents < coupon.min_subtotal_cents) {
    return { ok: false, reason: "min_subtotal" };
  }
  return { ok: true };
}

/**
 * Remise en centimes (entier), TOUJOURS bornée à [0, subtotal] — un coupon ne
 * peut jamais rendre le sous-total négatif. `percent` arrondi au centime.
 */
export function computeDiscountCents(
  coupon: Pick<CouponInput, "type" | "value">,
  subtotalCents: number,
): number {
  if (subtotalCents <= 0) return 0;
  const raw =
    coupon.type === "percent"
      ? Math.round((subtotalCents * coupon.value) / 100)
      : coupon.value;
  return Math.max(0, Math.min(raw, subtotalCents));
}

/**
 * Valide PUIS calcule la remise. Point d'entrée unique pour les routes checkout.
 */
export function applyCoupon(
  coupon: CouponInput,
  ctx: CouponContext,
):
  | { ok: true; discountCents: number }
  | { ok: false; reason: CouponRejection } {
  const v = validateCoupon(coupon, ctx);
  if (!v.ok) return v;
  return { ok: true, discountCents: computeDiscountCents(coupon, ctx.subtotalCents) };
}
