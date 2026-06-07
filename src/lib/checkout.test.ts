import { describe, it, expect } from "vitest";
import { priceCart, shippingCentsFor, type CartLineInput } from "./checkout";
import { SACOCHE, SHIPPING, unitPriceForPack } from "./product";

const ORIGIN = "https://hamarea-shop.com";

function line(overrides: Partial<CartLineInput> = {}): CartLineInput {
  return { productId: SACOCHE.id, color: "Noir", pack: 1, quantity: 1, ...overrides };
}

describe("priceCart — pricing autoritaire", () => {
  it("rejette un produit inconnu (jamais le prix client)", () => {
    const r = priceCart([line({ productId: "pirate" })], ORIGIN);
    expect(r.ok).toBe(false);
  });

  it("rejette une couleur inconnue", () => {
    const r = priceCart([line({ color: "Turquoise" })], ORIGIN);
    expect(r.ok).toBe(false);
  });

  it("calcule le prix unitaire depuis le barème pack (serveur)", () => {
    const r = priceCart([line({ pack: 1, quantity: 1 })], ORIGIN);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.cart.subtotalCents).toBe(SACOCHE.priceCents); // 2490
      expect(r.cart.lineItems[0].price_data.unit_amount).toBe(unitPriceForPack(1));
    }
  });

  it("applique la remise pack (2 et 3) et multiplie par la quantité", () => {
    const r = priceCart([line({ pack: 2, quantity: 3 })], ORIGIN);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const unit = unitPriceForPack(2); // round(2490*0.85) = 2117
      expect(r.cart.lineItems[0].price_data.unit_amount).toBe(unit);
      expect(r.cart.subtotalCents).toBe(unit * 3);
    }
  });

  it("agrège plusieurs lignes", () => {
    const r = priceCart([line({ pack: 1 }), line({ color: "Rose", pack: 3 })], ORIGIN);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.cart.subtotalCents).toBe(unitPriceForPack(1) + unitPriceForPack(3));
      expect(r.cart.orderItems).toHaveLength(2);
    }
  });
});

describe("shippingCentsFor — frais de port autoritaires", () => {
  it("offert au-dessus du seuil", () => {
    expect(shippingCentsFor(SHIPPING.freeAboveCents, "standard")).toBe(0);
    expect(shippingCentsFor(SHIPPING.freeAboveCents + 100, "express")).toBe(0);
  });

  it("tarif standard / express en-dessous du seuil", () => {
    expect(shippingCentsFor(1000, "standard")).toBe(SHIPPING.standardCents);
    expect(shippingCentsFor(1000, "express")).toBe(SHIPPING.expressCents);
  });
});
