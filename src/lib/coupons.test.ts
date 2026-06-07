import { describe, it, expect } from "vitest";
import {
  applyCoupon,
  computeDiscountCents,
  validateCoupon,
  type CouponInput,
} from "./coupons";

/** Coupon de base valide, surchargé par test. */
function coupon(overrides: Partial<CouponInput> = {}): CouponInput {
  return {
    code: "TEST",
    type: "percent",
    value: 10,
    min_subtotal_cents: 0,
    starts_at: null,
    ends_at: null,
    usage_limit: null,
    used_count: 0,
    active: true,
    ...overrides,
  };
}

const NOW = Date.parse("2026-06-07T12:00:00Z");

describe("computeDiscountCents", () => {
  it("percent: arrondit au centime", () => {
    expect(computeDiscountCents({ type: "percent", value: 20 }, 10_000)).toBe(2_000);
    expect(computeDiscountCents({ type: "percent", value: 15 }, 2_117)).toBe(318); // round(317.55)
  });

  it("fixed: remise en centimes", () => {
    expect(computeDiscountCents({ type: "fixed", value: 500 }, 10_000)).toBe(500);
  });

  it("borne la remise au sous-total (jamais négatif)", () => {
    expect(computeDiscountCents({ type: "fixed", value: 15_000 }, 10_000)).toBe(10_000);
    expect(computeDiscountCents({ type: "percent", value: 100 }, 10_000)).toBe(10_000);
  });

  it("sous-total nul ou négatif → 0", () => {
    expect(computeDiscountCents({ type: "percent", value: 50 }, 0)).toBe(0);
    expect(computeDiscountCents({ type: "fixed", value: 500 }, -100)).toBe(0);
  });
});

describe("validateCoupon", () => {
  it("accepte un coupon valide", () => {
    expect(validateCoupon(coupon(), { nowMs: NOW, subtotalCents: 5_000 })).toEqual({ ok: true });
  });

  it("refuse un coupon inactif", () => {
    expect(validateCoupon(coupon({ active: false }), { nowMs: NOW, subtotalCents: 5_000 }))
      .toEqual({ ok: false, reason: "inactive" });
  });

  it("refuse avant starts_at", () => {
    expect(
      validateCoupon(coupon({ starts_at: "2026-06-08T00:00:00Z" }), { nowMs: NOW, subtotalCents: 5_000 }),
    ).toEqual({ ok: false, reason: "not_started" });
  });

  it("refuse après ends_at", () => {
    expect(
      validateCoupon(coupon({ ends_at: "2026-06-06T00:00:00Z" }), { nowMs: NOW, subtotalCents: 5_000 }),
    ).toEqual({ ok: false, reason: "expired" });
  });

  it("respecte la fenêtre [starts_at, ends_at]", () => {
    const c = coupon({ starts_at: "2026-06-01T00:00:00Z", ends_at: "2026-06-30T00:00:00Z" });
    expect(validateCoupon(c, { nowMs: NOW, subtotalCents: 5_000 })).toEqual({ ok: true });
  });

  it("refuse quand le quota d'usage est atteint", () => {
    expect(
      validateCoupon(coupon({ usage_limit: 5, used_count: 5 }), { nowMs: NOW, subtotalCents: 5_000 }),
    ).toEqual({ ok: false, reason: "usage_limit" });
  });

  it("refuse sous le minimum de sous-total", () => {
    expect(
      validateCoupon(coupon({ min_subtotal_cents: 6_000 }), { nowMs: NOW, subtotalCents: 5_000 }),
    ).toEqual({ ok: false, reason: "min_subtotal" });
  });
});

describe("applyCoupon", () => {
  it("valide puis calcule la remise", () => {
    const r = applyCoupon(coupon({ type: "percent", value: 25 }), { nowMs: NOW, subtotalCents: 8_000 });
    expect(r).toEqual({ ok: true, discountCents: 2_000 });
  });

  it("propage le motif de refus sans calculer", () => {
    const r = applyCoupon(coupon({ active: false }), { nowMs: NOW, subtotalCents: 8_000 });
    expect(r).toEqual({ ok: false, reason: "inactive" });
  });
});
