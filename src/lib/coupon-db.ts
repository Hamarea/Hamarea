// Résolution serveur d'un coupon : charge la ligne `coupons` par code (client
// ADMIN, car la validation lit `used_count`/`active`) puis applique le moteur
// PUR `applyCoupon`. Server-only (importe la service-role).
//
// Le `code` est `citext` → l'égalité est insensible à la casse côté Postgres.
import { createAdminClient } from "@/lib/supabase/admin";
import {
  applyCoupon,
  type CouponInput,
  type CouponRejection,
  COUPON_REJECTION_MESSAGE,
} from "@/lib/coupons";

type CouponRow = CouponInput & { id: string };

export type ResolvedCoupon =
  | { ok: true; couponId: string; discountCents: number }
  | { ok: false; reason: CouponRejection | "not_found" };

/** Message FR prêt à afficher pour un refus de coupon (route → client). */
export function couponErrorMessage(
  reason: CouponRejection | "not_found",
): string {
  return reason === "not_found"
    ? "Code promo invalide."
    : COUPON_REJECTION_MESSAGE[reason];
}

export async function resolveCoupon(
  code: string,
  subtotalCents: number,
): Promise<ResolvedCoupon> {
  const normalized = code.trim();
  if (!normalized) return { ok: false, reason: "not_found" };

  const admin = createAdminClient() as unknown as {
    from: (t: string) => {
      select: (q: string) => {
        eq: (k: string, v: string) => {
          maybeSingle: () => Promise<{
            data: CouponRow | null;
            error: { message?: string } | null;
          }>;
        };
      };
    };
  };

  const { data, error } = await admin
    .from("coupons")
    .select(
      "id, code, type, value, min_subtotal_cents, starts_at, ends_at, usage_limit, used_count, active",
    )
    .eq("code", normalized)
    .maybeSingle();

  if (error || !data) return { ok: false, reason: "not_found" };

  const res = applyCoupon(data, { subtotalCents });
  if (!res.ok) return { ok: false, reason: res.reason };
  return { ok: true, couponId: data.id, discountCents: res.discountCents };
}
