import { describe, it, expect } from "vitest";
import {
  refundOrderStatus,
  disputeOrderTarget,
  applyDisputeTarget,
  failedOrderStatus,
  type OrderStatus,
} from "./order-transitions";

const TOTAL = 10_000;

describe("refundOrderStatus", () => {
  it("remboursement total (paid) → refunded", () => {
    expect(refundOrderStatus("paid", TOTAL, TOTAL)).toBe("refunded");
  });

  it("remboursement partiel (paid) → partially_refunded", () => {
    expect(refundOrderStatus("paid", 3_000, TOTAL)).toBe("partially_refunded");
  });

  it("remboursement partiel depuis un état d'expédition avancé", () => {
    expect(refundOrderStatus("shipped", 3_000, TOTAL)).toBe("partially_refunded");
    expect(refundOrderStatus("delivered", TOTAL, TOTAL)).toBe("refunded");
  });

  it("remboursement répété : partiel → total (partially_refunded → refunded)", () => {
    // 1er événement cumulait 3 000 → partially_refunded
    expect(refundOrderStatus("partially_refunded", 3_000, TOTAL)).toBeNull(); // no-op (déjà partiel)
    // 2e événement cumule au total → refunded
    expect(refundOrderStatus("partially_refunded", TOTAL, TOTAL)).toBe("refunded");
  });

  it("idempotent : cumul inchangé ne rebascule pas", () => {
    expect(refundOrderStatus("refunded", TOTAL, TOTAL)).toBeNull();
    expect(refundOrderStatus("paid", 0, TOTAL)).toBeNull();
  });

  it("jamais de rétrogradation depuis refunded (out-of-order)", () => {
    // Un événement partiel tardif ne doit pas redescendre 'refunded'.
    expect(refundOrderStatus("refunded", 3_000, TOTAL)).toBeNull();
  });

  it("jamais de bascule depuis un état non encaissé", () => {
    for (const s of ["pending", "failed", "cancelled"] as OrderStatus[]) {
      expect(refundOrderStatus(s, TOTAL, TOTAL)).toBeNull();
    }
  });

  it("ne touche pas les états de litige lors d'un remboursement", () => {
    for (const s of ["disputed", "dispute_won", "dispute_lost"] as OrderStatus[]) {
      expect(refundOrderStatus(s, TOTAL, TOTAL)).toBeNull();
    }
  });

  it("jamais de retour à 'paid'", () => {
    const out = refundOrderStatus("paid", 5_000, TOTAL);
    expect(out).not.toBe("paid");
  });
});

describe("disputeOrderTarget", () => {
  it("created → disputed", () => {
    expect(disputeOrderTarget("charge.dispute.created", "needs_response")).toBe("disputed");
  });

  it("closed won → dispute_won", () => {
    expect(disputeOrderTarget("charge.dispute.closed", "won")).toBe("dispute_won");
  });

  it("closed lost → dispute_lost", () => {
    expect(disputeOrderTarget("charge.dispute.closed", "lost")).toBe("dispute_lost");
  });

  it("closed avec status non tranché → null", () => {
    expect(disputeOrderTarget("charge.dispute.closed", "warning_closed")).toBeNull();
  });

  it("updated → null (l'état commande ne change pas)", () => {
    expect(disputeOrderTarget("charge.dispute.updated", "under_review")).toBeNull();
  });
});

describe("applyDisputeTarget", () => {
  it("applique une cible légitime depuis un état encaissé", () => {
    expect(applyDisputeTarget("paid", "disputed")).toBe("disputed");
    expect(applyDisputeTarget("disputed", "dispute_lost")).toBe("dispute_lost");
    expect(applyDisputeTarget("disputed", "dispute_won")).toBe("dispute_won");
  });

  it("no-op si cible identique à l'état courant", () => {
    expect(applyDisputeTarget("disputed", "disputed")).toBeNull();
  });

  it("cible null → aucun changement", () => {
    expect(applyDisputeTarget("paid", null)).toBeNull();
  });

  it("refuse depuis un état non litigable", () => {
    for (const s of ["pending", "failed", "cancelled"] as OrderStatus[]) {
      expect(applyDisputeTarget(s, "disputed")).toBeNull();
    }
  });
});

describe("failedOrderStatus", () => {
  it("pending → failed", () => {
    expect(failedOrderStatus("pending")).toBe("failed");
  });

  it("ne touche jamais une commande déjà payée/traitée", () => {
    for (const s of [
      "paid",
      "processing",
      "shipped",
      "delivered",
      "refunded",
      "cancelled",
    ] as OrderStatus[]) {
      expect(failedOrderStatus(s)).toBeNull();
    }
  });
});
