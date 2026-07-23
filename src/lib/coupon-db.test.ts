import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CouponInput } from "./coupons";

// Résolution serveur d'un coupon (chemin autoritaire) avec le client admin mocké.
// On ne teste PAS l'accès RLS anonyme ici (cf. supabase/tests/0023_*.sql, requiert
// un vrai Postgres) : on couvre la logique de résolution valide/invalide + le trim.

let mockRow: (CouponInput & { id: string }) | null = null;
let mockError: { message?: string } | null = null;
let lastEqValue = "";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_k: string, v: string) => {
          lastEqValue = v;
          return {
            maybeSingle: async () => ({ data: mockRow, error: mockError }),
          };
        },
      }),
    }),
  }),
}));

// Import APRÈS le mock.
const { resolveCoupon } = await import("./coupon-db");

function row(overrides: Partial<CouponInput> = {}): CouponInput & { id: string } {
  return {
    id: "cpn_1",
    code: "SAVE10",
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

beforeEach(() => {
  mockRow = null;
  mockError = null;
  lastEqValue = "";
});

describe("resolveCoupon", () => {
  it("code valide → remise autoritaire calculée", async () => {
    mockRow = row({ type: "percent", value: 10 });
    const res = await resolveCoupon("SAVE10", 10_000);
    expect(res).toEqual({ ok: true, couponId: "cpn_1", discountCents: 1_000 });
  });

  it("code inexistant → not_found", async () => {
    mockRow = null;
    const res = await resolveCoupon("NOPE", 10_000);
    expect(res).toEqual({ ok: false, reason: "not_found" });
  });

  it("code désactivé → inactive", async () => {
    mockRow = row({ active: false });
    const res = await resolveCoupon("SAVE10", 10_000);
    expect(res).toEqual({ ok: false, reason: "inactive" });
  });

  it("code expiré → expired", async () => {
    mockRow = row({ ends_at: "2000-01-01T00:00:00Z" });
    const res = await resolveCoupon("SAVE10", 10_000);
    expect(res).toEqual({ ok: false, reason: "expired" });
  });

  it("code pas encore actif → not_started", async () => {
    mockRow = row({ starts_at: "2999-01-01T00:00:00Z" });
    const res = await resolveCoupon("SAVE10", 10_000);
    expect(res).toEqual({ ok: false, reason: "not_started" });
  });

  it("quota atteint → usage_limit", async () => {
    mockRow = row({ usage_limit: 5, used_count: 5 });
    const res = await resolveCoupon("SAVE10", 10_000);
    expect(res).toEqual({ ok: false, reason: "usage_limit" });
  });

  it("sous le minimum de sous-total → min_subtotal", async () => {
    mockRow = row({ min_subtotal_cents: 20_000 });
    const res = await resolveCoupon("SAVE10", 10_000);
    expect(res).toEqual({ ok: false, reason: "min_subtotal" });
  });

  it("trim les espaces avant la requête (casse gérée par citext en base)", async () => {
    mockRow = row();
    await resolveCoupon("  save10  ", 10_000);
    expect(lastEqValue).toBe("save10");
  });

  it("code vide après trim → not_found sans requête", async () => {
    mockRow = row(); // ne devrait pas être lu
    const res = await resolveCoupon("   ", 10_000);
    expect(res).toEqual({ ok: false, reason: "not_found" });
  });

  it("erreur DB → not_found (dégradation sûre)", async () => {
    mockRow = null;
    mockError = { message: "boom" };
    const res = await resolveCoupon("SAVE10", 10_000);
    expect(res).toEqual({ ok: false, reason: "not_found" });
  });
});
